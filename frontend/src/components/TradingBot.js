import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Sun, TrendingUp, TrendingDown, Globe, DollarSign, AlertTriangle, 
  Download, RefreshCw, Plus, X, Clock, BarChart3, PieChart,
  Briefcase, Bell, Mic, FileText, Calendar, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, BarChart, Bar
} from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function TradingBot() {
  const [activeTab, setActiveTab] = useState('report');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [positions, setPositions] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPosition, setNewPosition] = useState({
    symbol: '',
    quantity: '',
    entry_price: '',
    position_type: 'long',
    notes: ''
  });

  useEffect(() => {
    fetchMorningReport();
    fetchPositions();
    fetchPortfolio();
  }, []);

  const fetchMorningReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/trading/morning-report`, { withCredentials: true });
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      toast.error('Failed to load morning report');
    } finally {
      setLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get(`${API}/trading/positions`, { withCredentials: true });
      setPositions(response.data.positions || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get(`${API}/trading/portfolio/analysis`, { withCredentials: true });
      setPortfolio(response.data);
      
      // Fetch alerts
      const alertsRes = await axios.get(`${API}/trading/portfolio/alerts`, { withCredentials: true });
      setAlerts(alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/trading/morning-report/pdf`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `morning_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Report downloaded!');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const addPosition = async () => {
    if (!newPosition.symbol || !newPosition.quantity || !newPosition.entry_price) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/trading/positions`, {
        symbol: newPosition.symbol.toUpperCase(),
        quantity: parseFloat(newPosition.quantity),
        entry_price: parseFloat(newPosition.entry_price),
        position_type: newPosition.position_type,
        notes: newPosition.notes
      }, { withCredentials: true });

      toast.success('Position added!');
      setNewPosition({ symbol: '', quantity: '', entry_price: '', position_type: 'long', notes: '' });
      setShowAddPosition(false);
      fetchPositions();
      fetchPortfolio();
    } catch (error) {
      toast.error('Failed to add position');
    }
  };

  const closePosition = async (positionId, currentPrice) => {
    try {
      await axios.post(`${API}/trading/positions/${positionId}/close`, {
        exit_price: currentPrice
      }, { withCredentials: true });

      toast.success('Position closed!');
      fetchPositions();
      fetchPortfolio();
    } catch (error) {
      toast.error('Failed to close position');
    }
  };

  const sentiment = report?.executive_summary?.sentiment || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Sun className="w-8 h-8 text-amber-400" />
            Trading Bot
          </h1>
          <p className="text-slate-400 mt-1">Pre-market intelligence & portfolio management</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchMorningReport} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={downloadPDF} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="report" className="gap-2">
            <FileText className="w-4 h-4" />
            Morning Report
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Positions
          </TabsTrigger>
        </TabsList>

        {/* Morning Report Tab */}
        <TabsContent value="report" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : report ? (
            <>
              {/* Sentiment Card */}
              <Card className="bg-gradient-to-r from-slate-800 to-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg text-slate-400">Market Sentiment</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge className={`text-lg px-4 py-1 ${
                          sentiment.overall?.includes('bullish') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          sentiment.overall?.includes('bearish') ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                          {sentiment.overall?.toUpperCase() || 'NEUTRAL'}
                        </Badge>
                        <span className="text-slate-400">Confidence: {sentiment.confidence}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400">VIX</p>
                      <p className={`text-3xl font-bold ${
                        sentiment.vix_level < 20 ? 'text-emerald-400' :
                        sentiment.vix_level < 30 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {sentiment.vix_level?.toFixed(1) || 'N/A'}
                      </p>
                      <p className="text-sm text-slate-500">{sentiment.vix_sentiment}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-slate-300 bg-slate-700/50 p-3 rounded-lg">
                    💡 {sentiment.recommendation}
                  </p>
                </CardContent>
              </Card>

              {/* Futures Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(report.futures || {}).map(([symbol, data]) => (
                  <Card key={symbol} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-slate-400 truncate">{data.name}</p>
                      <p className="text-lg font-bold text-white mt-1">
                        {typeof data.price === 'number' ? `$${data.price.toLocaleString()}` : 'N/A'}
                      </p>
                      <p className={`text-sm font-medium ${
                        data.change_percent > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {data.change_percent > 0 ? '↑' : '↓'} {Math.abs(data.change_percent || 0).toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Gap Scanners & Sectors */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Gap Scanners */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      Pre-Market Movers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-emerald-400 font-medium mb-2">🟢 Gapping UP</h4>
                        <div className="space-y-2">
                          {(report.gap_scanners?.gappers_up || []).slice(0, 5).map((g, i) => (
                            <div key={i} className="flex justify-between items-center bg-emerald-500/10 px-3 py-2 rounded">
                              <span className="font-medium text-white">{g.symbol}</span>
                              <span className="text-emerald-400">+{g.gap_percent?.toFixed(1)}%</span>
                            </div>
                          ))}
                          {(!report.gap_scanners?.gappers_up?.length) && (
                            <p className="text-slate-500 text-sm">No significant gaps up</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-red-400 font-medium mb-2">🔴 Gapping DOWN</h4>
                        <div className="space-y-2">
                          {(report.gap_scanners?.gappers_down || []).slice(0, 5).map((g, i) => (
                            <div key={i} className="flex justify-between items-center bg-red-500/10 px-3 py-2 rounded">
                              <span className="font-medium text-white">{g.symbol}</span>
                              <span className="text-red-400">{g.gap_percent?.toFixed(1)}%</span>
                            </div>
                          ))}
                          {(!report.gap_scanners?.gappers_down?.length) && (
                            <p className="text-slate-500 text-sm">No significant gaps down</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sectors */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-400" />
                      Sector Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(report.sectors || {}).slice(0, 8).map(([symbol, data], i) => (
                        <div key={symbol} className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">{data.name}</span>
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-medium ${
                              data.change_1d > 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {data.change_1d > 0 ? '+' : ''}{data.change_1d?.toFixed(2)}%
                            </span>
                            <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${data.change_1d > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(Math.abs(data.change_1d || 0) * 20, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Global Markets & Crypto */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Global Markets */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      Global Markets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-slate-400 text-sm mb-2">🌏 Asia</h4>
                        {Object.entries(report.global_markets?.asia || {}).map(([symbol, data]) => (
                          <div key={symbol} className="flex justify-between py-1">
                            <span className="text-slate-300 text-xs">{data.name?.split('(')[0]}</span>
                            <span className={`text-xs ${data.change_percent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {data.change_percent > 0 ? '+' : ''}{data.change_percent?.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-slate-400 text-sm mb-2">🌍 Europe</h4>
                        {Object.entries(report.global_markets?.europe || {}).map(([symbol, data]) => (
                          <div key={symbol} className="flex justify-between py-1">
                            <span className="text-slate-300 text-xs">{data.name?.split('(')[0]}</span>
                            <span className={`text-xs ${data.change_percent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {data.change_percent > 0 ? '+' : ''}{data.change_percent?.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Crypto */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-400" />
                      Crypto (24H)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(report.crypto || {}).map(([symbol, data]) => (
                        <div key={symbol} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{symbol.includes('BTC') ? '₿' : symbol.includes('ETH') ? 'Ξ' : '○'}</span>
                            <span className="text-white font-medium">{data.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-white">${data.price?.toLocaleString()}</p>
                            <p className={`text-xs ${data.change_24h > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {data.change_24h > 0 ? '+' : ''}{data.change_24h?.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Economic Calendar */}
              {report.economic_calendar?.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      Economic Events Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {report.economic_calendar.map((event, i) => (
                        <div key={i} className="flex items-center gap-4 bg-slate-700/50 px-4 py-2 rounded">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            event.importance === 'critical' ? 'bg-red-500/20 text-red-400' :
                            event.importance === 'high' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {event.time}
                          </span>
                          <span className="text-white">{event.event}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <Sun className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No report data available. Click Refresh to load.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          {portfolio ? (
            <>
              {/* Portfolio Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm">Total Value</p>
                    <p className="text-2xl font-bold text-white">${portfolio.total_value?.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm">Total P&L</p>
                    <p className={`text-2xl font-bold ${portfolio.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {portfolio.total_pnl >= 0 ? '+' : ''}${portfolio.total_pnl?.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm">Return %</p>
                    <p className={`text-2xl font-bold ${portfolio.total_pnl_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {portfolio.total_pnl_percent >= 0 ? '+' : ''}{portfolio.total_pnl_percent?.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-sm">Positions</p>
                    <p className="text-2xl font-bold text-white">{portfolio.total_positions}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Position Alerts ({alerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.map((alert, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded ${
                          alert.severity === 'high' ? 'bg-red-500/10' :
                          alert.severity === 'warning' ? 'bg-amber-500/10' : 'bg-slate-700/50'
                        }`}>
                          <Badge variant="outline" className="text-xs">{alert.symbol}</Badge>
                          <span className="text-slate-300">{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sector Allocation Chart */}
              {Object.keys(portfolio.sector_allocation || {}).length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Sector Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={Object.entries(portfolio.sector_allocation).map(([sector, data]) => ({
                              name: sector,
                              value: data.value
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {Object.keys(portfolio.sector_allocation).map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => `$${value.toLocaleString()}`}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Metrics */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-slate-400 text-sm">Win Rate</p>
                      <p className="text-xl font-bold text-white">{portfolio.risk_metrics?.win_rate?.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-slate-400 text-sm">Winning</p>
                      <p className="text-xl font-bold text-emerald-400">{portfolio.risk_metrics?.winning_positions}</p>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-slate-400 text-sm">Losing</p>
                      <p className="text-xl font-bold text-red-400">{portfolio.risk_metrics?.losing_positions}</p>
                    </div>
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                      <p className="text-slate-400 text-sm">Avg Position</p>
                      <p className="text-xl font-bold text-white">${portfolio.risk_metrics?.avg_position_size?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No portfolio data. Add positions to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Open Positions</h3>
            <Button onClick={() => setShowAddPosition(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              Add Position
            </Button>
          </div>

          {/* Add Position Modal */}
          {showAddPosition && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Add New Position</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddPosition(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-slate-300">Symbol *</Label>
                    <Input 
                      placeholder="AAPL"
                      value={newPosition.symbol}
                      onChange={(e) => setNewPosition({...newPosition, symbol: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Quantity *</Label>
                    <Input 
                      type="number"
                      placeholder="100"
                      value={newPosition.quantity}
                      onChange={(e) => setNewPosition({...newPosition, quantity: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Entry Price *</Label>
                    <Input 
                      type="number"
                      placeholder="150.00"
                      value={newPosition.entry_price}
                      onChange={(e) => setNewPosition({...newPosition, entry_price: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Type</Label>
                    <Select value={newPosition.position_type} onValueChange={(v) => setNewPosition({...newPosition, position_type: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Notes</Label>
                  <Input 
                    placeholder="Optional notes..."
                    value={newPosition.notes}
                    onChange={(e) => setNewPosition({...newPosition, notes: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <Button onClick={addPosition} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Add Position
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Positions List */}
          {portfolio?.positions?.length > 0 ? (
            <div className="space-y-3">
              {portfolio.positions.map((pos, i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-white">{pos.symbol}</span>
                            <Badge variant="outline" className={pos.position_type === 'long' ? 'text-emerald-400' : 'text-red-400'}>
                              {pos.position_type?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400">{pos.company_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Quantity</p>
                          <p className="text-white font-medium">{pos.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Entry</p>
                          <p className="text-white font-medium">${pos.entry_price?.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Current</p>
                          <p className="text-white font-medium">${pos.current_price?.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">P&L</p>
                          <p className={`font-bold ${pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl?.toFixed(2)}
                            <span className="text-sm ml-1">({pos.unrealized_pnl_percent?.toFixed(1)}%)</span>
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => closePosition(pos.position_id, pos.current_price)}
                          className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No open positions. Add your first position above.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
