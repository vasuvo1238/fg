import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Target,
  BarChart3,
  RefreshCw,
  Calendar,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TechnicalAnalysis() {
  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState("6mo");
  const [loading, setLoading] = useState(false);
  const [taData, setTaData] = useState(null);
  const [vixData, setVixData] = useState(null);
  const [earningsData, setEarningsData] = useState(null);
  const [marketData, setMarketData] = useState(null);

  useEffect(() => {
    loadVixData();
    loadMarketOverview();
  }, []);

  const analyzeTechnicals = async () => {
    if (!symbol) {
      toast.error("Please enter a symbol");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/technical-analysis/${symbol}?period=${period}`);
      setTaData(response.data);
      
      // Also fetch earnings
      try {
        const earningsResponse = await axios.get(`${API}/earnings/${symbol}`);
        setEarningsData(earningsResponse.data);
      } catch (e) {
        setEarningsData(null);
      }
      
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze symbol");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadVixData = async () => {
    try {
      const response = await axios.get(`${API}/market/vix`);
      setVixData(response.data);
    } catch (error) {
      console.error("Failed to load VIX", error);
    }
  };

  const loadMarketOverview = async () => {
    try {
      const response = await axios.get(`${API}/market/overview`);
      setMarketData(response.data);
    } catch (error) {
      console.error("Failed to load market data", error);
    }
  };

  const formatCurrency = (value) => {
    return `$${value?.toFixed(2) || 0}`;
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value?.toFixed(2)}%`;
  };

  const getSignalColor = (signal) => {
    if (signal === "BUY") return "text-green-600 bg-green-100";
    if (signal === "SELL") return "text-red-600 bg-red-100";
    return "text-gray-600 bg-gray-100";
  };

  const getVixColor = (vix) => {
    if (vix < 12) return "text-green-600";
    if (vix < 20) return "text-blue-600";
    if (vix < 30) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="technical-analysis p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          📊 Technical Analysis Pro
        </h2>
        <p className="text-sm text-muted-foreground">
          150+ TA-Lib indicators, VIX tracking, earnings calendar, and market overview
        </p>
      </div>

      {/* Market Overview & VIX */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VIX Widget */}
        {vixData && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                VIX - Market Fear Gauge
              </h3>
              <Button size="sm" variant="ghost" onClick={loadVixData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center mb-4">
              <p className={`text-5xl font-bold ${getVixColor(vixData.current_vix)}`}>
                {vixData.current_vix?.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatPercent(vixData.change_percent)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground">Sentiment</p>
                <p className="font-bold">{vixData.sentiment}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-bold mb-1">{vixData.interpretation}</p>
                <p className="text-xs">{vixData.recommendation}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Market Overview */}
        {marketData && marketData.indices && (
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Market Overview
            </h3>
            <div className="space-y-2">
              {Object.entries(marketData.indices).map(([symbol, data]) => (
                <div key={symbol} className="flex items-center justify-between p-2 bg-secondary rounded">
                  <span className="font-bold text-sm">{data.name}</span>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(data.price)}</p>
                    <p className={`text-xs ${data.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(data.change_percent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Analysis Input */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
          Analyze Stock
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Symbol</Label>
            <Input
              placeholder="e.g., AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && analyzeTechnicals()}
            />
          </div>
          <div>
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1mo">1 Month</SelectItem>
                <SelectItem value="3mo">3 Months</SelectItem>
                <SelectItem value="6mo">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="2y">2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={analyzeTechnicals} disabled={loading} className="w-full">
              <Zap className="w-4 h-4 mr-2" />
              Analyze
            </Button>
          </div>
        </div>
      </Card>

      {taData && (
        <div className="space-y-6">
          {/* Overall Signal */}
          <Card className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Overall Signal</p>
              <p className={`text-4xl font-bold ${
                taData.overall_signal === 'BULLISH' ? 'text-green-600' :
                taData.overall_signal === 'BEARISH' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {taData.overall_signal}
              </p>
              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {taData.signal_summary.buy_signals}
                  </p>
                  <p className="text-xs text-muted-foreground">BUY Signals</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {taData.signal_summary.sell_signals}
                  </p>
                  <p className="text-xs text-muted-foreground">SELL Signals</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Trading Signals */}
          {taData.signals && taData.signals.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Trading Signals
              </h3>
              <div className="space-y-2">
                {taData.signals.map((signal, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSignalColor(signal.signal)}`}>
                        {signal.signal}
                      </span>
                      <span className="font-bold">{signal.indicator}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{signal.strength}</p>
                      <p className="text-xs text-muted-foreground">{signal.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Indicators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Momentum Indicators */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Momentum Indicators
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">RSI (14)</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${
                      taData.momentum_indicators.rsi < 30 ? 'text-green-600' :
                      taData.momentum_indicators.rsi > 70 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {taData.momentum_indicators.rsi?.toFixed(2)}
                    </span>
                    {taData.momentum_indicators.rsi < 30 && <TrendingUp className="w-4 h-4 text-green-600" />}
                    {taData.momentum_indicators.rsi > 70 && <TrendingDown className="w-4 h-4 text-red-600" />}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Stochastic %K</span>
                  <span className="font-bold">{taData.momentum_indicators.stochastic_k?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Stochastic %D</span>
                  <span className="font-bold">{taData.momentum_indicators.stochastic_d?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">CCI (14)</span>
                  <span className="font-bold">{taData.momentum_indicators.cci?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Williams %R</span>
                  <span className="font-bold">{taData.momentum_indicators.williams_r?.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Trend Indicators */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Trend Indicators
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Current Price</span>
                  <span className="font-bold">{formatCurrency(taData.current_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">SMA (20)</span>
                  <span className="font-bold">{formatCurrency(taData.trend_indicators.sma_20)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">SMA (50)</span>
                  <span className="font-bold">{formatCurrency(taData.trend_indicators.sma_50)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">SMA (200)</span>
                  <span className="font-bold">{formatCurrency(taData.trend_indicators.sma_200)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">MACD</span>
                  <span className={`font-bold ${taData.trend_indicators.macd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {taData.trend_indicators.macd?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">ADX (Trend Strength)</span>
                  <span className="font-bold">{taData.trend_indicators.adx?.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Volatility Indicators */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Volatility Indicators
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Bollinger Upper</span>
                  <span className="font-bold">{formatCurrency(taData.volatility_indicators.bb_upper)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Bollinger Middle</span>
                  <span className="font-bold">{formatCurrency(taData.volatility_indicators.bb_middle)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Bollinger Lower</span>
                  <span className="font-bold">{formatCurrency(taData.volatility_indicators.bb_lower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">ATR (Volatility)</span>
                  <span className="font-bold">{taData.volatility_indicators.atr?.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Volume Indicators */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                Volume Indicators
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">OBV</span>
                  <span className="font-bold">{taData.volume_indicators.obv?.toExponential(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">A/D Line</span>
                  <span className="font-bold">{taData.volume_indicators.ad?.toExponential(2)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Earnings Calendar */}
          {earningsData && !earningsData.error && (
            <Card className="p-6 bg-purple-50">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                  Upcoming Earnings
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Next Earnings Date</p>
                  <p className="text-lg font-bold text-purple-600">
                    {earningsData.next_earnings_date || 'TBD'}
                  </p>
                </div>
                {earningsData.eps_estimate && (
                  <div>
                    <p className="text-xs text-muted-foreground">EPS Estimate</p>
                    <p className="text-lg font-bold">{formatCurrency(earningsData.eps_estimate)}</p>
                  </div>
                )}
                {earningsData.revenue_estimate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue Estimate</p>
                    <p className="text-lg font-bold">${(earningsData.revenue_estimate / 1e9).toFixed(2)}B</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
