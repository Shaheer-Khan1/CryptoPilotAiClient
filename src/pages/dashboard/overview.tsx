import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  ArrowUpDown, 
  RefreshCw,
  Star,
  Newspaper,
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";
import Moralis from 'moralis';
import { NewsCache } from '@/lib/newsCache';

// Types
interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

interface NewsItem {
  title: string;
  source: string;
  time: string;
  url: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalChange: number;
  ethBalance: number;
  topAsset: {
    symbol: string;
    value: number;
    change: number;
  };
}

interface TradingSignal {
  symbol: string;
  signal: string;
  confidence: number;
  price: number;
  change24h: number;
}

export default function DashboardOverview() {
  const { userData } = useAuth();
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  // Initialize Moralis
  const initializeMoralis = async () => {
    if (!Moralis.Core.isStarted) {
      await Moralis.start({
        apiKey: import.meta.env.VITE_MORALIS_API_KEY || "YOUR_MORALIS_API_KEY_HERE"
      });
    }
  };

  // Fetch market data from CoinGecko
  const fetchMarketData = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h'
      );
      const data = await response.json();
      
      const formattedData: MarketData[] = data.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume
      }));
      
      setMarketData(formattedData);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  // Aggressive news fetching with multiple APIs and CORS proxies with 6-hour caching
  const fetchNews = async (forceRefresh: boolean = false) => {
    try {
      // Check cache first (unless forced refresh)
      if (!forceRefresh && NewsCache.isCacheValid()) {
        const cachedNews = NewsCache.getCachedNews();
        if (cachedNews.length > 0) {
          console.log(`📋 Using cached news data (${cachedNews.length} articles)`);
          setNews(cachedNews);
          return;
        }
      }

      console.log('🔄 Fetching fresh news data...');
      
      // Strategy 1: CryptoPanic with multiple CORS proxies
      const corsProxies = [
        'https://allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-anywhere.herokuapp.com/'
      ];

      for (const proxy of corsProxies) {
        try {
          const cryptoPanicUrl = `https://cryptopanic.com/api/free/v1/posts/?auth_token=${import.meta.env.VITE_CRYPTOPANIC_API_KEY || 'demo'}&public=true&kind=news&currencies=BTC,ETH&regions=en`;
          const response = await fetch(`${proxy}${encodeURIComponent(cryptoPanicUrl)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const news = data.results.slice(0, 6).map((article: any) => ({
                title: decodeHtmlEntities(article.title || ''),
                source: article.source?.title || 'CryptoPanic',
                time: formatTimeAgo(new Date(article.published_at)),
                url: article.url
              }));
              
              setNews(news);
              NewsCache.setCachedNews(news, 'CryptoPanic');
              return;
            }
          }
        } catch (proxyError) {
          console.log(`CryptoPanic proxy ${proxy} failed:`, proxyError);
          continue;
        }
      }

      // Strategy 2: CoinTelegraph RSS with CORS proxies
      for (const proxy of corsProxies) {
        try {
          const rssUrl = 'https://cointelegraph.com/rss';
          const response = await fetch(`${proxy}${encodeURIComponent(rssUrl)}`);
          
          if (response.ok) {
            const rssText = await response.text();
            const parser = new DOMParser();
            const rssDoc = parser.parseFromString(rssText, 'text/xml');
            const items = rssDoc.querySelectorAll('item');
            
            if (items.length > 0) {
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
                
                setNews(news);
                NewsCache.setCachedNews(news, 'CoinTelegraph');
                return;
            }
          }
        } catch (proxyError) {
          console.log(`CoinTelegraph RSS proxy ${proxy} failed:`, proxyError);
          continue;
        }
      }

      // Strategy 3: NewsAPI with CORS proxy
      for (const proxy of corsProxies.slice(0, 2)) {
        try {
          const newsApiUrl = `https://newsapi.org/v2/everything?q=bitcoin OR ethereum OR crypto&sortBy=publishedAt&pageSize=6&apiKey=${import.meta.env.VITE_NEWS_API_KEY || 'demo'}`;
          const response = await fetch(`${proxy}${encodeURIComponent(newsApiUrl)}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.articles && data.articles.length > 0) {
              const news = data.articles.slice(0, 6).map((article: any) => ({
                title: decodeHtmlEntities(article.title || ''),
                source: article.source?.name || 'NewsAPI',
                time: formatTimeAgo(new Date(article.publishedAt)),
                url: article.url
              }));
              
              setNews(news);
              NewsCache.setCachedNews(news, 'NewsAPI');
              return;
            }
          }
        } catch (proxyError) {
          console.log(`NewsAPI proxy ${proxy} failed:`, proxyError);
          continue;
        }
      }

      // Strategy 4: Alpha Vantage News
      for (const proxy of corsProxies.slice(0, 2)) {
        try {
          const alphaUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=CRYPTO:BTC,CRYPTO:ETH&sort=LATEST&limit=6&apikey=${import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'demo'}`;
          const response = await fetch(`${proxy}${encodeURIComponent(alphaUrl)}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.feed && data.feed.length > 0) {
              const news = data.feed.slice(0, 6).map((article: any) => ({
                title: decodeHtmlEntities(article.title || ''),
                source: article.source || 'Alpha Vantage',
                time: formatTimeAgo(new Date(article.time_published)),
                url: article.url
              }));
              
              setNews(news);
              NewsCache.setCachedNews(news, 'Alpha Vantage');
              return;
            }
          }
        } catch (proxyError) {
          console.log(`Alpha Vantage proxy ${proxy} failed:`, proxyError);
          continue;
        }
      }

      // Fallback: CoinDesk RSS
      try {
        const rssUrl = 'https://coindesk.com/arc/outboundfeeds/rss/';
        const response = await fetch(`https://allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`);
        
        if (response.ok) {
          const rssText = await response.text();
          const parser = new DOMParser();
          const rssDoc = parser.parseFromString(rssText, 'text/xml');
          const items = rssDoc.querySelectorAll('item');
          
          if (items.length > 0) {
            const news = Array.from(items).slice(0, 6).map((item: any) => ({
              title: decodeHtmlEntities(item.querySelector('title')?.textContent?.replace(/<!\[CDATA\[|\]\]>/g, '') || ''),
              source: 'CoinDesk',
              time: formatTimeAgo(new Date(item.querySelector('pubDate')?.textContent || '')),
              url: item.querySelector('link')?.textContent || ''
            }));
            
            setNews(news);
            NewsCache.setCachedNews(news, 'CoinDesk');
            return;
          }
        }
      } catch (fallbackError) {
        console.log('CoinDesk RSS fallback failed:', fallbackError);
      }

      console.log('All news sources failed');
      setNews([]);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error('News fetch error:', error.message);
      } else {
        console.error('Unknown news fetch error:', error);
      }
      setNews([]);
    }
  };

  // Fetch portfolio data
  const fetchPortfolioData = async () => {
    try {
      await initializeMoralis();
      
      // Only fetch if wallet is actually connected
      const walletAddress = localStorage.getItem('connectedWallet');
      if (!walletAddress) {
        setPortfolio(null);
        return;
      }
      
      // Get ETH balance
      const nativeBalance = await Moralis.EvmApi.balance.getNativeBalance({
        chain: "0xaa36a7", // Sepolia testnet
        address: walletAddress
      });
      
      const ethBalance = parseFloat(nativeBalance.raw.balance) / Math.pow(10, 18);
      
      // Calculate portfolio value (using ETH price from market data)
      const ethPrice = marketData.find(coin => coin.symbol === 'ETH')?.price || 0;
      const portfolioValue = ethBalance * ethPrice;
      
      // Find top asset
      let topAsset = {
        symbol: 'ETH',
        value: portfolioValue,
        change: marketData.find(coin => coin.symbol === 'ETH')?.change24h || 0
      };
      
      setPortfolio({
        totalValue: portfolioValue,
        totalChange: topAsset.change,
        ethBalance,
        topAsset
      });
      
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setPortfolio(null); // Don't show fake data
    }
  };

  // Generate AI trading signal based on real market analysis
  const generateTradingSignal = async () => {
    if (marketData.length === 0) return;
    
    try {
      // Find the most interesting coin based on volume and price change
      const sortedCoins = marketData
        .filter(coin => coin.volume24h > 0) // Only coins with real volume
        .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
        .slice(0, 1); // Take only the most volatile
      
      if (sortedCoins.length === 0) return;
      
      const coin = sortedCoins[0];
      
      // Use Gemini AI to generate real analysis
      const prompt = `
Analyze ${coin.name} (${coin.symbol}) with current data:
- Price: $${coin.price}
- 24h Change: ${coin.change24h}%
- Market Cap: $${coin.marketCap.toLocaleString()}
- Volume: $${coin.volume24h.toLocaleString()}

Provide trading signal analysis in this JSON format:
{
  "signal": "[BUY/SELL/HOLD]",
  "confidence": [number 60-95],
  "reasoning": "[brief technical reasoning based on the data]"
}

Base your analysis on:
1. Price momentum and volume correlation
2. Market cap stability
3. Current market conditions
4. Technical indicators from the 24h change

Be realistic and conservative. Only suggest BUY/SELL if there's strong conviction.
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            
            setSignals([{
              symbol: coin.symbol,
              signal: analysis.signal,
              confidence: Math.min(95, Math.max(60, analysis.confidence)),
              price: coin.price,
              change24h: coin.change24h
            }]);
            return;
          }
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
        }
      }
      
      // Fallback to simple technical analysis if AI fails
      let signal = 'HOLD';
      let confidence = 65;
      
      // Volume-weighted price analysis
      const volumeRatio = coin.volume24h / coin.marketCap;
      const absChange = Math.abs(coin.change24h);
      
      if (coin.change24h > 8 && volumeRatio > 0.1) {
        signal = 'STRONG BUY';
        confidence = Math.min(90, 75 + absChange);
      } else if (coin.change24h > 4 && volumeRatio > 0.05) {
        signal = 'BUY';
        confidence = Math.min(85, 65 + absChange);
      } else if (coin.change24h < -8 && volumeRatio > 0.1) {
        signal = 'STRONG SELL';
        confidence = Math.min(90, 75 + absChange);
      } else if (coin.change24h < -4 && volumeRatio > 0.05) {
        signal = 'SELL';
        confidence = Math.min(85, 65 + absChange);
      }
      
      setSignals([{
        symbol: coin.symbol,
        signal,
        confidence: Math.round(confidence),
        price: coin.price,
        change24h: coin.change24h
      }]);
      
    } catch (error) {
      console.error('Error generating trading signal:', error);
      setSignals([]); // Don't show fake signals
    }
  };

  // Load all data
  const loadAllData = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMarketData(),
        fetchNews(forceRefresh),
        fetchPortfolioData()
      ]);
      await generateTradingSignal();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate signal when market data changes
  useEffect(() => {
    if (marketData.length > 0) {
      generateTradingSignal();
    }
  }, [marketData]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return value.toFixed(2);
  };



  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <div className="flex space-x-2">
            <Button
              onClick={() => loadAllData(false)}
              variant="default"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              onClick={() => loadAllData(true)}
              variant="outline"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Force Refresh
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Welcome back, {userData?.username}!</p>
          {lastUpdated && (
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <span>
                News cache: {NewsCache.getCacheInfo().isValid 
                  ? `${NewsCache.getCacheInfo().age}min old (${NewsCache.getCacheInfo().count} articles)` 
                  : 'expired'}
              </span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading real-time data...</span>
        </div>
      ) : (
        <>
      {/* Stats Cards */}
          <div className="grid md:grid-cols-1 gap-6 mb-8 max-w-sm">
            <Card className="bg-white dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Market Trend</span>
                  <ArrowUpDown className="text-primary h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">
                  {marketData.length > 0 
                    ? (marketData.filter(coin => coin.change24h > 0).length > marketData.length / 2 ? 'Bullish' : 'Bearish')
                    : '--'
                  }
                </div>
                <div className="text-sm text-secondary">
                  {marketData.length > 0 
                    ? `${marketData.filter(coin => coin.change24h > 0).length}/${marketData.length} positive`
                    : '--'
                  }
                </div>
              </CardContent>
            </Card>
      </div>

          {/* Module Status */}
          <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Module Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <a href="/dashboard/analysis" className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Market Summary Feed</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Live prices + news</div>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">Ready</Badge>
                </a>
                <a href="/dashboard/signals" className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Altcoin Screener & Signals</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">AI-ranked signals</div>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">Ready</Badge>
                </a>
                <a href="/dashboard/portfolio" className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Portfolio Analyzer</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Wallet connect + AI</div>
                  </div>
                  <Badge variant="outline">WIP</Badge>
                </a>
                <a href="/dashboard/chatbot-builder" className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">AI Chatbot Builder</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Upload/URL → Bot</div>
                  </div>
                  <Badge variant="outline">WIP</Badge>
                </a>
                <a href="/dashboard/shorts-generator" className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between md:col-span-2">
                  <div>
                    <div className="font-semibold">Shorts Generator</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Script → Video → YouTube</div>
                  </div>
                  <Badge variant="outline">WIP</Badge>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Market Overview */}
            <Card className="bg-white dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Overview
                </CardTitle>
          </CardHeader>
          <CardContent>
                <div className="space-y-4">
                  {marketData.slice(0, 5).map((coin, index) => (
                    <div key={coin.symbol} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{coin.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="font-semibold">{coin.symbol}</div>
                          <div className="text-sm text-muted-foreground">{coin.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(coin.price)}</div>
                        <div className={`text-sm ${coin.change24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

            {/* AI Trading Signals */}
            <Card className="bg-white dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Trading Signals
                </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                   {signals.length > 0 ? (
                     signals.map((signal, index) => (
                       <div key={signal.symbol} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                         <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center space-x-3">
                             <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                               <span className="text-white font-bold text-sm">{signal.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                               <span className="font-semibold text-lg">{signal.symbol}</span>
                               <Badge 
                                 className="ml-2"
                                 variant={signal.signal.includes('BUY') ? 'default' : 
                                         signal.signal.includes('SELL') ? 'destructive' : 'secondary'}
                               >
                                 {signal.signal}
                               </Badge>
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="font-semibold text-lg">{formatCurrency(signal.price)}</div>
                             <div className={`text-sm font-medium ${signal.change24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                               {signal.change24h >= 0 ? '+' : ''}{signal.change24h.toFixed(2)}%
                             </div>
                           </div>
                         </div>
                         <div className="mb-2">
                           <div className="flex items-center justify-between mb-1">
                             <span className="text-sm text-muted-foreground">AI Confidence</span>
                             <span className="text-sm font-semibold">{signal.confidence}%</span>
                           </div>
                           <Progress value={signal.confidence} className="h-3" />
                         </div>
                         <div className="text-sm text-muted-foreground">
                           Based on real-time market data and volume analysis
                    </div>
                  </div>
                     ))
                   ) : (
                     <div className="p-6 text-center text-muted-foreground">
                       <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                       <p>Analyzing market data...</p>
                     </div>
                   )}
                 </div>
               </CardContent>
            </Card>
          </div>

          {/* Latest News - Only show if we have real data */}
          {news.length > 0 && (
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
                  {news.map((newsItem, index) => (
                    <a
                      key={index}
                      href={newsItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all duration-200 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-md">
                            {newsItem.source}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{newsItem.time}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3">
                        {newsItem.title}
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
        </>
      )}
    </div>
  );
}
