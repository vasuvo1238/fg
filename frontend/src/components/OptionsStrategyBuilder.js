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
  Plus, Trash2, TrendingUp, TrendingDown, AlertCircle,
  DollarSign, Target, Shield
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
  Area
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function OptionsStrategyBuilder() {
  const [symbol, setSymbol] = useState("");
  const [spotPrice, setSpotPrice] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  
  // Custom strategy state
  const [strategyName, setStrategyName] = useState("My Strategy");
  const [legs, setLegs] = useState([]);
  const [daysToExpiry, setDaysToExpiry] = useState(30);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/options/templates`);
      setTemplates(response.data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const addLeg = () => {
    setLegs([...legs, {
      option_type: "call",
      action: "buy",
      strike: spotPrice || 100,
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

  const buildFromTemplate = async () => {
    if (!selectedTemplate || !spotPrice) {
      toast.error("Please select a template and enter spot price");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/options/strategy/template`, {
        template_name: selectedTemplate,
        underlying_symbol: symbol || "STOCK",
        spot_price: parseFloat(spotPrice),
        days_to_expiry: daysToExpiry,
        volatility: 0.25
      });
      
      setStrategyResult(response.data);
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
    try {
      const response = await axios.post(`${API}/options/strategy/custom`, {
        strategy_name: strategyName,
        underlying_symbol: symbol || "STOCK",
        spot_price: parseFloat(spotPrice),
        legs: legs,
        volatility: 0.25
      });
      
      setStrategyResult(response.data);
      toast.success("Custom strategy built!");
    } catch (error) {
      toast.error("Failed to build custom strategy");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (typeof value === 'string') return value;
    return `$${Math.abs(value).toFixed(2)}`;
  };

  return (
    <div className="options-builder p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
            📊 Options Strategy Builder
          </h2>
          <p className="text-sm text-muted-foreground">
            Build and analyze options strategies with payoff diagrams and Greeks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={!customMode ? "default" : "outline"}
            onClick={() => setCustomMode(false)}
          >
            Templates
          </Button>
          <Button
            variant={customMode ? "default" : "outline"}
            onClick={() => setCustomMode(true)}
          >
            Custom
          </Button>
        </div>
      </div>

      {/* Input Section */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Symbol (Optional)</Label>
            <Input
              placeholder="AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <Label>Spot Price *</Label>
            <Input
              type="number"
              placeholder="100.00"
              value={spotPrice}
              onChange={(e) => setSpotPrice(e.target.value)}
            />
          </div>
          <div>
            <Label>Days to Expiry</Label>
            <Input
              type="number"
              placeholder="30"
              value={daysToExpiry}
              onChange={(e) => setDaysToExpiry(parseInt(e.target.value))}
            />
          </div>
        </div>

        {!customMode ? (
          <div className="mt-4 space-y-4">
            <div>
              <Label>Select Strategy Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name.replace(/_/g, ' ').toUpperCase()} - {template.market_view}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTemplate && templates.find(t => t.name === selectedTemplate) && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  {templates.find(t => t.name === selectedTemplate).description}
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span><strong>View:</strong> {templates.find(t => t.name === selectedTemplate).market_view}</span>
                  <span><strong>Risk:</strong> {templates.find(t => t.name === selectedTemplate).risk}</span>
                  <span><strong>Reward:</strong> {templates.find(t => t.name === selectedTemplate).reward}</span>
                </div>
              </div>
            )}

            <Button
              onClick={buildFromTemplate}
              disabled={loading || !spotPrice || !selectedTemplate}
              className="w-full"
            >
              Build Strategy
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
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
                        onChange={(e) => updateLeg(index, 'days_to_expiry', parseInt(e.target.value))}
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
        )}
      </Card>

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

          {/* Payoff Diagram */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Payoff Diagram
            </h3>
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
                
                {/* Profit area */}
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
          </Card>

          {/* Greeks */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Greeks Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(strategyResult.greeks).map(([greek, value]) => (
                <div key={greek} className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground capitalize">{greek}</p>
                  <p className="text-xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {value.toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs">
                <strong>Delta:</strong> Price change per $1 move in underlying | 
                <strong className="ml-2">Gamma:</strong> Delta change rate | 
                <strong className="ml-2">Theta:</strong> Daily time decay | 
                <strong className="ml-2">Vega:</strong> IV sensitivity | 
                <strong className="ml-2">Rho:</strong> Interest rate sensitivity
              </p>
            </div>
          </Card>

          {/* Strategy Legs */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              Strategy Legs
            </h3>
            <div className="space-y-2">
              {strategyResult.legs.map((leg, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      leg.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {leg.action.toUpperCase()}
                    </span>
                    <span className="font-semibold">{leg.quantity}x {leg.type.toUpperCase()}</span>
                    <span className="text-muted-foreground">Strike: ${leg.strike}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${leg.premium.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{leg.days_to_expiry} DTE</p>
                  </div>
                </div>
              ))}
            </div>
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
