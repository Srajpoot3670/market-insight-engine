import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";

export default function DashboardScreen() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(
        `/api/analyze/${encodeURIComponent(symbol.trim().toUpperCase())}`,
      );

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const json = await response.json();
      setData(json);
    } catch (e: any) {
      setError("Server not responding. Make sure RUN is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>TradeScope</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter Symbol (AAPL, BTC-USD)"
          placeholderTextColor="#888"
          value={symbol}
          onChangeText={setSymbol}
          autoCapitalize="characters"
        />

        <Pressable style={styles.button} onPress={handleAnalyze}>
          <Text style={styles.buttonText}>Go</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator size="large" color="#00ff99" />}

      {error && <Text style={styles.error}>{error}</Text>}

      {data && (
        <View style={styles.card}>
          <Text style={styles.symbol}>{data.symbol}</Text>
          <Text style={styles.price}>Price: ${data.currentPrice}</Text>
          <Text>
            Trend: {data.trend?.direction} ({data.trend?.strength})
          </Text>
          <Text>RSI: {data.rsi?.value}</Text>
          <Text>MACD: {data.macd?.signal_interpretation}</Text>
          <Text>Source: {data.source}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    paddingTop: 80,
    backgroundColor: "#0A0E1A",
    minHeight: "100%",
  },
  title: {
    fontSize: 28,
    color: "#00ff99",
    marginBottom: 20,
    fontWeight: "bold",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1f2e",
    color: "white",
    padding: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#00ff99",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 8,
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
  },
  error: {
    color: "red",
    marginTop: 10,
  },
  card: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#111827",
    borderRadius: 12,
  },
  symbol: {
    fontSize: 22,
    color: "#00ff99",
    marginBottom: 10,
    fontWeight: "bold",
  },
  price: {
    fontSize: 18,
    color: "white",
    marginBottom: 10,
  },
});
