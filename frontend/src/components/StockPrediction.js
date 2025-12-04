import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, TrendingUp, TrendingDown, DollarSign, 
  AlertCircle, Activity, BarChart3, PieChart 
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StockPrediction({ sessionId }) {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [timeframe, setTimeframe] = useState("30d");
  const [activeTab, setActiveTab] = useState("prediction");
  const [useEnsemble, setUseEnsemble] = useState(true);

  const searchStock = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API}/stocks/${symbol.toUpperCase()}/info`);
      setStockData(response.data);
      toast.success(`Loaded ${response.data.name}`);
    } catch (error) {
      toast.error("Stock not found");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPrediction = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/stocks/${symbol.toUpperCase()}/predict`, {
        symbol: symbol.toUpperCase(),
        timeframe
      });
      setPrediction(response.data);
      setStockData(response.data.current_info);
      toast.success("Prediction generated!");
    } catch (error) {
      toast.error("Failed to generate prediction");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return price ? `$${price.toFixed(2)}` : "N/A";
  };

  const formatPercent = (percent) => {
    const formatted = percent?.toFixed(2);
    return formatted > 0 ? `+${formatted}%` : `${formatted}%`;
  };

  return (
    <div className="stock-prediction-container p-6" data-testid="stock-prediction">
      {/* Search Bar */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              data-testid="stock-search-input"
              placeholder="Enter stock symbol (e.g., AAPL, GOOGL, TSLA)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === "Enter" && searchStock()}
              className="flex-1"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>
          <Button 
            data-testid="search-button"
            onClick={searchStock} 
            disabled={loading || !symbol.trim()}
          >
            Search
          </Button>
          <Button
            data-testid="predict-button"
            onClick={getPrediction}
            disabled={loading || !symbol.trim()}
            className="bg-primary"
          >
            <Activity className="w-4 h-4 mr-2" />
            Predict
          </Button>
        </div>
        
        {/* Timeframe Selector */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Forecast:</span>
          {["7d", "30d", "90d", "180d"].map((tf) => (
            <Button
              key={tf}
              data-testid={`timeframe-${tf}`}
              variant={timeframe === tf ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </Card>

      {/* Stock Info Card */}
      {stockData && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                {stockData.name}
              </h2>
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stockData.symbol} · {stockData.sector}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {formatPrice(stockData.current_price)}
              </p>
              {stockData.previous_close && (
                <p className={`text-sm ${stockData.current_price >= stockData.previous_close ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(((stockData.current_price - stockData.previous_close) / stockData.previous_close) * 100)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                ${(stockData.market_cap / 1e9).toFixed(2)}B
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">P/E Ratio</p>
              <p className="font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stockData.pe_ratio?.toFixed(2) || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Day Range</p>
              <p className="font-semibold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {formatPrice(stockData.day_low)} - {formatPrice(stockData.day_high)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">52W Range</p>
              <p className="font-semibold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {formatPrice(stockData["52_week_low"])} - {formatPrice(stockData["52_week_high"])}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Prediction Results */}
      {prediction && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="prediction">Prediction</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="prediction" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Price Prediction ({timeframe})
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(prediction.statistical_prediction.current_price)}
                  </p>
                </div>
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Predicted Price</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(prediction.statistical_prediction.predicted_price_end)}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${prediction.statistical_prediction.trend === 'bullish' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-xs text-muted-foreground mb-1">Expected Change</p>
                  <p className="text-2xl font-bold flex items-center justify-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {prediction.statistical_prediction.trend === 'bullish' ? 
                      <TrendingUp className="w-5 h-5 text-green-600" /> : 
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    }
                    {formatPercent(prediction.statistical_prediction.price_change_percent)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Confidence</span>
                  <span className="font-semibold">{prediction.statistical_prediction.confidence.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Volatility</span>
                  <span className="font-semibold">{prediction.statistical_prediction.volatility.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Trend</span>
                  <span className={`font-semibold capitalize ${prediction.statistical_prediction.trend === 'bullish' ? 'text-green-600' : 'text-red-600'}`}>
                    {prediction.statistical_prediction.trend}
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Technical Indicators
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Moving Averages</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground">MA 20</p>
                      <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatPrice(prediction.technical_indicators.moving_averages.ma_20)}
                      </p>
                    </div>
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground">MA 50</p>
                      <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatPrice(prediction.technical_indicators.moving_averages.ma_50)}
                      </p>
                    </div>
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground">MA 200</p>
                      <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatPrice(prediction.technical_indicators.moving_averages.ma_200)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">RSI (Relative Strength Index)</p>
                  <div className="p-3 bg-secondary rounded">
                    <p className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {prediction.technical_indicators.rsi?.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {prediction.technical_indicators.rsi < 30 ? "Oversold" : 
                       prediction.technical_indicators.rsi > 70 ? "Overbought" : "Neutral"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">MACD</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground">MACD Line</p>
                      <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {prediction.technical_indicators.macd.macd?.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground">Signal Line</p>
                      <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {prediction.technical_indicators.macd.signal?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="signals" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Trading Signals
              </h3>
              
              <div className={`p-4 rounded-lg mb-6 text-center ${
                prediction.trading_signals.overall_signal === 'BUY' ? 'bg-green-100' :
                prediction.trading_signals.overall_signal === 'SELL' ? 'bg-red-100' :
                'bg-yellow-100'
              }`}>
                <p className="text-sm text-muted-foreground mb-1">Overall Signal</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {prediction.trading_signals.overall_signal}
                </p>
                <p className="text-sm mt-2">
                  {prediction.trading_signals.buy_count} Buy · {prediction.trading_signals.sell_count} Sell
                </p>
              </div>

              <div className="space-y-3">
                {prediction.trading_signals.signals.map((signal, idx) => (
                  <div key={idx} className={`p-3 rounded border-l-4 ${
                    signal.type === 'buy' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{signal.indicator}</span>
                      <span className={`text-xs font-bold ${signal.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                        {signal.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{signal.reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                AI-Powered Analysis
              </h3>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {prediction.ai_analysis}
                </p>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">
                  <strong>Disclaimer:</strong> This analysis is for educational purposes only and should not be considered financial advice. 
                  Past performance does not guarantee future results. Always consult with a licensed financial advisor before making investment decisions.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {loading && (
        <div className="flex items-center justify-center p-12" data-testid="loading-indicator">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
