import type { Handle } from '@sveltejs/kit';
import { BinanceWebSocketServer, sendTelegramAlert } from './server';

// Store previous values to detect crossings
const previousValues = new Map();
const timeframes = ['5m', '15m', '30m', '1h'];

console.log("SERVER HOOKS INITIALIZED");
function checkThresholdCrossing(symbol: string, timeframe: string, value: number) {
    const key = `${symbol}-${timeframe}`;
    const previousValue = previousValues.get(key) || 0;
    previousValues.set(key, value);

    if (Math.abs(previousValue) <= 5 && value > 5) {
        sendTelegramAlert(
            `🟢 ${symbol} crossed above 5% on ${timeframe} timeframe (${value.toFixed(2)}%)`
        );
    }
    if (Math.abs(previousValue) <= 5 && value < -5) {
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

export const handle: Handle = async ({ event, resolve }) => {
    // Just pass through all requests
    return await resolve(event);
}; 