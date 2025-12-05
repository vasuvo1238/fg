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
  TrendingDown,
  Activity,
  AlertTriangle,
  Save,
  FolderOpen,
  Download,
  BarChart3,
  TrendingUp,
  Shield,
  Target,
  Zap,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
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

export default function RiskAnalysis() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("risk"); // risk, monte-carlo, rebalance
  
  // Risk Analysis state
  const [portfolioValue, setPortfolioValue] = useState("100000");
  const [positions, setPositions] = useState([{ symbol: "AAPL", weight: 0.5 }, { symbol: "MSFT", weight: 0.5 }]);
  const [riskResult, setRiskResult] = useState(null);
  
  // Monte Carlo state
  const [mcInitialValue, setMcInitialValue] = useState("100000");
  const [mcReturn, setMcReturn] = useState("0.12");
  const [mcVolatility, setMcVolatility] = useState("0.20");
  const [mcDays, setMcDays] = useState("252");
  const [mcSimulations, setMcSimulations] = useState("1000");
  const [mcResult, setMcResult] = useState(null);
  
  // Rebalancing state
  const [savedPortfolios, setSavedPortfolios] = useState([]);
  const [currentPortfolioName, setCurrentPortfolioName] = useState("");
  const [rebalanceResult, setRebalanceResult] = useState(null);

  useEffect(() => {
    loadSavedPortfolios();
  }, []);

  const loadSavedPortfolios = async () => {
    try {
      const response = await axios.get(`${API}/portfolios/list`);
      setSavedPortfolios(response.data.portfolios || []);
    } catch (error) {
      console.error("Failed to load portfolios", error);
    }
  };

  const addPosition = () => {
    setPositions([...positions, { symbol: "", weight: 0 }]);
  };

  const removePosition = (index) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  const updatePosition = (index, field, value) => {
    const newPositions = [...positions];
    newPositions[index][field] = field === 'weight' ? parseFloat(value) || 0 : value.toUpperCase();
    setPositions(newPositions);
  };

  const normalizeWeights = () => {
    const total = positions.reduce((sum, p) => sum + (p.weight || 0), 0);
    if (total > 0) {
      const normalized = positions.map(p => ({
        ...p,
        weight: (p.weight || 0) / total
      }));
      setPositions(normalized);
      toast.success("Weights normalized to 100%");
    }
  };

  const analyzeRisk = async () => {
    const symbols = positions.map(p => p.symbol).filter(s => s);
    const weights = positions.map(p => p.weight);
    
    if (symbols.length === 0) {
      toast.error("Please add at least one position");
      return;
    }

    const total = weights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(total - 1) > 0.01) {
      toast.error("Weights must sum to 100%. Click 'Normalize' to fix.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/portfolio/risk-analysis`, {
        symbols,
        weights,
        portfolio_value: parseFloat(portfolioValue),
        period: "1y",
        confidence_level: 0.95
      });
      setRiskResult(response.data);
      toast.success("Risk analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze risk");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const runMonteCarlo = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/portfolio/monte-carlo`, {
        initial_value: parseFloat(mcInitialValue),
        expected_return: parseFloat(mcReturn),
        volatility: parseFloat(mcVolatility),
        days: parseInt(mcDays),
        simulations: parseInt(mcSimulations)
      });
      setMcResult(response.data);
      toast.success("Monte Carlo simulation complete!");
    } catch (error) {
      toast.error("Failed to run simulation");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const savePortfolio = async () => {
    if (!currentPortfolioName) {
      toast.error("Please enter a portfolio name");
      return;
    }

    try {
      const portfolioData = {
        name: currentPortfolioName,
        positions: positions,
        portfolio_value: parseFloat(portfolioValue),
        risk_analysis: riskResult
      };

      await axios.post(`${API}/portfolios/save`, portfolioData);
      toast.success("Portfolio saved successfully!");
      loadSavedPortfolios();
      setCurrentPortfolioName("");
    } catch (error) {
      toast.error("Failed to save portfolio");
      console.error(error);
    }
  };

  const loadPortfolio = async (portfolioId) => {
    try {
      const response = await axios.get(`${API}/portfolios/${portfolioId}`);
      const portfolio = response.data;
      
      setPositions(portfolio.positions);
      setPortfolioValue(portfolio.portfolio_value.toString());
      setRiskResult(portfolio.risk_analysis);
      toast.success(`Loaded: ${portfolio.name}`);
    } catch (error) {
      toast.error("Failed to load portfolio");
      console.error(error);
    }
  };

  const exportPortfolio = () => {
    const data = {
      name: currentPortfolioName || "My Portfolio",
      positions,
      portfolio_value: portfolioValue,
      risk_analysis: riskResult,
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_${Date.now()}.json`;
    a.click();
    toast.success("Portfolio exported!");
  };

  const formatCurrency = (value) => {
    return `$${Math.abs(value).toFixed(2)}`;
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="risk-analysis p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          🎯 Advanced Risk Analysis
        </h2>
        <p className="text-sm text-muted-foreground">
          VaR, CVaR, Monte Carlo simulations, and portfolio management
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "risk" ? "default" : "ghost"}
          onClick={() => setActiveTab("risk")}
          className="rounded-b-none"
        >
          <Shield className="w-4 h-4 mr-2" />
          Risk Analysis
        </Button>
        <Button
          variant={activeTab === "monte-carlo" ? "default" : "ghost"}
          onClick={() => setActiveTab("monte-carlo")}
          className="rounded-b-none"
        >
          <Activity className="w-4 h-4 mr-2" />
          Monte Carlo
        </Button>
        <Button
          variant={activeTab === "rebalance" ? "default" : "ghost"}
          onClick={() => setActiveTab("rebalance")}
          className="rounded-b-none"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Portfolio Manager
        </Button>
      </div>

      {/* Risk Analysis Tab */}
      {activeTab === "risk" && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                Portfolio Configuration
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={normalizeWeights}>
                  <Target className="w-4 h-4 mr-2" />
                  Normalize
                </Button>
                <Button size="sm" onClick={addPosition}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Add Position
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Total Portfolio Value ($)</Label>
                <Input
                  type="number"
                  value={portfolioValue}
                  onChange={(e) => setPortfolioValue(e.target.value)}
                  placeholder="100000"
                />
              </div>

              <div className="space-y-2">
                <Label>Positions</Label>
                {positions.map((position, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Symbol (e.g., AAPL)"
                      value={position.symbol}
                      onChange={(e) => updatePosition(index, 'symbol', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Weight (0-1)"
                      value={position.weight}
                      onChange={(e) => updatePosition(index, 'weight', e.target.value)}
                      step="0.01"
                      min="0"
                      max="1"
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground w-16">
                      {(position.weight * 100).toFixed(1)}%
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removePosition(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={analyzeRisk}
                disabled={loading}
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Analyze Portfolio Risk
              </Button>
            </div>
          </Card>

          {riskResult && (
            <div className="space-y-6">
              {/* Risk Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-muted-foreground">VaR (95%)</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(riskResult.var.var_dollar)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPercent(riskResult.var.var_percent)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">CVaR (95%)</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(riskResult.cvar.cvar_dollar)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPercent(riskResult.cvar.cvar_percent)}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Max Drawdown</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatPercent(riskResult.max_drawdown.max_drawdown_percent)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {riskResult.max_drawdown.drawdown_duration_days} days
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Sortino Ratio</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {riskResult.sortino_ratio.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Downside risk</p>
                </Card>
              </div>

              {/* Interpretations */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Risk Interpretation
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-bold text-red-800 mb-1">Value at Risk (VaR)</p>
                    <p className="text-xs text-red-700">{riskResult.var.interpretation}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-bold text-orange-800 mb-1">Conditional VaR (CVaR)</p>
                    <p className="text-xs text-orange-700">{riskResult.cvar.interpretation}</p>
                  </div>
                  {riskResult.beta_analysis && !riskResult.beta_analysis.error && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-bold text-blue-800 mb-1">
                        Beta Analysis: {riskResult.beta_analysis.beta.toFixed(2)} ({riskResult.beta_analysis.interpretation})
                      </p>
                      <p className="text-xs text-blue-700">
                        Correlation with market (SPY): {(riskResult.beta_analysis.correlation * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Save Portfolio */}
              <Card className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Portfolio name"
                    value={currentPortfolioName}
                    onChange={(e) => setCurrentPortfolioName(e.target.value)}
                  />
                  <Button onClick={savePortfolio}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={exportPortfolio}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Monte Carlo Tab */}
      {activeTab === "monte-carlo" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Monte Carlo Simulation Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Initial Portfolio Value ($)</Label>
                <Input
                  type="number"
                  value={mcInitialValue}
                  onChange={(e) => setMcInitialValue(e.target.value)}
                />
              </div>
              <div>
                <Label>Expected Annual Return</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={mcReturn}
                  onChange={(e) => setMcReturn(e.target.value)}
                  placeholder="0.12 (12%)"
                />
              </div>
              <div>
                <Label>Annual Volatility</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={mcVolatility}
                  onChange={(e) => setMcVolatility(e.target.value)}
                  placeholder="0.20 (20%)"
                />
              </div>
              <div>
                <Label>Days to Simulate</Label>
                <Select value={mcDays} onValueChange={setMcDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">1 Month (30 days)</SelectItem>
                    <SelectItem value="90">3 Months (90 days)</SelectItem>
                    <SelectItem value="180">6 Months (180 days)</SelectItem>
                    <SelectItem value="252">1 Year (252 days)</SelectItem>
                    <SelectItem value="504">2 Years (504 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number of Simulations</Label>
                <Select value={mcSimulations} onValueChange={setMcSimulations}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 (Fast)</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1,000 (Recommended)</SelectItem>
                    <SelectItem value="5000">5,000 (Slow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={runMonteCarlo} disabled={loading} className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Run Simulation
                </Button>
              </div>
            </div>
          </Card>

          {mcResult && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Mean Final Value</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(mcResult.statistics.mean_final_value)}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Median</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(mcResult.statistics.median_final_value)}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Best Case (95th)</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(mcResult.percentiles["95th"])}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Worst Case (5th)</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(mcResult.percentiles["5th"])}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Prob. of Loss</p>
                  <p className="text-xl font-bold text-orange-600">
                    {mcResult.risk_metrics.probability_of_loss.toFixed(1)}%
                  </p>
                </Card>
              </div>

              {/* Sample Paths Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Sample Simulation Paths (10 random scenarios)
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <ReferenceLine y={mcResult.initial_value} stroke="#000" strokeDasharray="5 5" label="Initial" />
                    {mcResult.sample_paths.map((path, i) => (
                      <Line
                        key={i}
                        data={path}
                        type="monotone"
                        dataKey="value"
                        stroke={`hsl(${i * 36}, 70%, 50%)`}
                        dot={false}
                        strokeWidth={1.5}
                        opacity={0.6}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Risk Metrics */}
              <Card className="p-6 bg-blue-50">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Simulation Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Expected Gain</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(mcResult.risk_metrics.expected_gain)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected Return %</p>
                    <p className="text-lg font-bold">
                      {formatPercent(mcResult.risk_metrics.expected_return_percent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">VaR (5%)</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(mcResult.risk_metrics.var_95)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CVaR (5%)</p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(mcResult.risk_metrics.cvar_95)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Manager Tab */}
      {activeTab === "rebalance" && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Saved Portfolios
            </h3>
            {savedPortfolios.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No saved portfolios. Create and save a portfolio in the Risk Analysis tab.
              </p>
            ) : (
              <div className="space-y-2">
                {savedPortfolios.map((portfolio, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div>
                      <p className="font-bold">{portfolio.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {portfolio.positions.length} positions • {formatCurrency(portfolio.portfolio_value)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => loadPortfolio(portfolio.id)}>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Load
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
