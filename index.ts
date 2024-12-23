import { BinanceWebSocketServer, sendTelegramAlert } from './server';

// Store previous values to detect crossings
const timeframes = ['5m', '15m', '30m', '1h', '4h', '8h', '12h', '1d'];

// Add a Map to track the last candle for each symbol+timeframe combination
const lastProcessedCandles = new Map<string, number>();

function checkThresholdCrossing(symbol: string, timeframe: string, value: number, openPrice: number) {
    const key = `${symbol}-${timeframe}-${openPrice}`;

    // Check if we've already processed this candle
    if (lastProcessedCandles.get(key)) {
        return;
    }

    if (value > 5) {
        sendTelegramAlert(
            `🟢 ${symbol} crossed above 5% on ${timeframe} timeframe (${value.toFixed(2)}%)`
        );
        lastProcessedCandles.set(key, value);
    }
    if (value < -5) {
        sendTelegramAlert(
            `🔴 ${symbol} crossed below -5% on ${timeframe} timeframe (${value.toFixed(2)}%)`
        );
        lastProcessedCandles.set(key, value);
    }
}

// Initialize the server when the app starts
const server = new BinanceWebSocketServer({
    timeframes,
    onThresholdCrossing: checkThresholdCrossing
});
