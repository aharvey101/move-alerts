import { BinanceWebSocketServer, sendTelegramAlert } from './server';

// Store previous values to detect crossings
const timeframes = ['5m', '15m', '30m', '1h', '4h', '8h', '12h', '1d'];

function checkThresholdCrossing(symbol: string, timeframe: string, value: number) {
    if (value > 5) {
        sendTelegramAlert(
            `🟢 ${symbol} crossed above 5% on ${timeframe} timeframe (${value.toFixed(2)}%)`
        );
    }
    if (value < -5) {
        sendTelegramAlert(
            `🔴 ${symbol} crossed below -5% on ${timeframe} timeframe (${value.toFixed(2)}%)`
        );
    }
}

// Initialize the server when the app starts
const server = new BinanceWebSocketServer({
    timeframes,
    onThresholdCrossing: checkThresholdCrossing
});
