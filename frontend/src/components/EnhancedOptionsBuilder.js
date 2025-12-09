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
  Plus, Trash2, TrendingUp, TrendingDown, Calendar,
  DollarSign, Target, Shield, Table, BarChart3, Info, AlertCircle, RefreshCcw
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
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Strategy template cards with mini payoff curves
const STRATEGY_CARDS = [
  {
    id: "bull_call_spread",
    name: "Bull Call Spread",
    view: "Bullish",
    risk: "Limited",
    reward: "Limited",
    description: "Profit from moderate price increase",
    icon: "📈",
    color: "from-green-500 to-emerald-600"
  },
  {
    id: "bear_put_spread",
    name: "Bear Put Spread",
    view: "Bearish",
    risk: "Limited",
    reward: "Limited",
    description: "Profit from moderate price decrease",
    icon: "📉",
    color: "from-red-500 to-rose-600"
  },
  {
    id: "long_straddle",
    name: "Long Straddle",
    view: "Volatile",
    risk: "Limited",
    reward: "Unlimited",
    description: "Profit from big move in either direction",
    icon: "⚡",
    color: "from-purple-500 to-violet-600"
  },
  {
    id: "iron_condor",
    name: "Iron Condor",
    view: "Neutral",
    risk: "Limited",
    reward: "Limited",
    description: "Profit from range-bound price action",
    icon: "🦅",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "long_strangle",
    name: "Long Strangle",
    view: "Volatile",
    risk: "Limited",
    reward: "Unlimited",
    description: "Lower cost alternative to straddle",
    icon: "💫",
    color: "from-orange-500 to-amber-600"
  },
  {
    id: "butterfly_spread",
    name: "Butterfly Spread",
    view: "Neutral",
    risk: "Limited",
    reward: "Limited",
    description: "Maximum profit at middle strike",
    icon: "🦋",
    color: "from-teal-500 to-cyan-600"
  }
];

