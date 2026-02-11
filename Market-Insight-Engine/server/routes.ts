import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

export async function registerRoutes(app: Express): Promise<Server> {

  // Test route
  app.get("/", (_req: Request, res: Response) => {
    res.send("🚀 Market Insight Engine is running!");
  });

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Dummy analyze route (safe version)
  app.get("/api/analyze/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;

      if (!symbol || symbol.length < 1 || symbol.length > 20) {
        return res.status(400).json({ error: "Invalid symbol" });
      }

      const symbolUpper = symbol.toUpperCase();

      // Dummy response (for now)
      return res.json({
        symbol: symbolUpper,
        trend: "Bullish",
        signal: "Buy",
        confidence: "78%",
        source: "Demo Data",
      });

    } catch (error: any) {
      console.error("Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
