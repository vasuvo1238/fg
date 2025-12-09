import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Search, DollarSign, Target, Calculator, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api";

export default function PredictionMarkets() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [userProbabilities, setUserProbabilities] = useState({});
  const [bankroll, setBankroll] = useState(10000);
  const [kellyFraction, setKellyFraction] = useState(0.25);
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("polymarket,kalshi");
  const [arbitrageOpps, setArbitrageOpps] = useState([]);

  // Fetch markets on component mount
  useEffect(() => {
    fetchMarkets();
    fetchArbitrage();
  }, [source]);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/prediction-markets/markets`, {
        params: {
          sources: source,
          limit: 100
        }
      });
      setMarkets(response.data.markets || []);
      toast.success(`Loaded ${response.data.total} markets`);
    } catch (error) {
      toast.error("Failed to fetch markets");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArbitrage = async () => {
    try {
      const response = await axios.get(`${API}/prediction-markets/arbitrage`);
      setArbitrageOpps(response.data.opportunities || []);
    } catch (error) {
      console.error("Arbitrage fetch error:", error);
    }
  };

  const toggleMarketSelection = (market) => {
    const isSelected = selectedMarkets.find(m => m.id === market.id);
    if (isSelected) {
      setSelectedMarkets(selectedMarkets.filter(m => m.id !== market.id));
      const newProbs = { ...userProbabilities };
      delete newProbs[market.id];
      setUserProbabilities(newProbs);
    } else {
      setSelectedMarkets([...selectedMarkets, market]);
      setUserProbabilities({
        ...userProbabilities,
        [market.id]: market.yes_price // Default to market price
      });
    }
  };

  const updateProbability = (marketId, probability) => {
    setUserProbabilities({
      ...userProbabilities,
      [marketId]: parseFloat(probability)
    });
  };

  const optimizePortfolio = async () => {
    if (selectedMarkets.length === 0) {
      toast.error("Please select at least one market");
      return;
    }

    setLoading(true);
    try {
      const marketInputs = selectedMarkets.map(m => ({
        market_id: m.id,
        probability: userProbabilities[m.id] || m.yes_price
      }));

      const response = await axios.post(`${API}/api/prediction-markets/optimize`, {
        markets: marketInputs,
        bankroll: bankroll,
        kelly_fraction: kellyFraction,
        max_markets: 10,
        min_ev: 0.05
      });

      setOptimization(response.data.portfolio);
      toast.success("Portfolio optimized!");
    } catch (error) {
      toast.error("Optimization failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return `${(price * 100).toFixed(1)}¢`;
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
          🎲 Prediction Market Optimizer
        </h1>
        <p className="text-muted-foreground">
          Kelly Criterion portfolio optimization for Polymarket & Kalshi
        </p>
      </div>

      {/* Portfolio Configuration */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
          Portfolio Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Bankroll</Label>
            <Input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(parseFloat(e.target.value))}
              placeholder="10000"
            />
          </div>
          <div>
            <Label>Kelly Fraction</Label>
            <Select value={kellyFraction.toString()} onValueChange={(v) => setKellyFraction(parseFloat(v))}>
              <SelectTrigger>
                <SelectValue>
                  {kellyFraction === 0.125 && "1/8 Kelly (Very Conservative)"}
                  {kellyFraction === 0.25 && "1/4 Kelly (Conservative)"}
                  {kellyFraction === 0.5 && "1/2 Kelly (Moderate)"}
                  {kellyFraction === 1.0 && "Full Kelly (Aggressive)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.125">1/8 Kelly (Very Conservative)</SelectItem>
                <SelectItem value="0.25">1/4 Kelly (Conservative)</SelectItem>
                <SelectItem value="0.5">1/2 Kelly (Moderate)</SelectItem>
                <SelectItem value="1.0">Full Kelly (Aggressive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Market Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="polymarket">Polymarket Only</SelectItem>
                <SelectItem value="kalshi">Kalshi Only</SelectItem>
                <SelectItem value="polymarket,kalshi">Both Platforms</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={fetchMarkets} disabled={loading} className="gap-2">
            <Search className="w-4 h-4" />
            Refresh Markets
          </Button>
          <Button onClick={optimizePortfolio} disabled={loading || selectedMarkets.length === 0} className="gap-2">
            <Calculator className="w-4 h-4" />
            Optimize Portfolio
          </Button>
        </div>
      </Card>

      {/* Arbitrage Opportunities */}
      {arbitrageOpps.length > 0 && (
        <Card className="p-6 mb-6 bg-yellow-50 border-2 border-yellow-300">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
              🎯 Arbitrage Opportunities Found!
            </h3>
          </div>
          <div className="space-y-2">
            {arbitrageOpps.slice(0, 3).map((opp, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg">
                <p className="font-bold text-sm">{opp.title}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Platforms: {opp.platforms.join(' vs ')}</span>
                  <span className="text-green-600 font-bold">
                    +{opp.potential_profit_pct.toFixed(2)}% potential profit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Markets Grid */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
          Available Markets ({markets.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {markets.map((market) => {
            const isSelected = selectedMarkets.find(m => m.id === market.id);
            return (
              <Card
                key={market.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-2 border-purple-500 bg-purple-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleMarketSelection(market)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm line-clamp-2">{market.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{market.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Vol: {formatCurrency(market.volume)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-lg font-bold text-green-600">{formatPrice(market.yes_price)}</div>
                    <div className="text-xs text-muted-foreground">YES</div>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                    <Label className="text-xs">Your Probability Estimate</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={userProbabilities[market.id] || market.yes_price}
                      onChange={(e) => updateProbability(market.id, e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Market: {(market.yes_price * 100).toFixed(1)}% | You: {((userProbabilities[market.id] || market.yes_price) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Optimization Results */}
      {optimization && (
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
              Optimized Portfolio
            </h3>
          </div>

          {/* Phase 1 Enhancements Badge */}
          {optimization.enhancements_applied && (
            <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="bg-purple-600">Phase 1 Enhancements Active</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {optimization.enhancements_applied.correlation_penalty && (
                  <Badge variant="outline">✓ Correlation Analysis</Badge>
                )}
                {optimization.enhancements_applied.liquidity_constraints && (
                  <Badge variant="outline">✓ Liquidity Constraints</Badge>
                )}
                {optimization.enhancements_applied.time_decay && (
                  <Badge variant="outline">✓ Time Decay</Badge>
                )}
                {optimization.enhancements_applied.spread_adjustment && (
                  <Badge variant="outline">✓ Spread Adjustment</Badge>
                )}
              </div>
            </div>
          )}

          {/* Portfolio Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded-lg shadow">
              <p className="text-xs text-muted-foreground mb-1">Total Allocated</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(optimization.portfolio_stats.total_allocated)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <p className="text-xs text-muted-foreground mb-1">Potential Profit</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(optimization.portfolio_stats.total_potential_profit)}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <p className="text-xs text-muted-foreground mb-1">Avg Expected Value</p>
              <p className="text-2xl font-bold text-purple-600">
                {(optimization.portfolio_stats.average_ev * 100).toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <p className="text-xs text-muted-foreground mb-1">Diversification</p>
              <p className="text-2xl font-bold text-green-600">
                {optimization.portfolio_stats.diversification_score ? 
                  (optimization.portfolio_stats.diversification_score * 100).toFixed(0) + '%' : 
                  optimization.portfolio_stats.num_markets}
              </p>
              <p className="text-xs text-muted-foreground">
                {optimization.portfolio_stats.average_correlation ? 
                  `Avg Corr: ${(optimization.portfolio_stats.average_correlation * 100).toFixed(0)}%` :
                  `${optimization.portfolio_stats.num_markets} markets`}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <h4 className="font-bold mb-3">Recommended Positions</h4>
          <div className="space-y-3">
            {optimization.recommendations.map((rec, idx) => (
              <Card key={idx} className="p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={rec.position === 'YES' ? 'default' : 'secondary'}>
                        {rec.position}
                      </Badge>
                      <Badge variant="outline">{rec.source}</Badge>
                    </div>
                    <p className="font-bold text-sm">{rec.title}</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Market: </span>
                        <span className="font-bold">{formatPrice(rec.market_price)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Your Est: </span>
                        <span className="font-bold">{(rec.user_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">EV: </span>
                        <span className="font-bold text-green-600">+{(rec.expected_value * 100).toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kelly: </span>
                        <span className="font-bold">{(rec.kelly_fraction * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Liquidity: </span>
                        <span className="font-bold">{formatCurrency(rec.liquidity || 0)}</span>
                      </div>
                    </div>
                    {rec.correlation_penalty && rec.correlation_penalty > 0.5 && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          ⚠️ Correlated: {(rec.penalty_applied || 0).toFixed(0)}% reduction applied
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(rec.recommended_bet)}
                    </div>
                    <div className="text-xs text-muted-foreground">Bet Size</div>
                    <div className="text-sm font-bold text-blue-600 mt-1">
                      +{formatCurrency(rec.potential_profit)}
                    </div>
                    <div className="text-xs text-muted-foreground">If Win</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ Risk Warning:</strong> Prediction markets involve significant risk. 
              Kelly Criterion assumes accurate probability estimates. Never bet more than you can afford to lose. 
              This is for educational purposes only and not financial advice.
            </p>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 mt-6 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-blue-600" />
          <div>
            <h3 className="font-bold text-lg">About Kelly Criterion</h3>
            <p className="text-sm text-muted-foreground">
              Kelly Criterion calculates optimal bet size based on your probability estimate and market odds. 
              Fractional Kelly (1/4 or 1/2) is recommended to reduce variance while maintaining growth. 
              Only bet when you have an edge (your estimate differs significantly from market price).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
