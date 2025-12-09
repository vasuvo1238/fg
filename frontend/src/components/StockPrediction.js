import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, TrendingUp, TrendingDown, DollarSign, 
  AlertCircle, Activity, BarChart3, PieChart, Settings, Target
} from "lucide-react";
import { toast } from "sonner";
import ModelSettings from "@/components/ModelSettings";
import { 
  PriceHistoryChart, 
  PredictionChart, 
  TechnicalIndicatorsChart,
  VolumeChart 
} from "@/components/StockCharts";
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
  const [showSettings, setShowSettings] = useState(false);
  const [customWeights, setCustomWeights] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [historicalPeriod, setHistoricalPeriod] = useState("1mo");
  const [autohedgeAnalysis, setAutohedgeAnalysis] = useState(null);
  const [showAutohedge, setShowAutohedge] = useState(false);
  const [analystData, setAnalystData] = useState(null);

  const searchStock = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    try {
      // Fetch stock info, historical data, and analyst targets in parallel
      const [infoResponse, histResponse, analystResponse] = await Promise.all([
        axios.get(`${API}/stocks/${symbol.toUpperCase()}/info`),
        axios.get(`${API}/stocks/${symbol.toUpperCase()}/historical?period=${historicalPeriod}`),
        axios.get(`${API}/stocks/${symbol.toUpperCase()}/analyst-targets`).catch(() => null)
      ]);
      
      setStockData(infoResponse.data);
      setHistoricalData(histResponse.data.data);
      if (analystResponse && analystResponse.data) {
        setAnalystData(analystResponse.data);
      } else {
        setAnalystData(null);
      }
      toast.success(`Loaded ${infoResponse.data.name}`);
    } catch (error) {
      toast.error("Stock not found");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getAutoHedgeRecommendation = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    setShowAutohedge(true);
    try {
      const response = await axios.post(`${API}/autohedge/analyze`, {
        symbol: symbol.toUpperCase(),
        task: "Analyze this stock for investment opportunity",
        portfolio_allocation: 100000,
        timeframe: timeframe
      });
      
      setAutohedgeAnalysis(response.data);
      toast.success("AutoHedge Analysis Complete!");
    } catch (error) {
      toast.error("AutoHedge analysis failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPrediction = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    try {
      let endpoint;
      let requestData = {
        symbol: symbol.toUpperCase(),
        timeframe
      };
      
      if (customWeights) {
        endpoint = `${API}/stocks/${symbol.toUpperCase()}/predict/custom`;
        requestData = { ...requestData, ...customWeights };
      } else if (useEnsemble) {
        endpoint = `${API}/stocks/${symbol.toUpperCase()}/predict/ensemble`;
      } else {
        endpoint = `${API}/stocks/${symbol.toUpperCase()}/predict`;
      }
      
      // Fetch prediction and historical data
      const [predResponse, histResponse] = await Promise.all([
        axios.post(endpoint, requestData),
        axios.get(`${API}/stocks/${symbol.toUpperCase()}/historical?period=3mo`)
      ]);
      
      setPrediction(predResponse.data);
      setStockData(predResponse.data.current_info);
      setHistoricalData(histResponse.data.data);
      
      const predType = customWeights ? 'Custom' : useEnsemble ? 'Ensemble' : 'Standard';
      toast.success(`${predType} prediction generated!`);
    } catch (error) {
      toast.error("Failed to generate prediction");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomWeights = (weights) => {
    setCustomWeights(weights);
    setShowSettings(false);
    toast.success("Custom weights applied! Click Predict to see results.");
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
      {/* Disclaimer Banner */}
      <Card className="p-4 mb-6 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-bold mb-1">⚠️ Important: Educational Tool Only</p>
            <p className="text-xs">
              This stock prediction tool uses machine learning models for educational purposes only. 
              Predictions are based on historical data and mathematical models which may not reflect actual market conditions. 
              <strong> This is NOT financial advice. Do not use this for actual trading decisions. 
              Always consult a licensed financial advisor before investing.</strong>
            </p>
          </div>
        </div>
      </Card>

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
          <Button
            data-testid="autohedge-button"
            onClick={getAutoHedgeRecommendation}
            disabled={loading || !symbol.trim()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Activity className="w-4 h-4 mr-2" />
            AutoHedge
          </Button>
        </div>
        
        {/* Timeframe, Historical Period & Model Selector */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Chart Period:</span>
            {["1mo", "3mo", "6mo", "1y"].map((period) => (
              <Button
                key={period}
                variant={historicalPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setHistoricalPeriod(period)}
              >
                {period === "1mo" ? "30 days" : period === "3mo" ? "3 months" : period === "6mo" ? "6 months" : "1 year"}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Model:</span>
            <Button
              data-testid="standard-model-btn"
              variant={!useEnsemble && !customWeights ? "default" : "outline"}
              size="sm"
              onClick={() => { setUseEnsemble(false); setCustomWeights(null); }}
            >
              Standard
            </Button>
            <Button
              data-testid="ensemble-model-btn"
              variant={useEnsemble && !customWeights ? "default" : "outline"}
              size="sm"
              onClick={() => { setUseEnsemble(true); setCustomWeights(null); }}
              className="gap-1"
            >
              <Activity className="w-3 h-3" />
              Ensemble
            </Button>
            <Button
              data-testid="custom-weights-btn"
              variant={customWeights ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-1"
            >
              <Settings className="w-3 h-3" />
              Custom
            </Button>
          </div>
        </div>

        {/* Custom Weights Settings */}
        {showSettings && (
          <div className="mt-4">
            <ModelSettings 
              onWeightsChange={handleCustomWeights}
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}
      </Card>

      {/* AutoHedge Analysis Card */}
      {autohedgeAnalysis && showAutohedge && (
        <Card className="p-6 mb-6 border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
              🤖 AutoHedge Multi-Agent Analysis
            </h2>
            <div className={`px-4 py-2 rounded-full text-xl font-bold ${
              autohedgeAnalysis.action === 'BUY' ? 'bg-green-500 text-white' :
              autohedgeAnalysis.action === 'SELL' ? 'bg-red-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {autohedgeAnalysis.action}
            </div>
          </div>

          {/* Consensus Score */}
          <div className="mb-6 p-4 bg-white rounded-lg border-2 border-purple-300">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Agent Consensus</span>
              <span className="text-3xl font-bold text-purple-600">{autohedgeAnalysis.consensus_score.toFixed(0)}%</span>
            </div>
            <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${autohedgeAnalysis.consensus_score}%` }}
              />
            </div>
          </div>

          {/* Trade Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Position Size</p>
              <p className="text-lg font-bold text-purple-600">{autohedgeAnalysis.position_size_percent.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Risk Level</p>
              <p className="text-lg font-bold">{autohedgeAnalysis.risk_level}/10</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Target Price</p>
              <p className="text-lg font-bold text-green-600">${autohedgeAnalysis.target_price.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Stop Loss</p>
              <p className="text-lg font-bold text-red-600">${autohedgeAnalysis.stop_loss.toFixed(2)}</p>
            </div>
          </div>

          {/* Agent Analysis */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">Agent Recommendations:</h3>
            
            {Object.entries(autohedgeAnalysis.agents_analysis).map(([agentName, analysis]) => (
              <div key={agentName} className="p-4 bg-white rounded-lg border-l-4" style={{
                borderLeftColor: analysis.recommendation === 'BUY' ? '#10b981' : 
                                  analysis.recommendation === 'SELL' ? '#ef4444' : '#6b7280'
              }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold capitalize">{analysis.agent_name} Agent</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      analysis.recommendation === 'BUY' ? 'bg-green-100 text-green-800' :
                      analysis.recommendation === 'SELL' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {analysis.recommendation}
                    </span>
                    <span className="text-sm font-semibold">{analysis.confidence.toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{analysis.reasoning}</p>
                <ul className="text-xs space-y-1">
                  {analysis.key_points.map((point, idx) => (
                    <li key={idx}>• {point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Execution Plan */}
          <div className="mt-6 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-300">
            <h3 className="text-lg font-bold mb-3">📋 Execution Plan</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Entry Range:</span>
                <span className="font-bold ml-2">${autohedgeAnalysis.entry_price_range.min} - ${autohedgeAnalysis.entry_price_range.max}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Risk/Reward:</span>
                <span className="font-bold ml-2">{autohedgeAnalysis.risk_reward_ratio.toFixed(2)}:1</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time Horizon:</span>
                <span className="font-bold ml-2 capitalize">{autohedgeAnalysis.time_horizon}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Order Type:</span>
                <span className="font-bold ml-2">{autohedgeAnalysis.execution_plan.execution_style}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

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

      {/* Analyst Target Prices Card */}
      {analystData && analystData.has_data && (
        <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
                📊 Analyst Consensus & Price Targets
              </h3>
              <p className="text-xs text-muted-foreground">
                Based on {analystData.number_of_analysts || 'multiple'} analyst{analystData.number_of_analysts !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Consensus Badge */}
          <div className="mb-6 text-center">
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-2xl font-bold ${
              analystData.consensus === 'Strong Buy' ? 'bg-green-500 text-white' :
              analystData.consensus === 'Buy' ? 'bg-green-400 text-white' :
              analystData.consensus === 'Hold' ? 'bg-gray-400 text-white' :
              analystData.consensus === 'Sell' ? 'bg-red-400 text-white' :
              'bg-gray-300 text-gray-800'
            }`}>
              {analystData.consensus}
            </div>
          </div>

          {/* Target Prices */}
          {(analystData.target_prices.mean || analystData.target_prices.high) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-white rounded-lg shadow">
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="text-2xl font-bold text-gray-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatPrice(analystData.current_price)}
                </p>
              </div>

              {analystData.target_prices.mean && (
                <div className="p-4 bg-white rounded-lg shadow">
                  <p className="text-xs text-muted-foreground mb-1">Target (Mean)</p>
                  <p className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(analystData.target_prices.mean)}
                  </p>
                  {analystData.upside_downside.upside_to_mean_percent && (
                    <p className={`text-xs font-bold ${analystData.upside_downside.upside_to_mean_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analystData.upside_downside.upside_to_mean_percent >= 0 ? '↑' : '↓'} {Math.abs(analystData.upside_downside.upside_to_mean_percent).toFixed(1)}%
                    </p>
                  )}
                </div>
              )}

              {analystData.target_prices.high && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 shadow">
                  <p className="text-xs text-muted-foreground mb-1">Target (High)</p>
                  <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(analystData.target_prices.high)}
                  </p>
                  {analystData.upside_downside.upside_to_high_percent && (
                    <p className="text-xs font-bold text-green-600">
                      ↑ {analystData.upside_downside.upside_to_high_percent.toFixed(1)}%
                    </p>
                  )}
                </div>
              )}

              {analystData.target_prices.low && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200 shadow">
                  <p className="text-xs text-muted-foreground mb-1">Target (Low)</p>
                  <p className="text-2xl font-bold text-red-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(analystData.target_prices.low)}
                  </p>
                  {analystData.upside_downside.downside_to_low_percent && (
                    <p className="text-xs font-bold text-red-600">
                      ↓ {Math.abs(analystData.upside_downside.downside_to_low_percent).toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recommendation Breakdown */}
          {Object.values(analystData.recommendations).some(v => v > 0) && (
            <div className="p-4 bg-white rounded-lg shadow">
              <h4 className="font-bold mb-3 text-sm">Analyst Recommendations Breakdown</h4>
              <div className="grid grid-cols-5 gap-2 mb-3">
                <div className="text-center">
                  <div className="w-full bg-green-500 text-white rounded py-2 font-bold text-lg">
                    {analystData.recommendations.strongBuy}
                  </div>
                  <p className="text-xs mt-1">Strong Buy</p>
                </div>
                <div className="text-center">
                  <div className="w-full bg-green-300 text-white rounded py-2 font-bold text-lg">
                    {analystData.recommendations.buy}
                  </div>
                  <p className="text-xs mt-1">Buy</p>
                </div>
                <div className="text-center">
                  <div className="w-full bg-gray-300 text-white rounded py-2 font-bold text-lg">
                    {analystData.recommendations.hold}
                  </div>
                  <p className="text-xs mt-1">Hold</p>
                </div>
                <div className="text-center">
                  <div className="w-full bg-orange-300 text-white rounded py-2 font-bold text-lg">
                    {analystData.recommendations.sell}
                  </div>
                  <p className="text-xs mt-1">Sell</p>
                </div>
                <div className="text-center">
                  <div className="w-full bg-red-500 text-white rounded py-2 font-bold text-lg">
                    {analystData.recommendations.strongSell}
                  </div>
                  <p className="text-xs mt-1">Strong Sell</p>
                </div>
              </div>
              
              {/* Trend Indicator */}
              {(analystData.recommendation_trend.recent_upgrades > 0 || analystData.recommendation_trend.recent_downgrades > 0) && (
                <div className="flex items-center justify-center gap-4 text-sm">
                  {analystData.recommendation_trend.recent_upgrades > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-bold">{analystData.recommendation_trend.recent_upgrades} Upgrade{analystData.recommendation_trend.recent_upgrades > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {analystData.recommendation_trend.recent_downgrades > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <TrendingDown className="w-4 h-4" />
                      <span className="font-bold">{analystData.recommendation_trend.recent_downgrades} Downgrade{analystData.recommendation_trend.recent_downgrades > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Analyst ratings and price targets are opinions and should not be considered as investment advice. 
              Past accuracy of analyst predictions varies. Always conduct your own research.
            </p>
          </div>
        </Card>
      )}


      {/* Price Charts - Show when we have historical data */}
      {(historicalData && stockData) && (
        <div className="mb-6 space-y-4">
          <PriceHistoryChart 
            historicalData={historicalData} 
            stockName={stockData?.name || symbol.toUpperCase()}
          />
          
          {prediction && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PredictionChart
                  currentPrice={stockData?.current_price}
                  predictions={
                    prediction.individual_predictions?.lstm?.predictions || 
                    prediction.statistical_prediction?.predictions || 
                    []
                  }
                  confidenceInterval={prediction.confidence_interval}
                />
                <VolumeChart historicalData={historicalData} />
              </div>
              
              {prediction?.technical_indicators && (
                <TechnicalIndicatorsChart
                  historicalData={historicalData}
                  indicators={prediction.technical_indicators}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Prediction Results */}
      {prediction && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="prediction">Prediction</TabsTrigger>
            {prediction?.explanations && <TabsTrigger value="explained">📚 Explained</TabsTrigger>}
            {prediction?.individual_predictions && <TabsTrigger value="models">Models</TabsTrigger>}
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="prediction" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                {prediction.ensemble_prediction ? 'Ensemble Prediction' : 'Price Prediction'} ({timeframe})
              </h3>
              
              {prediction.ensemble_prediction && (
                <div className="mb-4 space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-900">
                      <strong>Ensemble Model:</strong> {customWeights ? 'Using your custom weights' : 'Combines LSTM (40%), Linear Regression (20%), Z-Score Mean Reversion (20%), and Ornstein-Uhlenbeck (20%)'} for higher accuracy.
                    </p>
                  </div>
                  {prediction.confidence_interval && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-900">95% Confidence Interval</span>
                        <span className="text-xs font-bold text-green-900" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatPrice(prediction.confidence_interval.lower_bound)} - {formatPrice(prediction.confidence_interval.upper_bound)}
                        </span>
                      </div>
                      <p className="text-xs text-green-800 mt-1">
                        95% probability the price will be within this range
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(stockData.current_price)}
                  </p>
                </div>
                <div className="text-center p-4 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Predicted Price</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(
                      prediction.ensemble_prediction 
                        ? prediction.ensemble_prediction.predicted_price
                        : prediction.statistical_prediction.predicted_price_end
                    )}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${
                  (prediction.ensemble_prediction?.trend || prediction.statistical_prediction.trend) === 'bullish' 
                    ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Expected Change</p>
                  <p className="text-2xl font-bold flex items-center justify-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {(prediction.ensemble_prediction?.trend || prediction.statistical_prediction.trend) === 'bullish' ? 
                      <TrendingUp className="w-5 h-5 text-green-600" /> : 
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    }
                    {formatPercent(
                      prediction.ensemble_prediction
                        ? prediction.ensemble_prediction.price_change_percent
                        : prediction.statistical_prediction.price_change_percent
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Confidence</span>
                  <span className="font-semibold">
                    {(prediction.ensemble_prediction?.confidence || prediction.statistical_prediction.confidence).toFixed(1)}%
                  </span>
                </div>
                {prediction.statistical_prediction && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Volatility</span>
                    <span className="font-semibold">{prediction.statistical_prediction.volatility.toFixed(2)}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm">Trend</span>
                  <span className={`font-semibold capitalize ${
                    (prediction.ensemble_prediction?.trend || prediction.statistical_prediction.trend) === 'bullish' 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {prediction.ensemble_prediction?.trend || prediction.statistical_prediction.trend}
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {prediction?.explanations && (
            <TabsContent value="explained" className="space-y-4">
              <Card className="p-6">
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                    📚 Predictions Explained for Everyone
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    No finance degree needed! We'll explain each prediction method using simple analogies and plain English.
                  </p>
                </div>

                {/* Ensemble Explanation */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h4 className="text-md font-bold">Ensemble Prediction (Combined Wisdom)</h4>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {prediction.explanations.ensemble}
                    </div>
                  </div>
                </div>

                <div className="border-t my-6"></div>

                {/* Individual Model Explanations */}
                <div className="space-y-6">
                  {/* LSTM */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <h4 className="text-md font-bold">LSTM Neural Network (The AI Detective)</h4>
                    </div>
                    <div className="prose prose-sm max-w-none bg-purple-50 p-4 rounded-lg">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {prediction.explanations.lstm}
                      </div>
                    </div>
                  </div>

                  {/* Linear Regression */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <h4 className="text-md font-bold">Linear Regression (The Trend Follower)</h4>
                    </div>
                    <div className="prose prose-sm max-w-none bg-green-50 p-4 rounded-lg">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {prediction.explanations.linear_regression}
                      </div>
                    </div>
                  </div>

                  {/* Z-Score */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <h4 className="text-md font-bold">Z-Score Mean Reversion (The Rubber Band)</h4>
                    </div>
                    <div className="prose prose-sm max-w-none bg-yellow-50 p-4 rounded-lg">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {prediction.explanations.z_score_mean_reversion}
                      </div>
                    </div>
                  </div>

                  {/* OU */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <h4 className="text-md font-bold">Ornstein-Uhlenbeck (The Ball in Bowl)</h4>
                    </div>
                    <div className="prose prose-sm max-w-none bg-orange-50 p-4 rounded-lg">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {prediction.explanations.ornstein_uhlenbeck}
                      </div>
                    </div>
                  </div>

                  {/* Technical Indicators */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <h4 className="text-md font-bold">Technical Indicators Explained</h4>
                    </div>
                    <div className="prose prose-sm max-w-none bg-indigo-50 p-4 rounded-lg">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {prediction.explanations.technical_indicators}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          )}

          {prediction?.individual_predictions && (
            <TabsContent value="models" className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                  Model Comparison
                </h3>
                
                <div className="space-y-4">
                  {/* LSTM */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">LSTM Neural Network</h4>
                        <p className="text-xs text-muted-foreground">Deep learning time series model</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">40% Weight</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Predicted</p>
                        <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatPrice(prediction.individual_predictions.lstm.predicted_price_end)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Change</p>
                        <p className={`font-bold ${prediction.individual_predictions.lstm.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(prediction.individual_predictions.lstm.price_change_percent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="font-bold">{prediction.individual_predictions.lstm.confidence.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Linear Regression */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">Linear Regression</h4>
                        <p className="text-xs text-muted-foreground">Statistical trend analysis</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded">20% Weight</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Predicted</p>
                        <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatPrice(prediction.individual_predictions.linear_regression.predicted_price_end)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Change</p>
                        <p className={`font-bold ${prediction.individual_predictions.linear_regression.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(prediction.individual_predictions.linear_regression.price_change_percent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="font-bold">{prediction.individual_predictions.linear_regression.confidence.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Z-Score Mean Reversion */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">Z-Score Mean Reversion</h4>
                        <p className="text-xs text-muted-foreground">Statistical mean reversion analysis</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">20% Weight</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Predicted</p>
                        <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatPrice(prediction.individual_predictions.z_score_mean_reversion.predicted_price_end)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Change</p>
                        <p className={`font-bold ${prediction.individual_predictions.z_score_mean_reversion.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(prediction.individual_predictions.z_score_mean_reversion.price_change_percent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Z-Score</p>
                        <p className="font-bold">{prediction.individual_predictions.z_score_mean_reversion.z_score.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Signal</p>
                        <p className="font-bold text-xs">{prediction.individual_predictions.z_score_mean_reversion.signal}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ornstein-Uhlenbeck */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">Ornstein-Uhlenbeck Process</h4>
                        <p className="text-xs text-muted-foreground">Stochastic mean reversion model</p>
                      </div>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded">20% Weight</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Predicted</p>
                        <p className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatPrice(prediction.individual_predictions.ornstein_uhlenbeck.predicted_price_end)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Change</p>
                        <p className={`font-bold ${prediction.individual_predictions.ornstein_uhlenbeck.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(prediction.individual_predictions.ornstein_uhlenbeck.price_change_percent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Half-Life</p>
                        <p className="font-bold">
                          {prediction.individual_predictions.ornstein_uhlenbeck.half_life_days 
                            ? `${prediction.individual_predictions.ornstein_uhlenbeck.half_life_days.toFixed(0)}d`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mean Reversion Analysis */}
                  {prediction.mean_reversion_analysis && (
                    <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                      <h4 className="font-semibold mb-3">Mean Reversion Analysis</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Reversion Score</p>
                          <p className="text-2xl font-bold">{prediction.mean_reversion_analysis.mean_reversion_score.toFixed(0)}/100</p>
                          <p className="text-xs mt-1">{prediction.mean_reversion_analysis.interpretation.overall}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Hurst Exponent</p>
                          <p className="text-2xl font-bold">{prediction.mean_reversion_analysis.hurst_exponent.toFixed(3)}</p>
                          <p className="text-xs mt-1">{prediction.mean_reversion_analysis.interpretation.hurst}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

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
