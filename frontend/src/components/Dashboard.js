import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  TrendingUp, TrendingDown, Star, Plus, X, ArrowUpRight, ArrowDownRight,
  PieChart, Activity, Newspaper, Clock, ChevronRight, Flame, Zap,
  BarChart3, Globe, Bitcoin, DollarSign, AlertCircle
} from 'lucide-react';
import { API } from '@/lib/api';

// Mini Sparkline Component
const Sparkline = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-8" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

export default function Dashboard({ onOpenChat }) {
  const [marketData, setMarketData] = useState({
    indices: [],
    crypto: [],
    topMovers: { gainers: [], losers: [] },
    sectors: []
  });
  const [watchlist, setWatchlist] = useState([
    { symbol: 'AAPL', name: 'Apple Inc.', price: 248.52, change: 2.34, changePercent: 0.95 },
    { symbol: 'MSFT', name: 'Microsoft', price: 438.12, change: -1.23, changePercent: -0.28 },
    { symbol: 'GOOGL', name: 'Alphabet', price: 192.45, change: 3.87, changePercent: 2.05 },
    { symbol: 'NVDA', name: 'NVIDIA', price: 134.28, change: 5.12, changePercent: 3.96 },
    { symbol: 'TSLA', name: 'Tesla', price: 421.06, change: -8.54, changePercent: -1.99 },
  ]);
  const [portfolio, setPortfolio] = useState({
    totalValue: 125420.50,
    dayChange: 1250.30,
    dayChangePercent: 1.01,
    holdings: [
      { symbol: 'AAPL', value: 35000, percent: 28 },
      { symbol: 'BTC', value: 28000, percent: 22 },
      { symbol: 'MSFT', value: 22000, percent: 18 },
      { symbol: 'ETH', value: 18000, percent: 14 },
      { symbol: 'Other', value: 22420, percent: 18 },
    ]
  });
  const [news, setNews] = useState([
    { id: 1, title: 'Fed signals potential rate cuts in 2025', source: 'Reuters', time: '2h ago', sentiment: 'bullish' },
    { id: 2, title: 'Bitcoin breaks $105K amid institutional buying', source: 'CoinDesk', time: '3h ago', sentiment: 'bullish' },
    { id: 3, title: 'Tech stocks rally on AI earnings beat', source: 'Bloomberg', time: '4h ago', sentiment: 'bullish' },
    { id: 4, title: 'China announces new crypto regulations', source: 'WSJ', time: '5h ago', sentiment: 'bearish' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    try {
      // Fetch real data from our APIs
      const [futuresRes, cryptoRes, sectorsRes] = await Promise.all([
        axios.get(`${API}/trading/futures`, { withCredentials: true }).catch(() => null),
        axios.get(`${API}/crypto/top`, { withCredentials: true }).catch(() => null),
        axios.get(`${API}/trading/sectors`, { withCredentials: true }).catch(() => null),
      ]);

      setMarketData({
        indices: futuresRes?.data ? Object.entries(futuresRes.data).map(([symbol, data]) => ({
          symbol,
          name: data.name,
          price: data.price,
          change: data.change,
          changePercent: data.change_percent,
          sparkline: Array.from({length: 20}, () => data.price * (0.98 + Math.random() * 0.04))
        })).slice(0, 4) : [
          { symbol: 'ES=F', name: 'S&P 500', price: 6120.50, change: 28.75, changePercent: 0.47, sparkline: Array.from({length: 20}, () => 6100 + Math.random() * 50) },
          { symbol: 'NQ=F', name: 'Nasdaq', price: 21850.25, change: 156.30, changePercent: 0.72, sparkline: Array.from({length: 20}, () => 21700 + Math.random() * 200) },
          { symbol: 'YM=F', name: 'Dow Jones', price: 44250.00, change: -85.50, changePercent: -0.19, sparkline: Array.from({length: 20}, () => 44200 + Math.random() * 100) },
          { symbol: 'RTY=F', name: 'Russell 2000', price: 2380.75, change: 12.25, changePercent: 0.52, sparkline: Array.from({length: 20}, () => 2370 + Math.random() * 20) },
        ],
        crypto: cryptoRes?.data?.coins?.slice(0, 4) || [
          { symbol: 'BTC', name: 'Bitcoin', price: 104250, change: 2150, changePercent: 2.11 },
          { symbol: 'ETH', name: 'Ethereum', price: 3920, change: -48, changePercent: -1.21 },
          { symbol: 'SOL', name: 'Solana', price: 228, change: 12.5, changePercent: 5.81 },
          { symbol: 'XRP', name: 'Ripple', price: 2.45, change: 0.08, changePercent: 3.37 },
        ],
        topMovers: {
          gainers: [
            { symbol: 'MSTR', name: 'MicroStrategy', changePercent: 12.5 },
            { symbol: 'COIN', name: 'Coinbase', changePercent: 8.3 },
            { symbol: 'PLTR', name: 'Palantir', changePercent: 6.2 },
          ],
          losers: [
            { symbol: 'MRNA', name: 'Moderna', changePercent: -5.8 },
            { symbol: 'RIVN', name: 'Rivian', changePercent: -4.2 },
            { symbol: 'NIO', name: 'NIO Inc', changePercent: -3.5 },
          ]
        },
        sectors: sectorsRes?.data || []
      });
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (price >= 100) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const portfolioColors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#64748B'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketData.indices.map((index, i) => (
          <Card key={i} className="trading-card hover:border-slate-600 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{index.name}</p>
                  <p className="text-xl font-bold text-white tabular-nums mt-1">
                    {formatPrice(index.price)}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 ${index.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {index.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span className="text-sm font-medium tabular-nums">
                      {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <Sparkline 
                  data={index.sparkline || []} 
                  color={index.changePercent >= 0 ? '#10B981' : '#EF4444'} 
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Chart & Watchlist */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Chart Placeholder */}
          <Card className="trading-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    S&P 500 Index
                  </CardTitle>
                  <div className="flex gap-2">
                    {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map(period => (
                      <button 
                        key={period}
                        className={`px-2 py-1 text-xs rounded ${period === '1D' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tabular-nums">6,120.50</span>
                  <span className="text-emerald-400 text-sm">+0.47%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* TradingView-style chart placeholder */}
              <div className="h-64 bg-slate-900/50 rounded-lg chart-grid flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Interactive chart</p>
                  <p className="text-slate-600 text-xs">TradingView integration available</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Movers */}
          <div className="grid grid-cols-2 gap-4">
            {/* Gainers */}
            <Card className="trading-card">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {marketData.topMovers.gainers.map((stock, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <div>
                        <p className="font-medium text-white text-sm">{stock.symbol}</p>
                        <p className="text-xs text-slate-500">{stock.name}</p>
                      </div>
                      <span className="text-emerald-400 font-medium tabular-nums">
                        +{stock.changePercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Losers */}
            <Card className="trading-card">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Top Losers
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {marketData.topMovers.losers.map((stock, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <div>
                        <p className="font-medium text-white text-sm">{stock.symbol}</p>
                        <p className="text-xs text-slate-500">{stock.name}</p>
                      </div>
                      <span className="text-red-400 font-medium tabular-nums">
                        {stock.changePercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Crypto Section */}
          <Card className="trading-card">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Bitcoin className="w-5 h-5 text-amber-500" />
                  Cryptocurrency
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {marketData.crypto.map((coin, i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        coin.symbol === 'BTC' ? 'bg-amber-500/20' : 
                        coin.symbol === 'ETH' ? 'bg-purple-500/20' : 
                        coin.symbol === 'SOL' ? 'bg-gradient-to-r from-purple-500/20 to-teal-500/20' : 'bg-blue-500/20'
                      }`}>
                        <span className="text-xs font-bold">{coin.symbol.slice(0, 1)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{coin.symbol}</p>
                        <p className="text-xs text-slate-500">{coin.name}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-white tabular-nums">${formatPrice(coin.price)}</p>
                    <p className={`text-xs tabular-nums ${coin.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {coin.changePercent >= 0 ? '+' : ''}{coin.changePercent.toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Portfolio & Watchlist */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Portfolio Summary */}
          <Card className="trading-card">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-400" />
                Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-white tabular-nums">
                  ${portfolio.totalValue.toLocaleString()}
                </p>
                <p className={`text-sm ${portfolio.dayChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolio.dayChangePercent >= 0 ? '+' : ''}${portfolio.dayChange.toLocaleString()} ({portfolio.dayChangePercent}%) today
                </p>
              </div>
              
              {/* Mini Pie Chart Visualization */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {portfolio.holdings.reduce((acc, holding, i) => {
                      const startAngle = acc.angle;
                      const angle = (holding.percent / 100) * 360;
                      const endAngle = startAngle + angle;
                      
                      const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                      const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                      const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                      const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
                      
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      acc.paths.push(
                        <path
                          key={i}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={portfolioColors[i]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      );
                      acc.angle = endAngle;
                      return acc;
                    }, { paths: [], angle: 0 }).paths}
                    <circle cx="50" cy="50" r="25" fill="#1E293B" />
                  </svg>
                </div>
              </div>

              {/* Holdings List */}
              <div className="space-y-2">
                {portfolio.holdings.map((holding, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: portfolioColors[i] }} />
                      <span className="text-slate-300">{holding.symbol}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white tabular-nums">${holding.value.toLocaleString()}</span>
                      <span className="text-slate-500 ml-2">{holding.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Watchlist */}
          <Card className="trading-card">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  Watchlist
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-1">
                {watchlist.map((stock, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <div>
                        <p className="font-medium text-white text-sm">{stock.symbol}</p>
                        <p className="text-xs text-slate-500">{stock.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white text-sm tabular-nums">${stock.price}</p>
                      <p className={`text-xs tabular-nums ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* News Feed */}
          <Card className="trading-card">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-400" />
                Market News
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-3">
                {news.map((item) => (
                  <div key={item.id} className="group cursor-pointer">
                    <p className="text-sm text-slate-300 group-hover:text-white transition-colors line-clamp-2">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{item.source}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-500">{item.time}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.sentiment}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Advisor Promo Card */}
      <Card className="trading-card bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">AI Trading Assistant</h3>
                <p className="text-slate-400 text-sm">Get personalized market insights and portfolio recommendations</p>
              </div>
            </div>
            <Button onClick={onOpenChat} className="bg-blue-600 hover:bg-blue-500">
              Ask AI Advisor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
