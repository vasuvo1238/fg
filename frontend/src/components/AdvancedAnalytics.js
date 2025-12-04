import { useState } from "react";
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
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  Link2,
  AlertCircle,
  CheckCircle,
  ArrowLeftRight,
  Target,
  Award,
  RefreshCcw,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState("performance");
  const [loading, setLoading] = useState(false);

  // Model Performance state
  const [performanceData, setPerformanceData] = useState(null);
  const [selectedModel, setSelectedModel] = useState("all");
  const [performanceSymbol, setPerformanceSymbol] = useState("");

  // Pairs Trading state
  const [pairsData, setPairsData] = useState(null);
  const [symbol1, setSymbol1] = useState("");
  const [symbol2, setSymbol2] = useState("");

  // Backtesting state
  const [backtestData, setBacktestData] = useState(null);
  const [backtestSymbol, setBacktestSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("1y");

  const fetchModelPerformance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedModel && selectedModel !== "all") {
        params.append("model_type", selectedModel);
      }
      if (performanceSymbol) {
        params.append("symbol", performanceSymbol.toUpperCase());
      }

      const response = await axios.get(`${API}/models/performance?${params.toString()}`);
      setPerformanceData(response.data);
      toast.success("Performance data loaded");
    } catch (error) {
      toast.error("Failed to load performance data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const evaluateModels = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/models/evaluate`);
      toast.success(`Evaluated ${response.data.evaluated_count} predictions`);
      // Refresh performance data
      await fetchModelPerformance();
    } catch (error) {
      toast.error("Failed to evaluate predictions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const analyzePairs = async () => {
    if (!symbol1 || !symbol2) {
      toast.error("Please enter both stock symbols");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/stocks/pairs-trading`, {
        symbols: [symbol1.toUpperCase(), symbol2.toUpperCase()]
      });
      setPairsData(response.data);
      toast.success("Pairs analysis complete");
    } catch (error) {
      toast.error("Failed to analyze pairs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const runBacktest = async () => {
    if (!backtestSymbol) {
      toast.error("Please enter a stock symbol");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/stocks/${backtestSymbol.toUpperCase()}/backtest?timeframe=${timeframe}`
      );
      setBacktestData(response.data);
      toast.success("Backtest complete");
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("No evaluated predictions found for backtesting");
      } else {
        toast.error("Failed to run backtest");
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "$0.00";
    return `$${Math.abs(Number(value)).toFixed(2)}`;
  };

  const formatPercent = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "0.00%";
    const numValue = Number(value);
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`;
  };

  return (
    <div className="advanced-analytics p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          🔬 Advanced Analytics
        </h2>
        <p className="text-sm text-muted-foreground">
          Model performance tracking, pairs trading analysis, and backtesting tools
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "performance" ? "default" : "ghost"}
          onClick={() => setActiveTab("performance")}
          className="rounded-b-none"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Model Performance
        </Button>
        <Button
          variant={activeTab === "pairs" ? "default" : "ghost"}
          onClick={() => setActiveTab("pairs")}
          className="rounded-b-none"
        >
          <Link2 className="w-4 h-4 mr-2" />
          Pairs Trading
        </Button>
        <Button
          variant={activeTab === "backtest" ? "default" : "ghost"}
          onClick={() => setActiveTab("backtest")}
          className="rounded-b-none"
        >
          <Activity className="w-4 h-4 mr-2" />
          Backtesting
        </Button>
      </div>

      {/* Model Performance Tab */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Track Model Accuracy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Model Type</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Models" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    <SelectItem value="ensemble">Ensemble</SelectItem>
                    <SelectItem value="lstm">LSTM</SelectItem>
                    <SelectItem value="linear">Linear Regression</SelectItem>
                    <SelectItem value="zscore">Z-Score</SelectItem>
                    <SelectItem value="ou">Ornstein-Uhlenbeck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Symbol (Optional)</Label>
                <Input
                  placeholder="e.g., AAPL"
                  value={performanceSymbol}
                  onChange={(e) => setPerformanceSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchModelPerformance} disabled={loading} className="flex-1">
                  Load Performance
                </Button>
                <Button 
                  onClick={evaluateModels} 
                  disabled={loading}
                  variant="outline"
                  title="Evaluate pending predictions"
                >
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {performanceData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total Predictions</span>
                  </div>
                  <p className="text-2xl font-bold">{performanceData.total_predictions}</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Avg Accuracy</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {performanceData.avg_accuracy ? performanceData.avg_accuracy.toFixed(1) : "0.0"}%
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Direction Accuracy</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {performanceData.direction_accuracy.toFixed(1)}%
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">Mean Error</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {performanceData.metrics.mean_absolute_error.toFixed(2)}%
                  </p>
                </Card>
              </div>

              {/* Error Metrics */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Error Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground">Median Error</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {performanceData.metrics.median_absolute_error.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground">Std Deviation</p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {performanceData.metrics.std_error.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground">Best Accuracy</p>
                    <p className="text-xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {performanceData.metrics.best_accuracy.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground">Worst Accuracy</p>
                    <p className="text-xl font-bold text-red-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {performanceData.metrics.worst_accuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>

              {/* Recent Predictions */}
              {performanceData.recent_predictions && performanceData.recent_predictions.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                    Recent Predictions
                  </h3>
                  <div className="space-y-2">
                    {performanceData.recent_predictions.map((pred, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="font-bold">{pred.symbol}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(pred.prediction_date).toLocaleDateString()}
                          </span>
                          {pred.direction_correct ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            Accuracy: {pred.accuracy.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Predicted: {formatPercent(pred.predicted_change_percent)} | 
                            Actual: {formatPercent(pred.actual_change_percent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {!performanceData && !loading && (
            <Card className="p-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Click "Load Performance" to view model accuracy statistics
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Pairs Trading Tab */}
      {activeTab === "pairs" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Analyze Pairs Trading Opportunities
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Find cointegrated stock pairs for mean reversion trading strategies
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>First Symbol</Label>
                <Input
                  placeholder="e.g., AAPL"
                  value={symbol1}
                  onChange={(e) => setSymbol1(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label>Second Symbol</Label>
                <Input
                  placeholder="e.g., MSFT"
                  value={symbol2}
                  onChange={(e) => setSymbol2(e.target.value.toUpperCase())}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={analyzePairs} 
                  disabled={loading || !symbol1 || !symbol2}
                  className="w-full"
                >
                  Analyze Pair
                </Button>
              </div>
            </div>
          </Card>

          {pairsData && (
            <div className="space-y-6">
              {/* Trading Signal */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                    Trading Signal
                  </h3>
                  {pairsData.is_cointegrated ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                      COINTEGRATED
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                      NOT COINTEGRATED
                    </span>
                  )}
                </div>

                <div className={`p-4 rounded-lg ${
                  pairsData.signal === "NO TRADE" ? 'bg-gray-100' : 'bg-blue-50'
                }`}>
                  <p className="text-2xl font-bold mb-2">{pairsData.signal}</p>
                  <p className="text-sm">{pairsData.reason}</p>
                </div>
              </Card>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeftRight className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Correlation</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {pairsData.correlation.toFixed(3)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Hedge Ratio</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {pairsData.hedge_ratio.toFixed(3)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Spread Z-Score</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    Math.abs(pairsData.spread_z_score) > 2 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {pairsData.spread_z_score.toFixed(2)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Cointegration P-value</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    pairsData.cointegration_p_value < 0.05 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {pairsData.cointegration_p_value.toFixed(4)}
                  </p>
                </Card>
              </div>

              {/* Explanation */}
              <Card className="p-6 bg-blue-50">
                <h3 className="text-sm font-bold mb-2">Understanding the Metrics</h3>
                <div className="text-xs space-y-1">
                  <p><strong>Correlation:</strong> Measures how closely the two stocks move together (closer to 1.0 is better)</p>
                  <p><strong>Hedge Ratio:</strong> Number of shares of stock 2 needed to hedge 1 share of stock 1</p>
                  <p><strong>Z-Score:</strong> How far the spread has deviated from its mean (|Z| &gt; 2 suggests a trading opportunity)</p>
                  <p><strong>P-value:</strong> Statistical test for cointegration (below 0.05 means the pair is cointegrated)</p>
                </div>
              </Card>
            </div>
          )}

          {!pairsData && !loading && (
            <Card className="p-12 text-center">
              <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Enter two stock symbols to analyze their pairs trading potential
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Backtesting Tab */}
      {activeTab === "backtest" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Backtest Trading Strategy
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Test how well the model predictions would have performed as a trading strategy
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Stock Symbol</Label>
                <Input
                  placeholder="e.g., AAPL"
                  value={backtestSymbol}
                  onChange={(e) => setBacktestSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label>Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3mo">3 Months</SelectItem>
                    <SelectItem value="6mo">6 Months</SelectItem>
                    <SelectItem value="1y">1 Year</SelectItem>
                    <SelectItem value="2y">2 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={runBacktest} 
                  disabled={loading || !backtestSymbol}
                  className="w-full"
                >
                  Run Backtest
                </Button>
              </div>
            </div>
          </Card>

          {backtestData && (
            <div className="space-y-6">
              {/* Performance Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Initial Capital</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(backtestData.initial_capital)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Final Value</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(backtestData.final_value)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Strategy Return</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    backtestData.total_return_percent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercent(backtestData.total_return_percent)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">vs Buy & Hold</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    backtestData.outperformance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercent(backtestData.outperformance)}
                  </p>
                </Card>
              </div>

              {/* Comparison Card */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Strategy vs Buy & Hold
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: 'Strategy',
                        return: backtestData.total_return_percent
                      },
                      {
                        name: 'Buy & Hold',
                        return: backtestData.buy_hold_return_percent
                      }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => `${val}%`} />
                    <Tooltip formatter={(val) => `${val.toFixed(2)}%`} />
                    <ReferenceLine y={0} stroke="#000" />
                    <Bar dataKey="return" radius={[8, 8, 0, 0]}>
                      {[0, 1].map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#6366f1' : '#10b981'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Trading Activity */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Trading Activity ({backtestData.total_trades} trades)
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {backtestData.trades.map((trade, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          trade.action === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.action}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(trade.date).toLocaleDateString()}
                        </span>
                        <span className="font-bold">{formatCurrency(trade.price)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{trade.shares.toFixed(2)} shares</p>
                        <p className="text-xs text-muted-foreground">
                          Predicted: {formatPercent(trade.predicted_change)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {!backtestData && !loading && (
            <Card className="p-12 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Enter a stock symbol to backtest the trading strategy
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Requires evaluated predictions for the selected symbol
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
