import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  TrendingUp, TrendingDown, Star, Plus, X, ArrowUpRight, ArrowDownRight,
  Activity, Clock, ChevronRight, ChevronDown, Flame,
  BarChart3, Search, Crosshair, Ruler, Type, PenTool, 
  Maximize2, Settings, Camera, Save, LineChart,
  Layers, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, MousePointer,
  TrendingUp as TrendIcon, Circle, Square, Triangle, Minus, Move,
  Grid3X3, Lock, Unlock, Trash2, Copy, MoreHorizontal, ChevronLeft, Bell
} from 'lucide-react';
import { API } from '@/lib/api';

// TradingView-style Sidebar Tool Button
const ToolButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all group relative ${
      active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
    }`}
    title={label}
  >
    <Icon className="w-4 h-4" />
    <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
      {label}
    </span>
  </button>
);

// Price Display Component
const PriceDisplay = ({ label, value, color = 'white' }) => (
  <span className="text-xs">
    <span className="text-slate-500">{label}</span>
    <span className={`ml-1 text-${color} tabular-nums`}>{value}</span>
  </span>
);

// Mini Candlestick Chart (SVG)
const CandlestickChart = ({ data, width = 800, height = 400 }) => {
  // Generate sample candlestick data
  const candles = data || Array.from({ length: 60 }, (_, i) => {
    const basePrice = 175 + Math.sin(i / 10) * 15 + Math.random() * 5;
    const open = basePrice + (Math.random() - 0.5) * 3;
    const close = basePrice + (Math.random() - 0.5) * 3;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    return { open, close, high, low, volume: Math.random() * 50 + 10 };
  });

  const maxPrice = Math.max(...candles.map(c => c.high));
  const minPrice = Math.min(...candles.map(c => c.low));
  const priceRange = maxPrice - minPrice;
  
  const candleWidth = (width - 100) / candles.length;
  const chartHeight = height - 100;
  
  // Calculate SMA
  const smaValues = candles.map((_, i) => {
    if (i < 9) return null;
    const sum = candles.slice(i - 9, i + 1).reduce((a, c) => a + c.close, 0);
    return sum / 10;
  });

  // Calculate Bollinger Bands
  const bbValues = candles.map((_, i) => {
    if (i < 19) return null;
    const slice = candles.slice(i - 19, i + 1);
    const mean = slice.reduce((a, c) => a + c.close, 0) / 20;
    const variance = slice.reduce((a, c) => a + Math.pow(c.close - mean, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    return { upper: mean + 2 * stdDev, middle: mean, lower: mean - 2 * stdDev };
  });

  const priceToY = (price) => chartHeight - ((price - minPrice) / priceRange) * chartHeight + 40;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <g key={i}>
          <line 
            x1="50" y1={40 + chartHeight * pct} 
            x2={width - 50} y2={40 + chartHeight * pct}
            stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2"
          />
          <text 
            x={width - 45} y={45 + chartHeight * pct} 
            fill="#64748b" fontSize="10" textAnchor="start"
          >
            {(maxPrice - priceRange * pct).toFixed(2)}
          </text>
        </g>
      ))}
      
      {/* Bollinger Bands */}
      {bbValues.filter(Boolean).length > 1 && (
        <>
          <path
            d={bbValues.map((bb, i) => bb ? `${i === 0 || !bbValues[i-1] ? 'M' : 'L'} ${50 + i * candleWidth + candleWidth/2} ${priceToY(bb.upper)}` : '').join(' ')}
            fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0.6"
          />
          <path
            d={bbValues.map((bb, i) => bb ? `${i === 0 || !bbValues[i-1] ? 'M' : 'L'} ${50 + i * candleWidth + candleWidth/2} ${priceToY(bb.lower)}` : '').join(' ')}
            fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0.6"
          />
        </>
      )}
      
      {/* SMA Line */}
      <path
        d={smaValues.map((sma, i) => sma ? `${i === 0 || !smaValues[i-1] ? 'M' : 'L'} ${50 + i * candleWidth + candleWidth/2} ${priceToY(sma)}` : '').join(' ')}
        fill="none" stroke="#F97316" strokeWidth="1.5"
      />
      
      {/* Candlesticks */}
      {candles.map((candle, i) => {
        const x = 50 + i * candleWidth;
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? '#10B981' : '#EF4444';
        const bodyTop = priceToY(Math.max(candle.open, candle.close));
        const bodyBottom = priceToY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        
        return (
          <g key={i}>
            {/* Wick */}
            <line
              x1={x + candleWidth / 2} y1={priceToY(candle.high)}
              x2={x + candleWidth / 2} y2={priceToY(candle.low)}
              stroke={color} strokeWidth="1"
            />
            {/* Body */}
            <rect
              x={x + 1} y={bodyTop}
              width={Math.max(1, candleWidth - 2)} height={bodyHeight}
              fill={isGreen ? color : color}
              stroke={color} strokeWidth="0.5"
            />
          </g>
        );
      })}
      
      {/* Current Price Line */}
      <line 
        x1="50" y1={priceToY(candles[candles.length - 1].close)}
        x2={width - 50} y2={priceToY(candles[candles.length - 1].close)}
        stroke="#EF4444" strokeWidth="1" strokeDasharray="4,2"
      />
      <rect 
        x={width - 48} y={priceToY(candles[candles.length - 1].close) - 10}
        width="45" height="20" fill="#EF4444" rx="2"
      />
      <text 
        x={width - 25} y={priceToY(candles[candles.length - 1].close) + 4}
        fill="white" fontSize="10" textAnchor="middle" fontWeight="bold"
      >
        {candles[candles.length - 1].close.toFixed(2)}
      </text>
      
      {/* Volume Bars */}
      {candles.map((candle, i) => {
        const x = 50 + i * candleWidth;
        const isGreen = candle.close >= candle.open;
        const maxVol = Math.max(...candles.map(c => c.volume));
        const volHeight = (candle.volume / maxVol) * 40;
        
        return (
          <rect
            key={`vol-${i}`}
            x={x + 1} y={height - 30 - volHeight}
            width={Math.max(1, candleWidth - 2)} height={volHeight}
            fill={isGreen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
          />
        );
      })}
    </svg>
  );
};

// Indicator Chart (MFI style)
const IndicatorChart = ({ height = 100 }) => {
  const data = Array.from({ length: 60 }, () => 20 + Math.random() * 60);
  const width = 800;
  
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Grid */}
      {[80, 50, 20].map((level, i) => (
        <line key={i}
          x1="50" y1={height - (level / 100) * height}
          x2={width - 50} y2={height - (level / 100) * height}
          stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2"
        />
      ))}
      
      {/* MFI Line */}
      <path
        d={data.map((val, i) => {
          const x = 50 + (i / data.length) * (width - 100);
          const y = height - (val / 100) * height;
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ')}
        fill="none" stroke="#3B82F6" strokeWidth="1.5"
      />
      
      {/* Current Value */}
      <text x={width - 45} y={height - (data[data.length - 1] / 100) * height + 4} 
        fill="#3B82F6" fontSize="10" fontWeight="bold">
        {data[data.length - 1].toFixed(2)}
      </text>
    </svg>
  );
};

export default function Dashboard({ onOpenChat }) {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [activeTool, setActiveTool] = useState('cursor');
  const [timeframe, setTimeframe] = useState('1D');
  const [showIndicators, setShowIndicators] = useState(true);
  const [priceData, setPriceData] = useState({
    open: 173.68,
    high: 175.15,
    low: 166.92,
    close: 168.34,
    change: -4.43,
    changePercent: -2.56
  });

  const [watchlist, setWatchlist] = useState([
    { symbol: 'AAPL', name: 'Apple Inc', price: 168.34, change: -2.56 },
    { symbol: 'MSFT', name: 'Microsoft', price: 438.12, change: 1.23 },
    { symbol: 'GOOGL', name: 'Alphabet', price: 192.45, change: 2.05 },
    { symbol: 'NVDA', name: 'NVIDIA', price: 134.28, change: 3.96 },
    { symbol: 'TSLA', name: 'Tesla', price: 421.06, change: -1.99 },
    { symbol: 'BTC-USD', name: 'Bitcoin', price: 104250, change: 2.11 },
    { symbol: 'ETH-USD', name: 'Ethereum', price: 3920, change: -1.21 },
  ]);

  const tools = [
    { id: 'cursor', icon: MousePointer, label: 'Cursor' },
    { id: 'crosshair', icon: Crosshair, label: 'Crosshair' },
    { id: 'trendline', icon: TrendIcon, label: 'Trend Line' },
    { id: 'horizontal', icon: Minus, label: 'Horizontal Line' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'brush', icon: PenTool, label: 'Brush' },
    { id: 'ruler', icon: Ruler, label: 'Measure' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom In' },
  ];

  const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M'];

  return (
    <div className="h-[calc(100vh-140px)] flex bg-[#0f1729]">
      {/* Left Sidebar - Tools */}
      <div className="w-12 bg-[#131c31] border-r border-slate-800 flex flex-col items-center py-2 gap-1">
        {tools.map(tool => (
          <ToolButton
            key={tool.id}
            icon={tool.icon}
            label={tool.label}
            active={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
          />
        ))}
        
        <div className="flex-1" />
        
        <ToolButton icon={Settings} label="Settings" />
        <ToolButton icon={Maximize2} label="Fullscreen" />
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col">
        {/* Chart Header */}
        <div className="h-10 bg-[#131c31] border-b border-slate-800 flex items-center px-3 gap-4">
          {/* Symbol Info */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{selectedSymbol}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
          
          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-xs rounded ${
                  timeframe === tf 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          {/* Indicators */}
          <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border-l border-slate-700 pl-3">
            <Layers className="w-4 h-4" />
            Indicators
          </button>
          
          <div className="flex-1" />
          
          {/* Price Info */}
          <div className="flex items-center gap-4 text-xs">
            <PriceDisplay label="O" value={priceData.open.toFixed(2)} />
            <PriceDisplay label="H" value={priceData.high.toFixed(2)} color="emerald-400" />
            <PriceDisplay label="L" value={priceData.low.toFixed(2)} color="red-400" />
            <PriceDisplay label="C" value={priceData.close.toFixed(2)} />
            <span className={`font-medium ${priceData.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)} ({priceData.changePercent.toFixed(2)}%)
            </span>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            <button className="text-slate-400 hover:text-white">
              <Camera className="w-4 h-4" />
            </button>
            <button className="text-slate-400 hover:text-white">
              <Save className="w-4 h-4" />
            </button>
            <button className="text-slate-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Indicator Info Bar */}
        <div className="h-6 bg-[#0f1729] border-b border-slate-800/50 flex items-center px-3 gap-6 text-xs">
          <span className="text-slate-500">Apple Inc. · 1D · NasdaqNM</span>
          <span className="text-slate-400">Volume <span className="text-emerald-400">SMA 9</span> 38.963M</span>
          <span className="text-slate-400">BB <span className="text-blue-400">20 2</span> 
            <span className="text-white ml-1">175.41</span> 
            <span className="text-blue-400 ml-1">183.77</span> 
            <span className="text-blue-400 ml-1">167.06</span>
          </span>
        </div>

        {/* Main Chart */}
        <div className="flex-1 bg-[#0f1729] relative">
          <CandlestickChart />
          
          {/* Y-Axis Labels (Right side price markers) */}
          <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col justify-between py-10 text-xs text-slate-500">
            {['183.77', '180.00', '176.41', '170.00', '168.34', '167.06'].map((price, i) => (
              <span key={i} className={`text-right pr-2 ${
                price === '168.34' ? 'text-red-400 font-bold' : ''
              }`}>{price}</span>
            ))}
          </div>
        </div>

        {/* MFI Indicator */}
        {showIndicators && (
          <div className="h-24 bg-[#0f1729] border-t border-slate-800">
            <div className="h-5 flex items-center px-3 text-xs">
              <span className="text-blue-400">MFI</span>
              <span className="text-slate-500 ml-1">14</span>
              <span className="text-blue-400 ml-2">37.04</span>
            </div>
            <IndicatorChart height={76} />
          </div>
        )}

        {/* Bottom Bar */}
        <div className="h-7 bg-[#131c31] border-t border-slate-800 flex items-center px-3 justify-between text-xs">
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white">5y</button>
            <button className="text-blue-400 hover:text-blue-300">1y</button>
            <button className="text-slate-400 hover:text-white">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
          <div className="text-slate-500">
            {new Date().toLocaleTimeString()} (UTC)
          </div>
          <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-white">%</button>
            <button className="text-slate-400 hover:text-white">log</button>
            <button className="text-slate-400 hover:text-white">auto</button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Watchlist */}
      <div className="w-64 bg-[#131c31] border-l border-slate-800 flex flex-col">
        {/* Watchlist Header */}
        <div className="h-10 border-b border-slate-800 flex items-center justify-between px-3">
          <span className="text-sm font-medium text-white">Watchlist</span>
          <div className="flex items-center gap-1">
            <button className="p-1 text-slate-400 hover:text-white">
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1 text-slate-400 hover:text-white">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-3 bg-slate-800/50 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Watchlist Items */}
        <div className="flex-1 overflow-y-auto">
          {watchlist.map((item, i) => (
            <button
              key={i}
              onClick={() => setSelectedSymbol(item.symbol)}
              className={`w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/50 transition-colors ${
                selectedSymbol === item.symbol ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
              }`}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-white">{item.symbol}</p>
                <p className="text-xs text-slate-500">{item.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white tabular-nums">
                  {item.price > 1000 ? item.price.toLocaleString() : item.price.toFixed(2)}
                </p>
                <p className={`text-xs tabular-nums ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="border-t border-slate-800 p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-slate-500">Day High</p>
              <p className="text-emerald-400 font-medium tabular-nums">175.15</p>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-slate-500">Day Low</p>
              <p className="text-red-400 font-medium tabular-nums">166.92</p>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-slate-500">Volume</p>
              <p className="text-white font-medium">38.9M</p>
            </div>
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-slate-500">Avg Vol</p>
              <p className="text-white font-medium">52.1M</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