export default function EnhancedOptionsBuilder() {
  const [symbol, setSymbol] = useState("");
  const [spotPrice, setSpotPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [activeView, setActiveView] = useState("payoff"); // payoff, table, greeks, chart
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState("");
  
  // Date and expiry
  const [expiryDate, setExpiryDate] = useState("");
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  
  // Custom strategy state
  const [customMode, setCustomMode] = useState(false);
  const [strategyName, setStrategyName] = useState("My Strategy");
  const [legs, setLegs] = useState([]);

  // Target day analysis
  const [targetDays, setTargetDays] = useState(null);
  
  // Options chain state
  const [optionsChainData, setOptionsChainData] = useState(null);
  const [availableExpiries, setAvailableExpiries] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [loadingOptionsChain, setLoadingOptionsChain] = useState(false);
  const [showOptionsChain, setShowOptionsChain] = useState(false);

  useEffect(() => {
    // Set default expiry date (30 days from now)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setExpiryDate(defaultDate.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    // Calculate days to expiry when date changes
    if (expiryDate) {
      const today = new Date();
      const expiry = new Date(expiryDate);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysToExpiry(Math.max(1, diffDays));
    }
  }, [expiryDate]);

  const fetchLivePrice = async (symbolToFetch) => {
    if (!symbolToFetch || symbolToFetch.length < 1) return;
    
    setFetchingPrice(true);
    try {
      const response = await axios.get(`${API}/stocks/${symbolToFetch.toUpperCase()}/info`);
      const price = response.data.current_price;
      setSpotPrice(price.toFixed(2));
      setLastFetchedSymbol(symbolToFetch.toUpperCase());
      toast.success(`✓ Live price: $${price.toFixed(2)}`);
    } catch (error) {
      toast.error("Failed to fetch price. Please enter manually.");
      console.error(error);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSymbolChange = (value) => {
    setSymbol(value.toUpperCase());
  };

  const handleSymbolBlur = () => {
    // Auto-fetch price and expiries when user leaves symbol field
    if (symbol && symbol !== lastFetchedSymbol) {
      fetchLivePrice(symbol);
      fetchOptionsExpiries(symbol);
    }
  };

  const buildStrategy = async (templateId) => {
    if (!spotPrice) {
      toast.error("Please enter spot price");
      return;
    }

    setLoading(true);
    setSelectedStrategy(templateId);
    
    try {
      const response = await axios.post(`${API}/options/strategy/template`, {
        template_name: templateId,
        underlying_symbol: symbol || "STOCK",
        spot_price: parseFloat(spotPrice),
        days_to_expiry: daysToExpiry,
        volatility: 0.25
      });
      
      setStrategyResult(response.data);
      
      // Calculate target day P&L
      calculateTargetDays(response.data);
      
      toast.success("Strategy built successfully!");
    } catch (error) {
      toast.error("Failed to build strategy");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const buildCustomStrategy = async () => {
    if (legs.length === 0 || !spotPrice) {
      toast.error("Please add at least one leg and enter spot price");
      return;
    }

    setLoading(true);
    setCustomMode(true);
    
    try {
      const response = await axios.post(`${API}/options/strategy/custom`, {
        strategy_name: strategyName,
        underlying_symbol: symbol || "STOCK",
        spot_price: parseFloat(spotPrice),
        legs: legs,
        volatility: 0.25,
        risk_free_rate: 0.05
      });
      
      setStrategyResult(response.data);
      calculateTargetDays(response.data);
      toast.success("Custom strategy built!");
    } catch (error) {
      toast.error("Failed to build custom strategy");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTargetDays = (strategy) => {
    // Calculate P&L at different days: today, 7 days, 15 days, 30 days, expiry
    const daysArray = [0, 7, 15, Math.floor(daysToExpiry / 2), daysToExpiry];
    const targetData = daysArray.map(day => {
      // Simple approximation - in production, you'd recalculate with time decay
      const timeRatio = (daysToExpiry - day) / daysToExpiry;
      return {
        days: day,
        label: day === 0 ? "Today" : day === daysToExpiry ? "Expiry" : `${day}d`,
        // Simplified calculation - actual would need proper Greeks-based calculation
        pnl: strategy.net_premium + (day === daysToExpiry ? 0 : strategy.greeks.theta * day)
      };
    });
    
    setTargetDays(targetData);
  };

  const addLeg = () => {
    setLegs([...legs, {
      option_type: "call",
      action: "buy",
      strike: parseFloat(spotPrice) || 100,
      quantity: 1,
      days_to_expiry: daysToExpiry
    }]);
  };

  const removeLeg = (index) => {
    setLegs(legs.filter((_, i) => i !== index));
  };

  const updateLeg = (index, field, value) => {
    const newLegs = [...legs];
    newLegs[index][field] = value;
    setLegs(newLegs);
  };


  const fetchOptionsExpiries = async (symbolToFetch) => {
    if (!symbolToFetch) return;
    
    try {
      const response = await axios.get(`${API}/options-chain/${symbolToFetch.toUpperCase()}/expiries`);
      setAvailableExpiries(response.data.expiries || []);
      if (response.data.expiries && response.data.expiries.length > 0) {
        setSelectedExpiry(response.data.expiries[0]);
      }
    } catch (error) {
      console.error("Failed to fetch expiries", error);
      toast.error("Failed to fetch expiration dates");
    }
  };

  const fetchOptionsChain = async () => {
    if (!symbol || !selectedExpiry) {
      toast.error("Please enter a symbol and select expiry date");
      return;
    }

    setLoadingOptionsChain(true);
    try {
      const response = await axios.get(`${API}/options-chain/${symbol.toUpperCase()}/atm?expiry=${selectedExpiry}&num_strikes=10`);
      setOptionsChainData(response.data);
      setShowOptionsChain(true);
      toast.success("Options chain loaded!");
    } catch (error) {
      toast.error("Failed to fetch options chain");
      console.error(error);
    } finally {
      setLoadingOptionsChain(false);
    }
  };


  const formatCurrency = (value) => {
    if (typeof value === 'string') return value;
    return `$${Math.abs(value).toFixed(2)}`;
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Generate P&L table data
  const generatePLTable = () => {
    if (!strategyResult) return [];
    
    const spot = strategyResult.spot_price;
    const range = spot * 0.3; // ±30% range
    const step = range / 10;
    
    const tableData = [];
    for (let price = spot - range; price <= spot + range; price += step) {
      const idx = strategyResult.payoff_diagram.prices.findIndex(p => Math.abs(p - price) < step / 2);
      const pnl = idx >= 0 ? strategyResult.payoff_diagram.payoffs[idx] : 0;
      const changePercent = ((price - spot) / spot) * 100;
      
      tableData.push({
        price: price,
        change: changePercent,
        pnl: pnl,
        isCurrentPrice: Math.abs(price - spot) < step / 2
      });
    }
    
    return tableData;
  };

  return (
    <div className="enhanced-options-builder p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          📊 Options Strategy Builder Pro
        </h2>
        <p className="text-sm text-muted-foreground">
          Professional options analysis with advanced P&L visualization and Greeks
        </p>
      </div>

      {/* Input Section */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Stock Symbol *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., AAPL"
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                onBlur={handleSymbolBlur}
              />
              <Button 
                size="icon"
                variant="outline"
                onClick={() => fetchLivePrice(symbol)}
                disabled={!symbol || fetchingPrice}
                title="Fetch live price"
              >
                <RefreshCcw className={`w-4 h-4 ${fetchingPrice ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div>
            <Label>Spot Price *</Label>
            <Input
              type="number"
              placeholder="Auto-filled"
              value={spotPrice}
              onChange={(e) => setSpotPrice(e.target.value)}
              disabled={fetchingPrice}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Expiry Date
            </Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Days to Expiry</Label>
            <Input
              type="number"
              value={daysToExpiry}
              disabled
              className="bg-secondary"
            />
          </div>
        </div>
        {lastFetchedSymbol && (
          <p className="text-xs text-muted-foreground mt-2">
            ✓ Live price fetched for {lastFetchedSymbol}
          </p>
        )}
        
        {/* Options Chain Viewer Button */}
        {availableExpiries.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs">View Real-Time Options Chain</Label>
                <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExpiries.slice(0, 10).map((expiry) => (
                      <SelectItem key={expiry} value={expiry}>{expiry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={fetchOptionsChain}
                disabled={loadingOptionsChain || !selectedExpiry}
                className="mt-5"
                variant="outline"
              >
                <Table className="w-4 h-4 mr-2" />
                {showOptionsChain ? 'Refresh' : 'View'} Options Chain
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Strategy Selection - Visual Cards */}
      {!customMode && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
              Select Strategy
            </h3>
            <Button variant="outline" onClick={() => setCustomMode(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Custom Strategy
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STRATEGY_CARDS.map((strategy) => (
              <Card
                key={strategy.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedStrategy === strategy.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => buildStrategy(strategy.id)}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${strategy.color} flex items-center justify-center text-2xl mb-3`}>
                  {strategy.icon}
                </div>
                <h4 className="font-bold mb-1">{strategy.name}</h4>
                <p className="text-xs text-muted-foreground mb-3">{strategy.description}</p>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-secondary rounded">{strategy.view}</span>
                  <span className="px-2 py-1 bg-secondary rounded">Risk: {strategy.risk}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Strategy Builder */}
      {customMode && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
              Build Custom Strategy
            </h3>
            <Button variant="ghost" onClick={() => setCustomMode(false)}>
              Back to Templates
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Strategy Name</Label>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder="My Custom Strategy"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Option Legs</Label>
                <Button size="sm" onClick={addLeg}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Leg
                </Button>
              </div>

              {legs.map((leg, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 grid grid-cols-5 gap-2">
                      <Select 
                        value={leg.option_type}
                        onValueChange={(value) => updateLeg(index, 'option_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="put">Put</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select 
                        value={leg.action}
                        onValueChange={(value) => updateLeg(index, 'action', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Buy</SelectItem>
                          <SelectItem value="sell">Sell</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        placeholder="Strike"
                        value={leg.strike}
                        onChange={(e) => updateLeg(index, 'strike', parseFloat(e.target.value))}
                      />

                      <Input
                        type="number"
                        placeholder="Qty"
                        value={leg.quantity}
                        onChange={(e) => updateLeg(index, 'quantity', parseInt(e.target.value))}
                      />

                      <Input
                        type="number"
                        placeholder="DTE"
                        value={leg.days_to_expiry}
                        disabled
                        className="bg-secondary"
                      />
                    </div>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeLeg(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Button
              onClick={buildCustomStrategy}
              disabled={loading || !spotPrice || legs.length === 0}
              className="w-full"
            >
              Build Custom Strategy
            </Button>
          </div>
        </Card>
      )}

      {/* Strategy Results */}
      {strategyResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Net Premium</span>
              </div>
              <p className={`text-2xl font-bold ${strategyResult.net_premium >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {strategyResult.net_premium >= 0 ? 'Credit' : 'Debit'} {formatCurrency(strategyResult.net_premium)}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Max Profit</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(strategyResult.max_profit)}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Max Loss</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(strategyResult.max_loss)}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Breakeven</span>
              </div>
              <p className="text-lg font-bold">
                {strategyResult.breakeven_points.length > 0 ? 
                  formatCurrency(strategyResult.breakeven_points[0]) : 
                  'N/A'}
              </p>
            </Card>
          </div>

          {/* View Tabs */}
          <Card className="p-6">
            <div className="mb-4">
              <div className="flex gap-2 border-b">
                <Button
                  variant={activeView === "payoff" ? "default" : "ghost"}
                  onClick={() => setActiveView("payoff")}
                  className="rounded-b-none"
                >
                  Payoff Graph
                </Button>
                <Button
                  variant={activeView === "table" ? "default" : "ghost"}
                  onClick={() => setActiveView("table")}
                  className="rounded-b-none"
                >
                  P&L Table
                </Button>
                <Button
                  variant={activeView === "greeks" ? "default" : "ghost"}
                  onClick={() => setActiveView("greeks")}
                  className="rounded-b-none"
                >
                  Greeks
                </Button>
                <Button
                  variant={activeView === "chart" ? "default" : "ghost"}
                  onClick={() => setActiveView("chart")}
                  className="rounded-b-none"
                >
                  Strategy Chart
                </Button>
              </div>
            </div>
            
            <div className="w-full">

              {/* Payoff Graph View */}
              {activeView === "payoff" && (
                <div className="mt-6">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart 
                    data={strategyResult.payoff_diagram.prices.map((price, i) => ({
                      price: price,
                      payoff: strategyResult.payoff_diagram.payoffs[i]
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="price"
                      tickFormatter={(val) => `$${val.toFixed(0)}`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tickFormatter={(val) => `$${val.toFixed(0)}`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
                      labelFormatter={(label) => `Price: $${label.toFixed(2)}`}
                    />
                    <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
                    <ReferenceLine 
                      x={strategyResult.spot_price} 
                      stroke="#3b82f6" 
                      strokeDasharray="5 5"
                      label={{ value: 'Current', position: 'top', fontSize: 10 }}
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="payoff" 
                      stroke="none"
                      fill="#10b981"
                      fillOpacity={0.2}
                      isAnimationActive={false}
                    />
                    
                    <Line 
                      type="monotone" 
                      dataKey="payoff" 
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              )}

              {/* P&L Table View */}
              {activeView === "table" && (
                <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="p-3 text-left">Spot Price</th>
                        <th className="p-3 text-right">Change %</th>
                        <th className="p-3 text-right">P&L</th>
                        <th className="p-3 text-right">P&L %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatePLTable().map((row, i) => (
                        <tr 
                          key={i} 
                          className={`border-b ${row.isCurrentPrice ? 'bg-blue-50 font-bold' : ''}`}
                        >
                          <td className="p-3">
                            {formatCurrency(row.price)}
                            {row.isCurrentPrice && <span className="ml-2 text-xs text-blue-600">(Current)</span>}
                          </td>
                          <td className={`p-3 text-right ${row.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(row.change)}
                          </td>
                          <td className={`p-3 text-right font-bold ${row.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(row.pnl)}
                          </td>
                          <td className={`p-3 text-right ${row.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent((row.pnl / Math.abs(strategyResult.net_premium || 100)) * 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}

              {/* Greeks View */}
              {activeView === "greeks" && (
                <div className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {Object.entries(strategyResult.greeks).map(([greek, value]) => (
                    <div key={greek} className="p-4 bg-secondary rounded-lg">
                      <p className="text-xs text-muted-foreground capitalize mb-1">{greek}</p>
                      <p className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {value.toFixed(4)}
                      </p>
                    </div>
                  ))}
                </div>
                
                <Card className="p-4 bg-blue-50">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Greeks Explained
                  </h4>
                  <div className="text-xs space-y-1">
                    <p><strong>Delta:</strong> Expected price change for $1 move in underlying</p>
                    <p><strong>Gamma:</strong> Rate of change of Delta</p>
                    <p><strong>Theta:</strong> Daily time decay (negative = losing value)</p>
                    <p><strong>Vega:</strong> Sensitivity to 1% change in implied volatility</p>
                    <p><strong>Rho:</strong> Sensitivity to 1% change in interest rates</p>
                  </div>
                </Card>

                {/* Individual Leg Greeks */}
                <div className="mt-6">
                  <h4 className="font-bold mb-3">Strike-wise Breakdown</h4>
                  <div className="space-y-2">
                    {strategyResult.legs.map((leg, i) => (
                      <Card key={i} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              leg.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {leg.action.toUpperCase()}
                            </span>
                            <span className="font-bold">{leg.quantity}x {leg.type.toUpperCase()}</span>
                            <span className="text-muted-foreground">Strike: ${leg.strike}</span>
                          </div>
                          <span className="font-bold">${leg.premium.toFixed(2)}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                </div>
              )}

              {/* Strategy Chart View - P&L over time */}
              {activeView === "chart" && (
                <div className="mt-6">
                <h4 className="font-bold mb-4">Target Day P&L Analysis</h4>
                {targetDays && (
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={targetDays}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={(val) => `$${val.toFixed(0)}`} />
                      <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']} />
                      <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
                      <Line 
                        type="monotone" 
                        dataKey="pnl" 
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
                <Card className="p-4 bg-yellow-50 mt-4">
                  <p className="text-sm">
                    <strong>Note:</strong> This is a simplified analysis showing time decay impact. 
                    Actual P&L will vary based on price movement, volatility changes, and other factors.
                  </p>
                </Card>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Real-Time Options Chain */}
      {showOptionsChain && optionsChainData && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                📈 Real-Time Options Chain
              </h3>
              <p className="text-xs text-muted-foreground">
                Live Bid/Ask/LTP prices for {optionsChainData.symbol} - Expiry: {optionsChainData.expiry_date}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Spot Price</p>
              <p className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                ${(optionsChainData.underlying_price || optionsChainData.current_price)?.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Calls and Puts Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Calls */}
            <div>
              <h4 className="font-bold mb-3 text-green-700 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                CALL Options
              </h4>
              <div className="space-y-2">
                {optionsChainData.calls && optionsChainData.calls.length > 0 ? (
                  optionsChainData.calls.map((call, i) => (
                    <Card key={i} className={`p-3 ${call.in_the_money || call.inTheMoney ? 'bg-green-50 border-green-300' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-bold text-lg" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            ${call.strike}
                          </span>
                          {(call.in_the_money || call.inTheMoney) && <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded">ITM</span>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">${(call.last_price || call.lastPrice)?.toFixed(2) || 'N/A'}</p>
                          <p className={`text-xs ${(call.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(call.change || 0) >= 0 ? '+' : ''}{(call.change || 0)?.toFixed(2)} ({(call.percent_change || call.percentChange || 0)?.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Bid</p>
                          <p className="font-bold">${call.bid?.toFixed(2) || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ask</p>
                          <p className="font-bold">${call.ask?.toFixed(2) || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vol</p>
                          <p className="font-bold">{call.volume || 0}</p>
                        </div>
                      </div>
                      {(call.implied_volatility || call.impliedVolatility) && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">IV: </span>
                          <span className="font-bold">{((call.implied_volatility || call.impliedVolatility) * 100).toFixed(1)}%</span>
                          <span className="text-muted-foreground ml-3">OI: </span>
                          <span className="font-bold">{call.open_interest || call.openInterest || 0}</span>
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No call options data available</p>
                )}
              </div>
            </div>

            {/* Puts */}
            <div>
              <h4 className="font-bold mb-3 text-red-700 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                PUT Options
              </h4>
              <div className="space-y-2">
                {optionsChainData.puts && optionsChainData.puts.length > 0 ? (
                  optionsChainData.puts.map((put, i) => (
                    <Card key={i} className={`p-3 ${put.inTheMoney ? 'bg-red-50 border-red-300' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-bold text-lg" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            ${put.strike}
                          </span>
                          {put.inTheMoney && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded">ITM</span>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">${put.lastPrice?.toFixed(2) || 'N/A'}</p>
                          <p className={`text-xs ${put.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {put.change >= 0 ? '+' : ''}{put.change?.toFixed(2)} ({put.percentChange?.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Bid</p>
                          <p className="font-bold">${put.bid?.toFixed(2) || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ask</p>
                          <p className="font-bold">${put.ask?.toFixed(2) || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vol</p>
                          <p className="font-bold">{put.volume || 0}</p>
                        </div>
                      </div>
                      {put.impliedVolatility && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">IV: </span>
                          <span className="font-bold">{(put.impliedVolatility * 100).toFixed(1)}%</span>
                          <span className="text-muted-foreground ml-3">OI: </span>
                          <span className="font-bold">{put.openInterest || 0}</span>
                        </div>
                      )}
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No put options data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 p-3 bg-white rounded-lg text-xs">
            <p className="font-bold mb-2">Legend:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <p><strong>Bid:</strong> Highest buy price</p>
              <p><strong>Ask:</strong> Lowest sell price</p>
              <p><strong>LTP:</strong> Last traded price</p>
              <p><strong>Vol:</strong> Volume traded today</p>
              <p><strong>IV:</strong> Implied Volatility</p>
              <p><strong>OI:</strong> Open Interest</p>
              <p><strong>ITM:</strong> In The Money</p>
            </div>
          </div>
        </Card>
      )}


      {/* Disclaimer */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-bold mb-1">⚠️ Educational Purpose Only - Not Financial Advice</p>
            <p className="text-xs">
              This Options Strategy Builder is provided for educational and informational purposes only. 
              It is not intended as investment advice, financial advice, trading advice, or any other type of advice. 
              The calculations are theoretical and based on the Black-Scholes model with simplified assumptions. 
              Real-world trading involves additional risks including but not limited to: liquidity risk, execution risk, 
              market risk, and model risk. Past performance does not guarantee future results. 
              <strong> Always consult with a licensed financial advisor before making any investment decisions. 
              Trading options involves substantial risk and is not suitable for all investors.</strong>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
