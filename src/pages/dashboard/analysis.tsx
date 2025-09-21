import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Newspaper, RefreshCw, Loader2 } from 'lucide-react';
import { NewsCache } from '@/lib/newsCache';

interface CryptoPrice {
  symbol: string;
  name: string;
  price: string;
  change: string;
  volume: string;
  trend: 'up' | 'down';
  icon: string;
}

interface NewsItem {
  title: string;
  source: string;
  time: string;
  url: string;
}

interface MarketSentiment {
  overall: string;
  fearGreedIndex: number;
  fearGreedText: string;
}

export default function Analysis() {
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [cryptoNews, setCryptoNews] = useState<NewsItem[]>([]);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch cryptocurrency prices from CoinGecko (real data only)
  const fetchCryptoPrices = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,binancecoin&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h'
      );
      
      if (!response.ok) {
        console.error('Failed to fetch crypto prices');
        return;
      }
      
      const data = await response.json();
      
      const formattedData: CryptoPrice[] = data.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: `$${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: `${coin.price_change_percentage_24h?.toFixed(2)}%`,
        volume: `$${(coin.total_volume / 1000000000).toFixed(1)}B`,
        trend: coin.price_change_percentage_24h >= 0 ? 'up' : 'down',
        icon: getIconForSymbol(coin.symbol.toUpperCase())
      }));
      
      setCryptoPrices(formattedData);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setCryptoPrices([]);
    }
  };

  // Aggressive real news fetching - multiple APIs and proxies with 6-hour caching
  const fetchCryptoNews = async (forceRefresh: boolean = false) => {
    // Check cache first (unless forced refresh)
    if (!forceRefresh && NewsCache.isCacheValid()) {
      const cachedNews = NewsCache.getCachedNews();
      if (cachedNews.length > 0) {
        console.log(`📋 Using cached news data (${cachedNews.length} articles)`);
        setCryptoNews(cachedNews);
        return;
      }
    }

    console.log('🔄 Aggressively fetching fresh crypto news...');
    
    // Method 1: Try CryptoPanic with multiple CORS proxies
    const tryFetchCryptoPanic = async () => {
      const apiKey = import.meta.env.VITE_CRYPTOPANIC_API_KEY;
      if (!apiKey || apiKey === 'demo') {
        console.log('❌ No CryptoPanic API key');
        return null;
      }

      const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-anywhere.herokuapp.com/',
      ];
      
      const apiUrl = `https://cryptopanic.com/api/free/v1/posts/?auth_token=${apiKey}&public=true&currencies=BTC,ETH,SOL,ADA,BNB&kind=news&page=1`;
      
      for (const proxy of proxies) {
        try {
          console.log(`🔄 Trying CryptoPanic via: ${proxy}`);
          const proxiedUrl = proxy + encodeURIComponent(apiUrl);
      
      const response = await fetch(proxiedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
            console.log(`❌ Proxy ${proxy} failed: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (!data.results || !Array.isArray(data.results)) {
            console.log(`❌ Invalid CryptoPanic response via ${proxy}`);
            continue;
          }
          
          const news = data.results.slice(0, 6).map((article: any) => ({
            title: decodeHtmlEntities(article.title || ''),
            source: article.source?.title || 'CryptoPanic',
            time: formatTimeAgo(new Date(article.published_at)),
            url: article.url
          }));
          
          console.log(`✅ CryptoPanic success via ${proxy}: ${news.length} articles`);
          return news;
          
        } catch (error) {
          console.log(`❌ Proxy ${proxy} error:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
      return null;
    };

    // Method 2: Try CoinTelegraph RSS (no API key needed)
    const tryFetchCoinTelegraph = async () => {
      const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
      ];
      
      const rssUrl = 'https://cointelegraph.com/rss/tag/bitcoin';
      
      for (const proxy of proxies) {
        try {
          console.log(`🔄 Trying CoinTelegraph RSS via: ${proxy}`);
          const proxiedUrl = proxy + encodeURIComponent(rssUrl);
          
          const response = await fetch(proxiedUrl);
          if (!response.ok) continue;
          
          const data = await response.json();
          const xmlText = data.contents || data;
          
          // Parse RSS XML
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const items = xmlDoc.querySelectorAll('item');
          
          if (items.length === 0) continue;
          
          const news = Array.from(items).slice(0, 6).map((item: any) => {
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            
            return {
              title: decodeHtmlEntities(title.replace(/<!\[CDATA\[|\]\]>/g, '')),
              source: 'CoinTelegraph',
              time: formatTimeAgo(new Date(pubDate)),
              url: link
            };
          });
          
          console.log(`✅ CoinTelegraph RSS success via ${proxy}: ${news.length} articles`);
          return news;
          
        } catch (error) {
          console.log(`❌ CoinTelegraph RSS via ${proxy} failed:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
      return null;
    };

    // Method 3: Try NewsAPI for crypto news
    const tryFetchNewsAPI = async () => {
      const apiKey = import.meta.env.VITE_NEWS_API_KEY;
      if (!apiKey || apiKey === 'demo') {
        console.log('❌ No NewsAPI key');
        return null;
      }

      const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
      ];
      
      const apiUrl = `https://newsapi.org/v2/everything?q=bitcoin+OR+ethereum+OR+cryptocurrency&sortBy=publishedAt&pageSize=6&apiKey=${apiKey}`;
      
      for (const proxy of proxies) {
        try {
          console.log(`🔄 Trying NewsAPI via: ${proxy}`);
          const proxiedUrl = proxy + encodeURIComponent(apiUrl);
          
          const response = await fetch(proxiedUrl);
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (!data.articles || !Array.isArray(data.articles)) continue;
          
          const news = data.articles.slice(0, 6).map((article: any) => ({
            title: decodeHtmlEntities(article.title || ''),
            source: article.source?.name || 'NewsAPI',
            time: formatTimeAgo(new Date(article.publishedAt)),
            url: article.url
          }));
          
          console.log(`✅ NewsAPI success via ${proxy}: ${news.length} articles`);
          return news;
          
        } catch (error) {
          console.log(`❌ NewsAPI via ${proxy} failed:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
      return null;
    };

    // Method 4: Try Alpha Vantage News (free tier)
    const tryFetchAlphaVantage = async () => {
      const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
      if (!apiKey || apiKey === 'demo') {
        console.log('❌ No Alpha Vantage API key');
        return null;
      }

      const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
      ];
      
      const apiUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=CRYPTO:BTC,CRYPTO:ETH&apikey=${apiKey}`;
      
      for (const proxy of proxies) {
        try {
          console.log(`🔄 Trying Alpha Vantage via: ${proxy}`);
          const proxiedUrl = proxy + encodeURIComponent(apiUrl);
          
          const response = await fetch(proxiedUrl);
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (!data.feed || !Array.isArray(data.feed)) continue;
          
          const news = data.feed.slice(0, 6).map((article: any) => ({
            title: decodeHtmlEntities(article.title || ''),
            source: article.source || 'Alpha Vantage',
            time: formatTimeAgo(new Date(article.time_published)),
            url: article.url
          }));
          
          console.log(`✅ Alpha Vantage success via ${proxy}: ${news.length} articles`);
          return news;
          
        } catch (error) {
          console.log(`❌ Alpha Vantage via ${proxy} failed:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
      return null;
    };

    // Try all methods aggressively
    const methods = [
      { name: 'CryptoPanic', fn: tryFetchCryptoPanic },
      { name: 'CoinTelegraph RSS', fn: tryFetchCoinTelegraph },
      { name: 'NewsAPI', fn: tryFetchNewsAPI },
      { name: 'Alpha Vantage', fn: tryFetchAlphaVantage },
    ];

    for (const method of methods) {
      try {
        console.log(`🚀 Attempting ${method.name}...`);
        const result = await method.fn();
        if (result && result.length > 0) {
          console.log(`🎉 SUCCESS! Got ${result.length} real news articles from ${method.name}`);
          setCryptoNews(result);
          return;
        }
      } catch (error) {
        console.log(`💥 ${method.name} completely failed:`, error);
        continue;
      }
    }

    // If absolutely everything fails, try one last desperate attempt
    console.log('🔥 ALL METHODS FAILED - Making final desperate attempt...');
    
    try {
      // Direct fetch to a simple crypto news RSS that might not have CORS restrictions
      const response = await fetch('https://feeds.feedburner.com/CoinDesk');
      if (response.ok) {
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');
        
        if (items.length > 0) {
                  const news = Array.from(items).slice(0, 6).map((item: any) => ({
          title: decodeHtmlEntities(item.querySelector('title')?.textContent?.replace(/<!\[CDATA\[|\]\]>/g, '') || ''),
          source: 'CoinDesk',
          time: formatTimeAgo(new Date(item.querySelector('pubDate')?.textContent || '')),
          url: item.querySelector('link')?.textContent || ''
        }));
          
          console.log(`🎉 DESPERATE SUCCESS! Got ${news.length} articles from CoinDesk RSS`);
          setCryptoNews(news);
          NewsCache.setCachedNews(news, 'CoinDesk');
          return;
        }
      }
    } catch (error) {
      console.log('💀 Even desperate attempt failed:', error);
    }

    console.log('😭 ABSOLUTE FAILURE - No real news could be fetched from any source');
    setCryptoNews([]);
  };

  // Fetch Fear & Greed Index (real data only)
  const fetchMarketSentiment = async () => {
    try {
      const response = await fetch('https://api.alternative.me/fng/');
      
      if (!response.ok) {
        console.error('Fear & Greed API request failed');
        setMarketSentiment(null);
        return;
      }
      
      const data = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].value) {
        console.error('Invalid Fear & Greed API response');
        setMarketSentiment(null);
        return;
      }
      
      const fearGreedValue = parseInt(data.data[0].value);
      const fearGreedText = data.data[0].value_classification || getFearGreedText(fearGreedValue);
      
      setMarketSentiment({
        overall: fearGreedValue > 50 ? "Bullish" : "Bearish",
        fearGreedIndex: fearGreedValue,
        fearGreedText: fearGreedText
      });
    } catch (error) {
      console.error('Error fetching market sentiment:', error);
      setMarketSentiment(null);
    }
  };

  // Helper functions
  const getIconForSymbol = (symbol: string): string => {
    const icons: Record<string, string> = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'SOL': '◎',
      'ADA': '₳',
      'BNB': 'B'
    };
    return icons[symbol] || symbol.slice(0, 2);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const decodeHtmlEntities = (text: string): string => {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  };

  const getFearGreedText = (value: number): string => {
    if (value > 75) return 'Extreme Greed';
    if (value > 55) return 'Greed';
    if (value > 45) return 'Neutral';
    if (value > 25) return 'Fear';
    return 'Extreme Fear';
  };

  // Fetch all real data
  const fetchAllData = async (forceRefresh: boolean = false) => {
    setLoading(true);
    
      await Promise.all([
        fetchCryptoPrices(),
      fetchCryptoNews(forceRefresh),
      fetchMarketSentiment()
      ]);
      
      setLastUpdated(new Date());
      setLoading(false);
  };

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Market Summary</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Real-time cryptocurrency prices and market news
            </p>
              {lastUpdated && (
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                <span>
                  News cache: {NewsCache.getCacheInfo().isValid 
                    ? `${NewsCache.getCacheInfo().age}min old (${NewsCache.getCacheInfo().count} articles)` 
                    : 'expired'}
                </span>
              </div>
              )}
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => fetchAllData(false)} 
              disabled={loading}
              variant="default"
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          <Button 
              onClick={() => fetchAllData(true)} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Force Refresh
          </Button>
          </div>
        </div>
      </div>

      {/* Crypto Prices - Only show if we have real data */}
      {cryptoPrices.length > 0 && (
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          {cryptoPrices.map((coin, index) => (
            <Card key={index} className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold">{coin.icon}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{coin.symbol}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{coin.name}</div>
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{coin.price}</div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center ${coin.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {coin.trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                    <span className="text-sm font-medium">{coin.change}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Vol: {coin.volume}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading state for prices */}
      {loading && cryptoPrices.length === 0 && (
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          {Array(5).fill(0).map((_, index) => (
            <Card key={index} className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mb-2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
                </div>
        )}

             {/* Market News - Only show if we have real data */}
       {cryptoNews.length > 0 && (
      <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700 mb-8">
           <CardHeader className="flex flex-row items-center justify-between pb-4">
             <CardTitle className="text-slate-900 dark:text-white text-xl font-bold">Latest Market News</CardTitle>
          <div className="flex items-center space-x-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Newspaper className="h-4 w-4 text-slate-500" />
               <span className="text-sm text-slate-500 font-medium">Live Feed</span>
          </div>
        </CardHeader>
           <CardContent className="pt-0">
             <div className="grid md:grid-cols-2 gap-4">
              {cryptoNews.map((news, index) => (
                 <a
                   key={index}
                   href={news.url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="group block p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all duration-200 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md"
                 >
                   <div className="flex items-start justify-between mb-3">
                     <div className="flex items-center space-x-2">
                       <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-md">
                         {news.source}
                  </div>
                       <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{news.time}</span>
                  </div>
                </div>
                   
                   <h3 className="font-semibold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3">
                     {news.title}
                   </h3>
                   
                   <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                     <span className="mr-2">Read more</span>
                     <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   </div>
                 </a>
              ))}
            </div>
        </CardContent>
      </Card>
       )}

      {/* Market Sentiment - Only show if we have real data */}
      {marketSentiment && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Overall Market Sentiment</div>
              <div className={`text-3xl font-bold mb-2 ${marketSentiment.overall === 'Bullish' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {marketSentiment.overall}
            </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Based on Fear & Greed Index
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Fear & Greed Index</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{marketSentiment.fearGreedIndex}</div>
              <Progress value={marketSentiment.fearGreedIndex} className="mb-2" />
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {marketSentiment.fearGreedText}
              </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* No data message */}
      {!loading && cryptoPrices.length === 0 && cryptoNews.length === 0 && !marketSentiment && (
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Market Data Unavailable
                </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Unable to fetch real market data at this time. Please try refreshing or check back later.
                </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}