import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, TrendingUp, TrendingDown, DollarSign, 
  AlertCircle, Activity, BarChart3, PieChart, Settings
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

  const searchStock = async () => {
    if (!symbol.trim()) return;

    setLoading(true);
    try {
      // Fetch stock info and historical data in parallel
      const [infoResponse, histResponse] = await Promise.all([
        axios.get(`${API}/stocks/${symbol.toUpperCase()}/info`),
        axios.get(`${API}/stocks/${symbol.toUpperCase()}/historical?period=3mo`)
      ]);
      
      setStockData(infoResponse.data);
      setHistoricalData(histResponse.data.data);
      toast.success(`Loaded ${infoResponse.data.name}`);
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
        
        {/* Timeframe & Model Selector */}
        <div className="mt-4 flex items-center justify-between">
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
