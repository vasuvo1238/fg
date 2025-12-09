import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, TrendingUp, TrendingDown, IndianRupee, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { API } from "@/lib/api";

export default function IndianMarkets() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [quoteData, setQuoteData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [popularStocks, setPopularStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  // Fetch popular stocks on mount
  useEffect(() => {
    fetchPopularStocks();
  }, []);

  // Fetch quote on symbol change
  useEffect(() => {
    if (symbol) {
      fetchQuote();
      fetchHistoricalData();
    }
  }, [symbol]);

  const fetchPopularStocks = async () => {
    try {
      const response = await axios.get(`${API}/upstox/popular-stocks`);
      setPopularStocks(response.data.stocks || []);
    } catch (error) {
      console.error("Failed to fetch popular stocks", error);
    }
  };

  const fetchQuote = async () => {
    if (!symbol.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/upstox/quote/${symbol.toUpperCase()}`);
      setQuoteData(response.data);
      toast.success(`Loaded ${symbol.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to fetch quote");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    if (!symbol.trim()) return;
    
    setChartLoading(true);
    try {
      const toDate = new Date().toISOString().split('T')[0];
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(
        `${API}/api/upstox/historical/${symbol.toUpperCase()}`,
        {
          params: {
            interval: "1day",
            from_date: fromDate,
            to_date: toDate
          }
        }
      );
      
      const candles = response.data.candles || [];
      const chartData = candles.map(candle => ({
        date: new Date(candle.timestamp).toLocaleDateString(),
        price: candle.close,
        volume: candle.volume
      }));
      
      setHistoricalData(chartData);
    } catch (error) {
      console.error("Failed to fetch historical data", error);
    } finally {
      setChartLoading(false);
    }
  };

  const handleStockClick = (stockSymbol) => {
    setSymbol(stockSymbol);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuote();
    fetchHistoricalData();
  };

  const formatPrice = (price) => {
    return price ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
  };

  const calculateChange = () => {
    if (!quoteData || !quoteData.open || !quoteData.last_price) return { change: 0, changePercent: 0 };
    const change = quoteData.last_price - quoteData.open;
    const changePercent = (change / quoteData.open) * 100;
    return { change, changePercent };
  };

  const { change, changePercent } = calculateChange();
  const isPositive = change >= 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
          🇮🇳 Indian Stock Markets (NSE/BSE)
        </h1>
        <p className="text-muted-foreground">
          Real-time data for Indian stocks powered by Upstox API
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-orange-50 to-green-50 border-2 border-orange-200">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Enter stock symbol (e.g., RELIANCE, TCS, INFY)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="text-lg"
            />
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>
        </form>
      </Card>

      {/* Popular Stocks */}
      {popularStocks.length > 0 && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
            🔥 Popular Indian Stocks
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {popularStocks.map((stock) => (
              <Button
                key={stock.symbol}
                variant={symbol === stock.symbol ? "default" : "outline"}
                onClick={() => handleStockClick(stock.symbol)}
                className="h-auto py-3 px-4 flex flex-col items-start gap-1"
              >
                <span className="font-bold text-sm">{stock.symbol}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{stock.name}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Quote Card */}
      {quoteData && (
        <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                {quoteData.symbol}
              </h2>
              <p className="text-sm text-muted-foreground">{quoteData.exchange}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {formatPrice(quoteData.last_price)}
              </div>
              <div className={`text-lg font-bold flex items-center gap-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Open</p>
              <p className="text-xl font-bold">{formatPrice(quoteData.open)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">High</p>
              <p className="text-xl font-bold text-green-600">{formatPrice(quoteData.high)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Low</p>
              <p className="text-xl font-bold text-red-600">{formatPrice(quoteData.low)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Prev Close</p>
              <p className="text-xl font-bold">{formatPrice(quoteData.close)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Volume</p>
              <p className="text-xl font-bold">{quoteData.volume?.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {quoteData.note && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> {quoteData.note}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Historical Chart */}
      {historicalData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
            📊 30-Day Price Chart
          </h3>
          
          {chartLoading ? (
            <div className="h-96 flex items-center justify-center">
              <Activity className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={['dataMin - 50', 'dataMax + 50']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={false}
                  name={`${symbol} Price`}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

      {/* Info Banner */}
      <Card className="p-6 mt-6 bg-orange-50 border-2 border-orange-200">
        <div className="flex items-center gap-3">
          <IndianRupee className="w-8 h-8 text-orange-600" />
          <div>
            <h3 className="font-bold text-lg">About Indian Markets Integration</h3>
            <p className="text-sm text-muted-foreground">
              This feature provides read-only access to Indian stock market data (NSE/BSE) powered by Upstox API. 
              For real-time trading and portfolio management, connect your Upstox account.
            </p>
          </div>
        </div>
      </Card>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Disclaimer:</strong> This is for educational and informational purposes only. 
          The data shown may be delayed or simulated. This is not investment advice. 
          Please consult with a qualified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
}
