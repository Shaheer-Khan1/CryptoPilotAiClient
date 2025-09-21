import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, Lock, Star, RefreshCw, Loader2 } from "lucide-react";

// Types
interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

interface TradingSignal {
  symbol: string;
  signal: string;
  confidence: number;
  price: number;
  change24h: number;
  reasoning?: string;
}

export default function Signals() {
  const { userData } = useAuth();
  const isFreeTier = !userData?.plan || userData?.plan === "starter";

  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
      return formattedData;
    } catch (error) {
      console.error('Error fetching market data:', error);
      return [];
    }
  };

  // Generate multiple AI trading signals
  const generateTradingSignals = async (marketData: MarketData[]) => {
    if (marketData.length === 0) return;
    
    try {
      // Get coins based on user tier and current signals
      const currentSymbols = signals.map(s => s.symbol);
      const availableCoins = marketData.filter(coin => 
        coin.volume24h > 0 && !currentSymbols.includes(coin.symbol)
      );
      
      const sortedCoins = availableCoins
        .sort((a, b) => {
          const aScore = Math.abs(a.change24h) * (a.volume24h / a.marketCap);
          const bScore = Math.abs(b.change24h) * (b.volume24h / b.marketCap);
          return bScore - aScore;
        })
        .slice(0, isFreeTier ? 1 : 3);

      if (sortedCoins.length === 0) return;

      const signalPromises = sortedCoins.map(async (coin) => {
        try {
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
                
                return {
                  symbol: coin.symbol,
                  signal: analysis.signal,
                  confidence: Math.min(95, Math.max(60, analysis.confidence)),
                  price: coin.price,
                  change24h: coin.change24h,
                  reasoning: analysis.reasoning
                };
              }
            } catch (parseError) {
              console.error('Error parsing AI response:', parseError);
            }
          }
          
          // Fallback to technical analysis if AI fails
          let signal = 'HOLD';
          let confidence = 65;
          let reasoning = 'Technical analysis based on price and volume data';
          
          const volumeRatio = coin.volume24h / coin.marketCap;
          const absChange = Math.abs(coin.change24h);
          
          if (coin.change24h > 8 && volumeRatio > 0.1) {
            signal = 'STRONG BUY';
            confidence = Math.min(90, 75 + absChange);
            reasoning = 'Strong bullish momentum with high volume confirmation';
          } else if (coin.change24h > 4 && volumeRatio > 0.05) {
            signal = 'BUY';
            confidence = Math.min(85, 65 + absChange);
            reasoning = 'Positive price momentum with good volume support';
          } else if (coin.change24h < -8 && volumeRatio > 0.1) {
            signal = 'STRONG SELL';
            confidence = Math.min(90, 75 + absChange);
            reasoning = 'Strong bearish pressure with high volume';
          } else if (coin.change24h < -4 && volumeRatio > 0.05) {
            signal = 'SELL';
            confidence = Math.min(85, 65 + absChange);
            reasoning = 'Negative momentum with volume confirmation';
          }
          
          return {
            symbol: coin.symbol,
            signal,
            confidence: Math.round(confidence),
            price: coin.price,
            change24h: coin.change24h,
            reasoning
          };
          
        } catch (error) {
          console.error(`Error generating signal for ${coin.symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(signalPromises);
      const validSignals = results.filter(signal => signal !== null) as TradingSignal[];
      
      // For Pro users, append new signals; for free users, replace
      if (isFreeTier) {
        setSignals(validSignals);
      } else {
        setSignals(prev => [...prev, ...validSignals]);
      }
      
    } catch (error) {
      console.error('Error generating trading signals:', error);
      setSignals([]);
    }
  };

  // Load all data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const marketData = await fetchMarketData();
      await generateTradingSignals(marketData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadAllData();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return '$' + (value / 1e3).toFixed(2) + 'K';
    return '$' + value.toFixed(2);
  };

  const getSignalColor = (signal: string) => {
    if (signal.includes('BUY')) return 'bg-green-500';
    if (signal.includes('SELL')) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getSignalIcon = (symbol: string) => {
    const icons: { [key: string]: string } = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'BNB': '⚡',
      'XRP': '✦',
      'ADA': '₳',
      'SOL': '◎',
      'DOT': '●',
      'DOGE': '🐕',
      'AVAX': '▲',
      'MATIC': '⬟'
    };
    return icons[symbol] || symbol.slice(0, 2);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Trading Signals</h1>
          <div className="flex space-x-2">
            <Button
              onClick={loadAllData}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            {!isFreeTier && (
              <Button
                onClick={() => generateTradingSignals(marketData)}
                disabled={isLoading || marketData.length === 0}
                variant="default"
                size="sm"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                Generate More Signals
              </Button>
            )}
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">Real-time AI-powered trading signals and market analysis</p>
        {lastUpdated && (
          <p className="text-xs text-slate-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        {isFreeTier && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <span className="text-amber-800 dark:text-amber-200 font-medium">
                Free Tier: 1 real-time signal per day. Upgrade to Pro for unlimited AI-ranked signals.
              </span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
            <p className="text-slate-600 dark:text-slate-400">Analyzing market data and generating AI signals...</p>
          </CardContent>
        </Card>
      ) : (
        /* Real AI Trading Signals */
      <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-white">Real-Time AI Trading Signals</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-500 font-medium">Live Analysis</span>
            </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
              {signals.length > 0 ? (
                signals.map((signal, index) => (
              <div key={index} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 ${getSignalColor(signal.signal)} rounded-full flex items-center justify-center`}>
                          <span className="text-white font-bold">{getSignalIcon(signal.symbol)}</span>
                    </div>
                    <div>
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{signal.symbol}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                              variant={signal.signal.includes('BUY') ? 'default' : 
                                      signal.signal.includes('SELL') ? 'destructive' : 
                                  'secondary'}
                        >
                              {signal.signal}
                        </Badge>
                            {signal.change24h > 0 && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
                            {signal.change24h < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
                            {signal.change24h === 0 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(signal.price)}</div>
                        <div className={`text-sm font-medium ${signal.change24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {signal.change24h >= 0 ? '+' : ''}{signal.change24h.toFixed(2)}%
                        </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">AI Confidence</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{signal.confidence}%</span>
                      </div>
                      <Progress value={signal.confidence} className="h-3" />
                    </div>
                    
                    <p className="text-slate-700 dark:text-slate-300 text-sm">
                      {signal.reasoning || 'Based on real-time market data and technical analysis'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-600 dark:text-slate-400">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No trading signals available. Market data may be temporarily unavailable.</p>
                </div>
              )}
              
              {isFreeTier && signals.length > 0 && (
              <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                <Lock className="mx-auto h-12 w-12 text-amber-600 mb-4" />
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Unlimited Signals Available
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mb-4">
                    Upgrade to Pro to generate unlimited real-time AI trading signals with detailed analysis.
                </p>
                <Button>
                  <Star className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </div>
            )}
              
              {!isFreeTier && signals.length > 0 && (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                  <Star className="mx-auto h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    Pro Plan Active
                  </h3>
                  <p className="text-green-700 dark:text-green-300 mb-4">
                    You have unlimited access to AI trading signals. Generate as many as you want!
                  </p>
                  <Button
                    onClick={() => generateTradingSignals(marketData)}
                    disabled={isLoading || marketData.length === 0}
                    variant="default"
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Generate More Signals
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
} 