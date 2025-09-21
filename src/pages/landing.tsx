import { Link } from "wouter";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, PieChart, Signal, BarChart3, Shield, Gem, Bot, Check, ArrowRight, Star, Zap } from "lucide-react";
import { useState } from "react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const proPrice = billingPeriod === 'yearly' ? '$499' : '$69';
  const proPeriod = billingPeriod === 'yearly' ? '/year' : '/month';
  const proButton = billingPeriod === 'yearly' ? 'Start Yearly Pro' : 'Start Pro Trial';

  const detailedFeatures = [
    {
      icon: BarChart3,
      title: "Real-time Market Analysis",
      description: "Advanced machine learning models process thousands of data points every second to identify profitable trading opportunities.",
      items: [
        "Technical indicator analysis",
        "Market sentiment monitoring", 
        "Volume and liquidity assessment"
      ],
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "AI Risk Management",
      description: "Intelligent risk assessment and portfolio protection to safeguard your investments in volatile markets.",
      items: [
        "Automated stop-loss suggestions",
        "Portfolio diversification alerts",
        "Risk scoring algorithms"
      ],
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Gem,
      title: "Predictive Analytics",
      description: "Machine learning models trained on historical data to forecast price movements and market trends.",
      items: [
        "Price prediction models",
        "Trend forecasting",
        "Market cycle analysis"
      ],
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: Bot,
      title: "Automated Trading Bots",
      description: "AI-powered trading bots that execute strategies 24/7 based on your preferences and risk tolerance.",
      items: [
        "Custom strategy builder",
        "24/7 market monitoring",
        "Performance optimization"
      ],
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const plans = [
    {
      name: "Free Tier",
      price: "Free",
      description: "For getting started with basic AI tools",
      features: [
        "Market Feed (Last 24H only)",
        "1 Altcoin Signal per Day",
        "1 Portfolio Scan",
        "Access to AI Bot Builder (1 bot, no deploy)"
      ],
      buttonText: "Get Started",
      popular: false
    },
    {
      name: "CryptoPilot Pro",
      price: proPrice,
      period: proPeriod,
      description: "Full access for serious traders and automation",
      features: [
        "Full Market Feed with Daily Digests",
        "Unlimited Altcoin Signals + AI-ranked coins",
        "Weekly Portfolio Analysis with Downloadable Reports",
        "Unlimited Bot Builders (with Telegram/Discord Deployment)",
        "Early access to future features (e.g., NFT screener, DEX automation)"
      ],
      buttonText: proButton,
      popular: true
    },
    // Removed Enterprise plan as per new requirements
  ];

  const handlePlanSelect = (planName: string) => {
    if (!currentUser) {
      if (planName === "Free Tier") {
        setLocation(`/register?plan=starter`);
      } else if (planName === "CryptoPilot Pro") {
        setLocation(`/register?plan=pro&period=${billingPeriod}`);
      }
    } else {
      if (planName === "Free Tier") {
        setLocation("/dashboard");
      } else if (planName === "CryptoPilot Pro") {
        setLocation(`/subscribe?plan=pro&period=${billingPeriod}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-orange-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full px-6 py-3 mb-8">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">Trusted by 10,000+ traders worldwide</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                CRYPTOPILOT
              </span>
              <br />
              <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                AI
              </span>
            </h1>
            
            <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
              CRYPTO ON AUTOPILOT
            </p>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Transform your cryptocurrency trading with AI-powered insights, automated strategies, and real-time market analysis.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/register">
                <Button size="lg" className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-2xl shadow-orange-500/25">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-12 py-6 text-lg font-semibold bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/20"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">10K+</div>
              <div className="text-slate-600 dark:text-slate-400">Active Traders</div>
            </div>
            <div>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">$2.5B+</div>
              <div className="text-slate-600 dark:text-slate-400">Trading Volume</div>
            </div>
            <div>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">98.7%</div>
              <div className="text-slate-600 dark:text-slate-400">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">24/7</div>
              <div className="text-slate-600 dark:text-slate-400">AI Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview - Bento Box Style */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-6 text-slate-900 dark:text-white">
              AI-Powered Trading
              <span className="block bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Advanced algorithms working around the clock to maximize your crypto investments
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group hover:scale-105 transition-all duration-300 bg-white dark:bg-slate-900 border-0 shadow-xl hover:shadow-2xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Brain className="text-white h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Smart Analysis</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Real-time market insights powered by machine learning algorithms that never sleep.</p>
              </CardContent>
            </Card>
            
            <Card className="group hover:scale-105 transition-all duration-300 bg-white dark:bg-slate-900 border-0 shadow-xl hover:shadow-2xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <PieChart className="text-white h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Portfolio Optimization</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Automated rebalancing and risk management to protect and grow your investments.</p>
              </CardContent>
            </Card>
            
            <Card className="group hover:scale-105 transition-all duration-300 bg-white dark:bg-slate-900 border-0 shadow-xl hover:shadow-2xl">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Signal className="text-white h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Instant Signals</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Get notified of high-probability trading opportunities the moment they appear.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Detailed Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black mb-6 text-slate-900 dark:text-white">
              Everything You Need to
              <span className="block bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Dominate Crypto
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Comprehensive AI tools designed to give you the edge in cryptocurrency trading
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {detailedFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="group bg-white dark:bg-slate-800 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform`}>
                        <Icon className="text-white h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{feature.description}</p>
                    <ul className="space-y-3">
                      {feature.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-center text-slate-700 dark:text-slate-300">
                          <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mr-3"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black mb-6 text-slate-900 dark:text-white">
              Simple, Transparent
              <span className="block bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Pricing
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">Choose the plan that fits your trading style</p>
            <div className="flex justify-center mt-8">
              <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-full shadow px-2 py-1">
                <button
                  className={`px-4 py-2 rounded-full font-semibold transition-colors ${billingPeriod === 'monthly' ? 'bg-orange-500 text-white' : 'text-slate-700 dark:text-slate-200'}`}
                  onClick={() => setBillingPeriod('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-4 py-2 rounded-full font-semibold transition-colors ${billingPeriod === 'yearly' ? 'bg-orange-500 text-white' : 'text-slate-700 dark:text-slate-200'}`}
                  onClick={() => setBillingPeriod('yearly')}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={plan.name} 
                className={`relative bg-white dark:bg-slate-900 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden w-full max-w-sm ${plan.popular ? "scale-105 ring-4 ring-orange-500/20" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-3 font-semibold">
                    <Zap className="inline w-4 h-4 mr-2" />
                    Most Popular
                  </div>
                )}
                
                <CardContent className={`p-8 ${plan.popular ? "pt-20" : ""}`}>
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="text-5xl font-black mb-2 text-slate-900 dark:text-white">
                      {plan.price}
                      {plan.period && <span className="text-xl text-slate-500 dark:text-slate-400">{plan.period}</span>}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{plan.description}</p>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-slate-700 dark:text-slate-300">
                        <Check className="text-green-500 mr-3 h-5 w-5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full py-4 text-lg font-semibold ${
                      plan.popular 
                        ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-xl shadow-orange-500/25" 
                        : "bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
                    }`}
                    onClick={() => handlePlanSelect(plan.name)}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
