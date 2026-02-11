interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema.push(sum / Math.min(period, data.length));
  for (let i = period; i < data.length; i++) {
    ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
  }
  return ema;
}

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  if (ema12.length === 0 || ema26.length === 0) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  const macdLine: number[] = [];
  const offset = ema12.length - ema26.length;
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[i + offset] - ema26[i]);
  }
  const signalLine = calculateEMA(macdLine, 9);
  const macdVal = macdLine[macdLine.length - 1] || 0;
  const signalVal = signalLine[signalLine.length - 1] || 0;
  return {
    macd: Math.round(macdVal * 10000) / 10000,
    signal: Math.round(signalVal * 10000) / 10000,
    histogram: Math.round((macdVal - signalVal) * 10000) / 10000,
  };
}

function findSupportResistance(candles: OHLCV[]): { support: number[]; resistance: number[] } {
  if (candles.length < 5) return { support: [], resistance: [] };
  const pivots: { price: number; type: "support" | "resistance" }[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const low = candles[i].low;
    if (low < candles[i - 1].low && low < candles[i - 2].low && low < candles[i + 1].low && low < candles[i + 2].low) {
      pivots.push({ price: low, type: "support" });
    }
    const high = candles[i].high;
    if (high > candles[i - 1].high && high > candles[i - 2].high && high > candles[i + 1].high && high > candles[i + 2].high) {
      pivots.push({ price: high, type: "resistance" });
    }
  }

  const cluster = (prices: number[], threshold: number): number[] => {
    if (prices.length === 0) return [];
    prices.sort((a, b) => a - b);
    const clusters: number[][] = [[prices[0]]];
    for (let i = 1; i < prices.length; i++) {
      const last = clusters[clusters.length - 1];
      const avg = last.reduce((a, b) => a + b, 0) / last.length;
      if (Math.abs(prices[i] - avg) / avg < threshold) {
        last.push(prices[i]);
      } else {
        clusters.push([prices[i]]);
      }
    }
    return clusters
      .sort((a, b) => b.length - a.length)
      .slice(0, 3)
      .map((c) => Math.round((c.reduce((a, b) => a + b, 0) / c.length) * 100) / 100);
  };

  const supportPrices = pivots.filter((p) => p.type === "support").map((p) => p.price);
  const resistancePrices = pivots.filter((p) => p.type === "resistance").map((p) => p.price);
  const currentPrice = candles[candles.length - 1].close;
  const thresholdPct = 0.02;

  return {
    support: cluster(supportPrices, thresholdPct).filter((s) => s < currentPrice).slice(0, 3),
    resistance: cluster(resistancePrices, thresholdPct).filter((r) => r > currentPrice).slice(0, 3),
  };
}

function detectTrend(closes: number[], ema20: number[], ema50: number[], ema200: number[]): { direction: string; strength: string } {
  const current = closes[closes.length - 1];
  const e20 = ema20[ema20.length - 1] || current;
  const e50 = ema50[ema50.length - 1] || current;
  const e200 = ema200[ema200.length - 1] || current;

  let bullishSignals = 0;
  let bearishSignals = 0;

  if (current > e20) bullishSignals++;
  else bearishSignals++;
  if (current > e50) bullishSignals++;
  else bearishSignals++;
  if (current > e200) bullishSignals++;
  else bearishSignals++;
  if (e20 > e50) bullishSignals++;
  else bearishSignals++;
  if (e50 > e200) bullishSignals++;
  else bearishSignals++;

  let direction: string;
  let strength: string;

  if (bullishSignals >= 4) {
    direction = "BULLISH";
    strength = bullishSignals === 5 ? "Strong" : "Moderate";
  } else if (bearishSignals >= 4) {
    direction = "BEARISH";
    strength = bearishSignals === 5 ? "Strong" : "Moderate";
  } else {
    direction = "NEUTRAL";
    strength = "Weak";
  }

  return { direction, strength };
}

export function analyzeCandles(candles: OHLCV[]) {
  if (!candles || candles.length < 30) {
    throw new Error("Insufficient data for analysis (need at least 30 candles)");
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const previousPrice = closes[closes.length - 2];
  const priceChange = currentPrice - previousPrice;
  const priceChangePct = (priceChange / previousPrice) * 100;

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const { support, resistance } = findSupportResistance(candles);
  const trend = detectTrend(closes, ema20, ema50, ema200);

  let rsiSignal: string;
  if (rsi > 70) rsiSignal = "Overbought";
  else if (rsi < 30) rsiSignal = "Oversold";
  else if (rsi > 60) rsiSignal = "Bullish";
  else if (rsi < 40) rsiSignal = "Bearish";
  else rsiSignal = "Neutral";

  let macdSignal: string;
  if (macd.histogram > 0 && macd.macd > 0) macdSignal = "Strong Buy";
  else if (macd.histogram > 0) macdSignal = "Buy";
  else if (macd.histogram < 0 && macd.macd < 0) macdSignal = "Strong Sell";
  else if (macd.histogram < 0) macdSignal = "Sell";
  else macdSignal = "Neutral";

  return {
    symbol: "",
    currentPrice: Math.round(currentPrice * 100) / 100,
    priceChange: Math.round(priceChange * 100) / 100,
    priceChangePct: Math.round(priceChangePct * 100) / 100,
    trend,
    ema: {
      ema20: Math.round((ema20[ema20.length - 1] || 0) * 100) / 100,
      ema50: Math.round((ema50[ema50.length - 1] || 0) * 100) / 100,
      ema200: Math.round((ema200[ema200.length - 1] || 0) * 100) / 100,
    },
    rsi: {
      value: Math.round(rsi * 100) / 100,
      signal: rsiSignal,
    },
    macd: {
      ...macd,
      signal_interpretation: macdSignal,
    },
    support,
    resistance,
    dataPoints: candles.length,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchYahooData(symbol: string): Promise<OHLCV[]> {
  const { default: YahooFinance } = await import("yahoo-finance2");
  const yf = new (YahooFinance as any)();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  const result = await yf.chart(symbol, {
    period1: startDate,
    period2: endDate,
    interval: "1d",
  });
  if (!result || !result.quotes || result.quotes.length === 0) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }
  return result.quotes
    .filter((q: any) => q.open != null && q.high != null && q.low != null && q.close != null)
    .map((q: any) => ({
      date: new Date(q.date).toISOString().split("T")[0],
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume || 0,
    }));
}

export async function fetchBinanceData(symbol: string): Promise<OHLCV[]> {
  const clean = symbol.toUpperCase().replace("-", "").replace("/", "");
  const pair = clean.includes("USDT") ? clean : clean.replace("USD", "") + "USDT";
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=180`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Binance API error for ${pair}: ${response.status} ${body}`);
  }
  const data: any[] = await response.json();
  if (!data || data.length === 0) {
    throw new Error(`No Binance data found for pair: ${pair}`);
  }
  return data.map((k: any) => ({
    date: new Date(k[0]).toISOString().split("T")[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

export function isCrypto(symbol: string): boolean {
  return symbol.includes("-");
}
