import { BinanceWebSocketServer, sendTelegramAlert } from "./server";

// Store previous values to detect crossings
const timeframes = ["5m", "15m", "30m", "1h", "4h", "8h", "12h", "1d"];

// Initialize the server when the app starts
const server = new BinanceWebSocketServer({
  timeframes,
});
