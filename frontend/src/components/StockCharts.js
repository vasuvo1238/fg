import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart
} from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export function PriceHistoryChart({ historicalData, stockName }) {
  if (!historicalData || historicalData.length === 0) {
    return <div className="text-center p-8 text-muted-foreground">No historical data available</div>;
  }

  // Format data for chart
  const chartData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: item.close,
    high: item.high,
    low: item.low,
    volume: item.volume
  }));

  // Calculate price range for better visualization
  const prices = historicalData.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yMin = minPrice - (priceRange * 0.1);
  const yMax = maxPrice + (priceRange * 0.1);

  // Determine trend color
  const firstPrice = chartData[0].price;
  const lastPrice = chartData[chartData.length - 1].price;
  const isUptrend = lastPrice >= firstPrice;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
            Price History - {stockName}
          </h3>
          <p className="text-sm text-muted-foreground">Last {chartData.length} trading days</p>
        </div>
        <div className="flex items-center gap-2">
          {isUptrend ? (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">Uptrend</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-semibold">Downtrend</span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUptrend ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isUptrend ? "#10b981" : "#ef4444"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          <YAxis 
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px'
            }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={isUptrend ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            fill="url(#colorPrice)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function PredictionChart({ currentPrice, predictions, confidenceInterval }) {
  if (!predictions || predictions.length === 0) {
    return null;
  }

  // Prepare chart data
  const chartData = [
    {
      date: 'Now',
      price: currentPrice,
      predicted: currentPrice,
      isActual: true
    },
    ...predictions.map(pred => ({
      date: new Date(pred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predicted: pred.price,
      upper: confidenceInterval ? confidenceInterval.upper_bound : null,
      lower: confidenceInterval ? confidenceInterval.lower_bound : null,
      isActual: false
    }))
  ];

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          Price Prediction Path
        </h3>
        <p className="text-sm text-muted-foreground">
          Forecasted price movement with 95% confidence interval
        </p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          />
          <YAxis 
            tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px'
            }}
            formatter={(value, name) => {
              if (name === 'predicted') return [`$${value.toFixed(2)}`, 'Predicted'];
              if (name === 'price') return [`$${value.toFixed(2)}`, 'Current'];
              if (name === 'upper') return [`$${value.toFixed(2)}`, 'Upper Bound'];
              if (name === 'lower') return [`$${value.toFixed(2)}`, 'Lower Bound'];
              return value;
            }}
          />
          <Legend />
          
          {/* Confidence interval area */}
          {confidenceInterval && (
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
            />
          )}
          {confidenceInterval && (
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.1}
            />
          )}
          
          {/* Current price line */}
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 6 }}
          />
          
          {/* Predicted price line */}
          <Line 
            type="monotone" 
            dataKey="predicted" 
            stroke="#3b82f6" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          
          <ReferenceLine 
            y={currentPrice} 
            stroke="#6b7280" 
            strokeDasharray="3 3"
            label={{ value: 'Current', position: 'right', fontSize: 10 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function TechnicalIndicatorsChart({ historicalData, indicators }) {
  if (!historicalData || historicalData.length === 0) {
    return null;
  }

  // Prepare data with indicators
  const chartData = historicalData.slice(-60).map((item, index) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: item.close,
    ma20: index >= 19 ? calculateMA(historicalData.slice(index - 19, index + 1).map(d => d.close)) : null,
    ma50: index >= 49 ? calculateMA(historicalData.slice(index - 49, index + 1).map(d => d.close)) : null,
  }));

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          Technical Indicators
        </h3>
        <p className="text-sm text-muted-foreground">Price with Moving Averages (MA-20, MA-50)</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          <YAxis 
            tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px'
            }}
            formatter={(value) => `$${value.toFixed(2)}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#1f2937" 
            strokeWidth={2}
            dot={false}
            name="Price"
          />
          <Line 
            type="monotone" 
            dataKey="ma20" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            name="MA-20"
          />
          <Line 
            type="monotone" 
            dataKey="ma50" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={false}
            name="MA-50"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* RSI Chart */}
      {indicators?.rsi && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3">RSI (Relative Strength Index)</h4>
          <div className="relative h-20 bg-secondary rounded-lg p-4">
            <div className="absolute inset-0 flex items-center px-4">
              <div className="w-full h-2 bg-gray-200 rounded-full relative">
                {/* RSI zones */}
                <div className="absolute left-0 w-[30%] h-full bg-green-200 rounded-l-full"></div>
                <div className="absolute left-[30%] w-[40%] h-full bg-gray-100"></div>
                <div className="absolute right-0 w-[30%] h-full bg-red-200 rounded-r-full"></div>
                
                {/* RSI marker */}
                <div 
                  className="absolute h-6 w-6 bg-primary rounded-full border-4 border-white shadow-lg -top-2"
                  style={{ left: `${indicators.rsi}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                    {indicators.rsi.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-1 left-4 right-4 flex justify-between text-xs text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <span>0 (Oversold)</span>
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>100 (Overbought)</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function VolumeChart({ historicalData }) {
  if (!historicalData || historicalData.length === 0) {
    return null;
  }

  const chartData = historicalData.slice(-30).map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volume: item.volume / 1000000, // Convert to millions
    priceChange: item.close - item.open
  }));

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
          Trading Volume
        </h3>
        <p className="text-sm text-muted-foreground">Daily volume (in millions)</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          <YAxis 
            tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickFormatter={(value) => `${value.toFixed(0)}M`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px'
            }}
            formatter={(value) => [`${value.toFixed(2)}M`, 'Volume']}
          />
          <Bar 
            dataKey="volume" 
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Helper function to calculate moving average
function calculateMA(prices) {
  if (prices.length === 0) return null;
  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}
