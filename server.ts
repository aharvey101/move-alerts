interface WebSocketData {
    pairs: string[];
    timeframes: string[];
}

interface ServerConfig {
    timeframes: string[];
    onThresholdCrossing: (symbol: string, timeframe: string, value: number) => void;
}

export async function sendTelegramAlert(message: string) {
    try {
        console.log("SENDING TELEGRAM ALERT", message);
        const url = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}

export class BinanceWebSocketServer {
    private connections: WebSocket[] = [];
    public isInitialized: boolean = false;
    private alertCooldowns: Map<string, number> = new Map();
    private readonly COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds

    constructor(config: ServerConfig) {
        this.initializeConnections(config);
    }

    private isOnCooldown(pair: string): boolean {
        const lastAlert = this.alertCooldowns.get(pair);
        if (!lastAlert) return false;
        return Date.now() - lastAlert < this.COOLDOWN_PERIOD;
    }

    private setAlertCooldown(pair: string) {
        this.alertCooldowns.set(pair, Date.now());
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    private async initializeConnections(config: ServerConfig) {
        try {
            const usdtPairs = await this.fetchUsdtPairs();
            if (!usdtPairs.length) {
                throw new Error('No USDT pairs found');
            }

            // Close existing connections
            this.close();

            // Split pairs into chunks of 20
            const pairChunks = this.chunkArray(usdtPairs, 20);

            // Create WebSocket connections for each chunk
            pairChunks.forEach((chunk, index) => {
                this.createChunkConnection(chunk, index, config);
            });

        } catch (error) {
            console.error('Failed to initialize Binance connections:', error);
            this.isInitialized = false;
            // Retry initialization after a delay
            setTimeout(() => this.initializeConnections(config), 5000);
        }
    }

    private async fetchUsdtPairs(): Promise<string[]> {
        const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const data = await response.json();

        if (!data.symbols) {
            console.error('No symbols found in response, retrying...');
            return [];
        }

        return data.symbols
            .filter((symbol: any) => symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING')
            .map((symbol: any) => symbol.symbol) as string[];
    }

    private createChunkConnection(pairs: string[], index: number, config: ServerConfig) {
        const streams = pairs.flatMap((pair) =>
            config.timeframes.map((timeframe) => `${pair.toLowerCase()}@kline_${timeframe}`)
        );

        const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams.join('/')}`);

        ws.onopen = () => {
            console.log(`WebSocket ${index + 1} connected`);
            this.connections.push(ws);
            this.isInitialized = true;
            sendTelegramAlert(`WebSocket ${index + 1} connected`);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.data && data.data.e === 'kline') {
                    const kline = data.data.k;
                    const symbol = data.data.s;
                    const open = parseFloat(kline.o);
                    const close = parseFloat(kline.c);
                    const percentChange = ((close - open) / open) * 100;

                    if (!this.isOnCooldown(symbol)) {
                        config.onThresholdCrossing(symbol, kline.i, percentChange);
                        this.setAlertCooldown(symbol);
                    }
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log(`WebSocket ${index + 1} disconnected`);
            this.connections = this.connections.filter(conn => conn !== ws);
            if (this.connections.length === 0) {
                this.isInitialized = false;
            }
            // Reconnect this chunk after a delay
            setTimeout(() => this.createChunkConnection(pairs, index, config), 5000);
        };

        ws.onerror = (error) => {
            console.error(`WebSocket ${index + 1} error:`, error);
            ws.close();
        };
    }

    public close() {
        this.connections.forEach(ws => ws.close());
        this.connections = [];
        this.isInitialized = false;
    }
}