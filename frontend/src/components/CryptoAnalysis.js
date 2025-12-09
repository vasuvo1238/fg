import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Search, Flame, Bitcoin } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API } from '@/lib/api';

export default function CryptoAnalysis() {
  const [cryptos, setCryptos] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCryptos();
    fetchTrending();
  }, []);

  const fetchCryptos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/crypto/list?limit=50`);
      setCryptos(response.data.cryptos || []);
    } catch (error) {
      toast.error('Failed to fetch crypto data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await axios.get(`${API}/crypto/trending/list`);
      setTrending(response.data.trending || []);
    } catch (error) {
      console.error('Failed to fetch trending cryptos:', error);
    }
  };

  const fetchCoinDetails = async (coinId) => {
    setLoading(true);
    try {
      const [detailsRes, chartRes] = await Promise.all([
        axios.get(`${API}/crypto/${coinId}`),
        axios.get(`${API}/crypto/${coinId}/chart?days=30`)
      ]);
      
      setSelectedCoin(detailsRes.data);
      setChartData(chartRes.data.data || []);
      toast.success(`Loaded ${detailsRes.data.name} details`);
    } catch (error) {
      toast.error('Failed to fetch coin details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const filteredCryptos = cryptos.filter(crypto =>
    crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Bitcoin className="h-8 w-8 text-orange-500" />
            Cryptocurrency Analysis
          </h2>
          <p className="text-muted-foreground mt-1">Real-time crypto market data powered by CoinGecko</p>
        </div>
      </div>

      {/* Trending Section */}
      {trending.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Trending Cryptocurrencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {trending.slice(0, 7).map((coin) => (
                <Button
                  key={coin.id}
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCoinDetails(coin.id)}
                  className="flex items-center gap-2"
                >
                  {coin.thumb && <img src={coin.thumb} alt={coin.symbol} className="h-4 w-4" />}
                  <span className="font-semibold">{coin.symbol}</span>
                  <span className="text-xs text-muted-foreground">{coin.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Market Overview</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedCoin}>Coin Details</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="Search cryptocurrencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={fetchCryptos} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Crypto List */}
          <div className="grid gap-4">
            {loading && cryptos.length === 0 ? (
              <Card><CardContent className="p-8 text-center">Loading cryptocurrencies...</CardContent></Card>
            ) : (
              filteredCryptos.map((crypto) => (
                <Card key={crypto.id} className="crypto-card" onClick={() => fetchCoinDetails(crypto.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {crypto.image && <img src={crypto.image} alt={crypto.symbol} className="h-10 w-10" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{crypto.name}</h3>
                            <Badge variant="outline">{crypto.symbol}</Badge>
                            <Badge variant="secondary">#{crypto.market_cap_rank}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Market Cap: {formatNumber(crypto.market_cap)} | Volume: {formatNumber(crypto.total_volume)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold">${crypto.current_price?.toLocaleString()}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={crypto.price_change_24h >= 0 ? 'default' : 'destructive'} className="flex items-center gap-1">
                            {crypto.price_change_24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(crypto.price_change_24h)?.toFixed(2)}% (24h)
                          </Badge>
                          {crypto.price_change_7d && (
                            <Badge variant={crypto.price_change_7d >= 0 ? 'default' : 'destructive'}>
                              {Math.abs(crypto.price_change_7d)?.toFixed(2)}% (7d)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedCoin && (
            <>
              {/* Coin Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {selectedCoin.image && <img src={selectedCoin.image} alt={selectedCoin.symbol} className="h-16 w-16" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-3xl font-bold">{selectedCoin.name}</h2>
                        <Badge variant="outline" className="text-lg">{selectedCoin.symbol}</Badge>
                        <Badge>Rank #{selectedCoin.market_cap_rank}</Badge>
                      </div>
                      <p className="text-4xl font-bold mt-2">${selectedCoin.current_price?.toLocaleString()}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={selectedCoin.price_change_24h >= 0 ? 'default' : 'destructive'}>
                          {selectedCoin.price_change_24h >= 0 ? '↑' : '↓'} {Math.abs(selectedCoin.price_change_24h)?.toFixed(2)}% (24h)
                        </Badge>
                        <Badge variant={selectedCoin.price_change_7d >= 0 ? 'default' : 'destructive'}>
                          {Math.abs(selectedCoin.price_change_7d)?.toFixed(2)}% (7d)
                        </Badge>
                        <Badge variant={selectedCoin.price_change_30d >= 0 ? 'default' : 'destructive'}>
                          {Math.abs(selectedCoin.price_change_30d)?.toFixed(2)}% (30d)
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {selectedCoin.description && (
                    <p className="mt-4 text-sm text-muted-foreground">{selectedCoin.description}</p>
                  )}
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Market Cap</p>
                    <p className="text-xl font-bold">{formatNumber(selectedCoin.market_cap)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">24h Volume</p>
                    <p className="text-xl font-bold">{formatNumber(selectedCoin.total_volume)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Circulating Supply</p>
                    <p className="text-xl font-bold">{selectedCoin.circulating_supply?.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Max Supply</p>
                    <p className="text-xl font-bold">{selectedCoin.max_supply ? selectedCoin.max_supply.toLocaleString(undefined, {maximumFractionDigits: 0}) : '∞'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Price Chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>30-Day Price Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} />
                        <YAxis tick={{fontSize: 12}} />
                        <Tooltip />
                        <Line type="monotone" dataKey="price" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Additional Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>All-Time Stats</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">All-Time High</p>
                    <p className="text-2xl font-bold text-green-600">${selectedCoin.ath?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{selectedCoin.ath_date ? new Date(selectedCoin.ath_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">All-Time Low</p>
                    <p className="text-2xl font-bold text-red-600">${selectedCoin.atl?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{selectedCoin.atl_date ? new Date(selectedCoin.atl_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
