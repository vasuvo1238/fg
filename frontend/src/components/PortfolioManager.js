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
  TrendingUp,
  PieChart,
  DollarSign,
  Calculator,
  AlertCircle,
  Target,
  Zap,
  Plus,
  Trash2,
  Shield,
  Award,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function PortfolioManager() {
  const [activeTab, setActiveTab] = useState("optimizer"); // optimizer, kelly, margin
  const [loading, setLoading] = useState(false);

  // Portfolio Optimizer state
  const [symbols, setSymbols] = useState([]);
  const [symbolInput, setSymbolInput] = useState("");
  const [period, setPeriod] = useState("1y");
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [efficientFrontier, setEfficientFrontier] = useState(null);

  // Kelly Criterion state
  const [kellyBalance, setKellyBalance] = useState("");
  const [winProb, setWinProb] = useState("");
  const [avgWin, setAvgWin] = useState("");
  const [avgLoss, setAvgLoss] = useState("");
  const [kellyFraction, setKellyFraction] = useState("0.5");
  const [kellyResult, setKellyResult] = useState(null);

  // Margin Calculator state
  const [marginBalance, setMarginBalance] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [maintenanceMargin, setMaintenanceMargin] = useState("25");
  const [initialMargin, setInitialMargin] = useState("50");
  const [marginResult, setMarginResult] = useState(null);
  
  // Save/Load Portfolio state
  const [portfolioName, setPortfolioName] = useState("");
  const [savedPortfolios, setSavedPortfolios] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  const addSymbol = () => {
    if (symbolInput && !symbols.includes(symbolInput.toUpperCase())) {
      setSymbols([...symbols, symbolInput.toUpperCase()]);
      setSymbolInput("");
    }
  };

  const removeSymbol = (index) => {
    setSymbols(symbols.filter((_, i) => i !== index));
  };

  const optimizePortfolio = async () => {
    if (symbols.length < 2) {
      toast.error("Please add at least 2 symbols");
      return;
    }

    setLoading(true);
    try {
      // Get optimal portfolio
      const optResponse = await axios.post(`${API}/portfolio/optimize`, symbols, {
        params: { period }
      });
      setOptimizationResult(optResponse.data);

      // Get efficient frontier
      const efResponse = await axios.post(`${API}/portfolio/efficient-frontier`, symbols, {
        params: { period, num_portfolios: 100 }
      });
      setEfficientFrontier(efResponse.data);

      toast.success("Portfolio optimized successfully!");
    } catch (error) {
      toast.error("Failed to optimize portfolio");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKelly = async () => {
    if (!kellyBalance || !winProb || !avgWin || !avgLoss) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/portfolio/kelly-criterion`, {
        account_balance: parseFloat(kellyBalance),
        win_probability: parseFloat(winProb) / 100,
        avg_win: parseFloat(avgWin),
        avg_loss: parseFloat(avgLoss),
        fraction: parseFloat(kellyFraction)
      });
      setKellyResult(response.data);
      toast.success("Kelly calculation complete!");
    } catch (error) {
      toast.error("Failed to calculate Kelly");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMargin = async () => {
    if (!marginBalance || !positionSize) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/portfolio/margin-calculator`, {
        account_balance: parseFloat(marginBalance),
        position_size: parseFloat(positionSize),
        maintenance_margin: parseFloat(maintenanceMargin) / 100,
        initial_margin: parseFloat(initialMargin) / 100
      });
      setMarginResult(response.data);

      // Also calculate optimal leverage
      if (optimizationResult) {
        const levResponse = await axios.post(`${API}/portfolio/optimal-leverage`, {
          account_balance: parseFloat(marginBalance),
          expected_return: optimizationResult.expected_return,
          volatility: optimizationResult.volatility
        });
        setMarginResult({ ...response.data, optimal_leverage_data: levResponse.data });
      }

      toast.success("Margin calculation complete!");
    } catch (error) {
      toast.error("Failed to calculate margin");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  const savePortfolio = async () => {
    if (!portfolioName.trim()) {
      toast.error("Please enter a portfolio name");
      return;
    }
    
    if (!optimizationResult || symbols.length === 0) {
      toast.error("Please optimize a portfolio first");
      return;
    }

    try {
      const portfolioData = {
        name: portfolioName,
        symbols: symbols,
        weights: optimizationResult.optimal_weights,
        expected_return: optimizationResult.expected_return,
        volatility: optimizationResult.volatility,
        sharpe_ratio: optimizationResult.sharpe_ratio,
        period: period
      };

      await axios.post(`${API}/portfolios/save`, portfolioData);
      toast.success(`Portfolio "${portfolioName}" saved successfully!`);
      setShowSaveDialog(false);
      setPortfolioName("");
      await loadSavedPortfolios();
    } catch (error) {
      toast.error("Failed to save portfolio");
      console.error(error);
    }
  };

  const loadSavedPortfolios = async () => {
    try {
      const response = await axios.get(`${API}/portfolios/list`);
      setSavedPortfolios(response.data.portfolios || []);
    } catch (error) {
      console.error("Failed to load portfolios", error);
    }
  };

  const loadPortfolio = async (portfolio) => {
    try {
      setSymbols(portfolio.symbols);
      setPeriod(portfolio.period || "1y");
      toast.success(`Loaded portfolio "${portfolio.name}"`);
      setShowLoadDialog(false);
      
      // Trigger optimization with loaded data
      await optimizePortfolio();
    } catch (error) {
      toast.error("Failed to load portfolio");
      console.error(error);
    }
  };

  const deletePortfolio = async (portfolioId) => {
    try {
      await axios.delete(`${API}/portfolios/${portfolioId}`);
      toast.success("Portfolio deleted");
      await loadSavedPortfolios();
    } catch (error) {
      toast.error("Failed to delete portfolio");
      console.error(error);
    }
  };

  const formatCurrency = (value) => {
    return `$${Math.abs(value).toFixed(2)}`;
  };

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="portfolio-manager p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          📊 Portfolio Manager Pro
        </h2>
        <p className="text-sm text-muted-foreground">
          Portfolio optimization, Kelly Criterion bet sizing, and margin/leverage calculator
        </p>
      </div>

      {/* Disclaimer */}
      <Card className="p-4 bg-purple-50 border-purple-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-bold mb-1">⚠️ Paper Trading Mode - Educational Purpose Only</p>
            <p className="text-xs">
              This is a simulation tool for educational purposes. All calculations are theoretical. 
              Real trading involves additional risks and costs. <strong>This is not financial advice. 
              Consult a licensed financial advisor before making any investment decisions.</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "optimizer" ? "default" : "ghost"}
          onClick={() => setActiveTab("optimizer")}
          className="rounded-b-none"
        >
          <PieChart className="w-4 h-4 mr-2" />
          Portfolio Optimizer
        </Button>
        <Button
          variant={activeTab === "kelly" ? "default" : "ghost"}
          onClick={() => setActiveTab("kelly")}
          className="rounded-b-none"
        >
          <Target className="w-4 h-4 mr-2" />
          Kelly Criterion
        </Button>
        <Button
          variant={activeTab === "margin" ? "default" : "ghost"}
          onClick={() => setActiveTab("margin")}
          className="rounded-b-none"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Margin/Leverage
        </Button>
      </div>

      {/* Portfolio Optimizer Tab */}
      {activeTab === "optimizer" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Modern Portfolio Theory Optimizer
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Find the optimal portfolio allocation using Markowitz efficient frontier analysis
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter stock symbol (e.g., AAPL)"
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                />
                <Button onClick={addSymbol}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {symbols.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {symbols.map((symbol, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
                      <span className="font-bold">{symbol}</span>
                      <button onClick={() => removeSymbol(i)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Historical Period</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3mo">3 Months</SelectItem>
                      <SelectItem value="6mo">6 Months</SelectItem>
                      <SelectItem value="1y">1 Year</SelectItem>
                      <SelectItem value="2y">2 Years</SelectItem>
                      <SelectItem value="5y">5 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={optimizePortfolio}
                  disabled={loading || symbols.length < 2}
                  className="flex-1"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize Portfolio
                </Button>
              </div>
            </div>
          </Card>

          {optimizationResult && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Expected Return</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPercent(optimizationResult.expected_return * 100)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Annualized</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">Volatility</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatPercent(optimizationResult.volatility * 100)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Risk (Std Dev)</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Sharpe Ratio</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {optimizationResult.sharpe_ratio.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Risk-adjusted return</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Status</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {optimizationResult.success ? "✓" : "✗"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Optimization success</p>
                </Card>
              </div>

              {/* Optimal Weights */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Optimal Portfolio Allocation
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {Object.entries(optimizationResult.optimal_weights).map(([symbol, weight], i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold">{symbol}</span>
                          <span>{formatPercent(weight * 100)}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${weight * 100}%`,
                              backgroundColor: COLORS[i % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={Object.entries(optimizationResult.optimal_weights).map(([symbol, weight], i) => ({
                          name: symbol,
                          value: weight * 100
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.keys(optimizationResult.optimal_weights).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Efficient Frontier */}
              {efficientFrontier && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                    Efficient Frontier
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="volatility"
                        name="Risk (Volatility)"
                        tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                        label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        dataKey="return"
                        name="Return"
                        tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                        label={{ value: 'Expected Return', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value, name) => [`${(value * 100).toFixed(2)}%`, name === 'return' ? 'Return' : 'Risk']}
                        cursor={{ strokeDasharray: '3 3' }}
                      />
                      <Legend />
                      <Scatter
                        name="Random Portfolios"
                        data={efficientFrontier.portfolios}
                        fill="#94a3b8"
                        opacity={0.5}
                      />
                      <Scatter
                        name="Optimal Portfolio"
                        data={[{
                          volatility: optimizationResult.volatility,
                          return: optimizationResult.expected_return
                        }]}
                        fill="#6366f1"
                        shape="star"
                        opacity={1}
                      />
                      <Scatter
                        name="Min Variance"
                        data={[{
                          volatility: efficientFrontier.min_variance_portfolio.volatility,
                          return: efficientFrontier.min_variance_portfolio.return
                        }]}
                        fill="#10b981"
                        shape="diamond"
                        opacity={1}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    ⭐ Optimal (Max Sharpe) | 💎 Minimum Variance | ⚪ Random Portfolios
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Kelly Criterion Tab */}
      {activeTab === "kelly" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Kelly Criterion Position Sizing
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Calculate optimal bet size using Kelly Criterion formula: Kelly% = W - [(1 - W) / R]
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Account Balance ($)</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={kellyBalance}
                  onChange={(e) => setKellyBalance(e.target.value)}
                />
              </div>
              <div>
                <Label>Win Probability (%)</Label>
                <Input
                  type="number"
                  placeholder="55"
                  min="0"
                  max="100"
                  value={winProb}
                  onChange={(e) => setWinProb(e.target.value)}
                />
              </div>
              <div>
                <Label>Average Win ($)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={avgWin}
                  onChange={(e) => setAvgWin(e.target.value)}
                />
              </div>
              <div>
                <Label>Average Loss ($)</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={avgLoss}
                  onChange={(e) => setAvgLoss(e.target.value)}
                />
              </div>
              <div>
                <Label>Kelly Fraction (Safety Factor)</Label>
                <Select value={kellyFraction} onValueChange={setKellyFraction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.25">Quarter Kelly (0.25) - Very Conservative</SelectItem>
                    <SelectItem value="0.5">Half Kelly (0.5) - Recommended</SelectItem>
                    <SelectItem value="0.75">Three-Quarter Kelly (0.75)</SelectItem>
                    <SelectItem value="1.0">Full Kelly (1.0) - Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={calculateKelly}
                  disabled={loading || !kellyBalance || !winProb || !avgWin || !avgLoss}
                  className="w-full"
                >
                  Calculate Kelly
                </Button>
              </div>
            </div>
          </Card>

          {kellyResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Full Kelly %</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatPercent(kellyResult.full_kelly_percent)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Fractional Kelly %</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPercent(kellyResult.fractional_kelly_percent)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Position Size</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(kellyResult.fractional_kelly_position_size)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Win/Loss Ratio</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {kellyResult.win_loss_ratio.toFixed(2)}
                  </p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Recommendation
                </h3>
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="font-bold text-green-800 mb-2">
                      ✓ Recommended Position Size: {formatCurrency(kellyResult.fractional_kelly_position_size)}
                    </p>
                    <p className="text-sm text-green-700">
                      This is {formatPercent(kellyResult.fractional_kelly_percent)} of your account balance, 
                      calculated using fractional Kelly for safer risk management.
                    </p>
                  </div>
                  
                  {kellyResult.warning && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="font-bold text-red-800 mb-2">⚠️ Warning</p>
                      <p className="text-sm text-red-700">{kellyResult.warning}</p>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-bold text-blue-800 mb-2">Understanding Kelly Criterion</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Kelly Criterion maximizes long-term growth while managing risk</li>
                      <li>• Fractional Kelly ({kellyFraction}x) reduces volatility and drawdowns</li>
                      <li>• Higher win probability and win/loss ratio = larger optimal position</li>
                      <li>• Never bet more than Kelly suggests - it leads to ruin</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Margin/Leverage Tab */}
      {activeTab === "margin" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Margin & Leverage Calculator
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Calculate margin requirements, leverage ratios, and margin call thresholds
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Account Balance ($)</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={marginBalance}
                  onChange={(e) => setMarginBalance(e.target.value)}
                />
              </div>
              <div>
                <Label>Desired Position Size ($)</Label>
                <Input
                  type="number"
                  placeholder="15000"
                  value={positionSize}
                  onChange={(e) => setPositionSize(e.target.value)}
                />
              </div>
              <div>
                <Label>Maintenance Margin (%)</Label>
                <Input
                  type="number"
                  placeholder="25"
                  value={maintenanceMargin}
                  onChange={(e) => setMaintenanceMargin(e.target.value)}
                />
              </div>
              <div>
                <Label>Initial Margin (%)</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={initialMargin}
                  onChange={(e) => setInitialMargin(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={calculateMargin}
                  disabled={loading || !marginBalance || !positionSize}
                  className="w-full"
                >
                  Calculate Margin & Leverage
                </Button>
              </div>
            </div>
          </Card>

          {marginResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Current Leverage</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    marginResult.current_leverage > 3 ? 'text-red-600' : 
                    marginResult.current_leverage > 2 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {marginResult.current_leverage.toFixed(2)}x
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Buying Power</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(marginResult.buying_power)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">Required Margin</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(marginResult.required_initial_margin)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Risk Level</span>
                  </div>
                  <p className={`text-2xl font-bold uppercase ${
                    marginResult.risk_level === 'high' ? 'text-red-600' :
                    marginResult.risk_level === 'medium' ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {marginResult.risk_level}
                  </p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Margin Analysis
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-secondary rounded-lg">
                      <span className="text-sm">Account Balance</span>
                      <span className="font-bold">{formatCurrency(marginResult.account_balance)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-secondary rounded-lg">
                      <span className="text-sm">Position Size</span>
                      <span className="font-bold">{formatCurrency(marginResult.position_size)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-secondary rounded-lg">
                      <span className="text-sm">Max Leverage</span>
                      <span className="font-bold">{marginResult.max_leverage.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between p-3 bg-secondary rounded-lg">
                      <span className="text-sm">Safe Position Size</span>
                      <span className="font-bold text-green-600">{formatCurrency(marginResult.safe_position_size)}</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    marginResult.is_safe ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <h4 className={`font-bold mb-2 ${
                      marginResult.is_safe ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {marginResult.is_safe ? '✓ Position is Safe' : '⚠️ High Risk Position'}
                    </h4>
                    <p className={`text-sm mb-3 ${
                      marginResult.is_safe ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {marginResult.is_safe
                        ? 'Your position size is within safe leverage limits.'
                        : 'Your position size exceeds recommended safe leverage. Consider reducing position or adding more capital.'}
                    </p>
                    <div className="text-xs space-y-1">
                      <p>• Margin Call Threshold: {formatCurrency(marginResult.margin_call_threshold)}</p>
                      <p>• Maintenance Margin: {formatCurrency(marginResult.required_maintenance_margin)}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {marginResult.optimal_leverage_data && (
                <Card className="p-6 bg-purple-50">
                  <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                    Optimal Leverage Recommendation
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Optimal Leverage</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {marginResult.optimal_leverage_data.optimal_leverage.toFixed(2)}x
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Optimal Position</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(marginResult.optimal_leverage_data.optimal_position_size)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Expected Return</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatPercent(marginResult.optimal_leverage_data.expected_leveraged_return * 100)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Risk Profile</p>
                      <p className="text-lg font-bold uppercase">
                        {marginResult.optimal_leverage_data.recommendation}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
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
