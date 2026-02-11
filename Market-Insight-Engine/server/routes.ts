import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { analyzeCandles, fetchYahooData, isCrypto } from "./analysis";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/analyze/:symbol", async (req, res) => {
    const { symbol } = req.params;
    if (!symbol || symbol.length < 1 || symbol.length > 20) {
      return res.status(400).json({ error: "Invalid symbol" });
    }

    const symbolUpper = symbol.toUpperCase();
    const crypto = isCrypto(symbolUpper);

    if (crypto) {
      try {
        const candles = await fetchYahooData(symbolUpper);
        const analysis = analyzeCandles(candles);
        analysis.symbol = symbolUpper;
        return res.json({ ...analysis, source: "Yahoo Finance", type: "crypto" });
      } catch (error: any) {
        console.error("Crypto analysis error:", error.message);
        return res.status(404).json({
          error: `Crypto symbol not found: ${symbolUpper}. Use the format BTC-USD, ETH-USD, SOL-USD.`,
        });
      }
    }

    try {
      const candles = await fetchYahooData(symbolUpper);
      const analysis = analyzeCandles(candles);
      analysis.symbol = symbolUpper;
      return res.json({ ...analysis, source: "Yahoo Finance", type: "stock" });
    } catch (error: any) {
      console.error("Stock analysis error:", error.message);
      return res.status(404).json({
        error: `Stock symbol not found: ${symbolUpper}. Check the ticker and try again (e.g. AAPL, MSFT, TSLA).`,
      });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
