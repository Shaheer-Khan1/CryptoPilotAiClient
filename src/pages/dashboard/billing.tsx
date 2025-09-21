import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Edit, TrendingUp, Video, Bot, BarChart3, Calendar, Download, AlertCircle, CheckCircle, Crown, Loader2 } from "lucide-react";

export default function Billing() {
  const { userData, currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [usageData, setUsageData] = useState({
    shortsGenerated: 0,
    chatbotsCreated: 0,
    analysisReports: 0,
    signalsGenerated: 0
  });
  const [billingHistory, setBillingHistory] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);

  const isFreeTier = !userData?.plan || userData?.plan === "starter";
  const isPro = userData?.plan === "pro";

  // Load usage data
  useEffect(() => {
    const loadUsageData = () => {
      // Get usage from localStorage (in a real app, this would come from your API)
      const shorts = parseInt(localStorage.getItem('shortsGenerated') || '0');
      const bots = parseInt(localStorage.getItem('chatbotsCreated') || '0');
      const analyses = parseInt(localStorage.getItem('analysisReports') || '0');
      const signals = parseInt(localStorage.getItem('signalsGenerated') || '0');
      
      setUsageData({
        shortsGenerated: shorts,
        chatbotsCreated: bots,
        analysisReports: analyses,
        signalsGenerated: signals
      });
    };

    loadUsageData();
    // Refresh usage data every 30 seconds
    const interval = setInterval(loadUsageData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch billing history
  const fetchBillingHistory = async () => {
    if (!currentUser || !isPro) return;
    
    setBillingLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/billing-history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBillingHistory(data.invoices || []);
      } else {
        console.error("Failed to fetch billing history");
        setBillingHistory([]);
      }
    } catch (error) {
      console.error("Error fetching billing history:", error);
      setBillingHistory([]);
    } finally {
      setBillingLoading(false);
    }
  };

  // Load billing history when component mounts and user is Pro
  useEffect(() => {
    if (isPro) {
      fetchBillingHistory();
    }
  }, [isPro, currentUser]);


  const handleCancelSubscription = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      await apiRequest("POST", "/api/cancel-subscription", {}, {
        Authorization: `Bearer ${token}`,
      });
      
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Dynamic billing data
  const getNextBillingDate = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return nextMonth.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const billingInfo = {
    nextBillingDate: isFreeTier ? "No billing cycle" : getNextBillingDate(),
    amount: isPro ? "$69.00/month" : "Free",
    paymentMethod: {
      type: "Visa",
      last4: isPro ? "4242" : null,
      expiry: "12/25"
    }
  };

  // Usage limits based on plan
  const limits = {
    shorts: isFreeTier ? 3 : 999,
    chatbots: isFreeTier ? 1 : 999,
    analyses: isFreeTier ? 5 : 999,
    signals: isFreeTier ? 10 : 999
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods</p>
      </div>

      {/* Usage Statistics */}
      <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Current Month Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Shorts Generated */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Shorts Generated</span>
                </div>
                <Badge variant={usageData.shortsGenerated >= limits.shorts ? "destructive" : "secondary"}>
                  {usageData.shortsGenerated}/{limits.shorts === 999 ? "∞" : limits.shorts}
                </Badge>
              </div>
              <Progress 
                value={limits.shorts === 999 ? 20 : (usageData.shortsGenerated / limits.shorts) * 100} 
                className="h-2" 
              />
            </div>

            {/* Chatbots Created */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Chatbots</span>
                </div>
                <Badge variant={usageData.chatbotsCreated >= limits.chatbots ? "destructive" : "secondary"}>
                  {usageData.chatbotsCreated}/{limits.chatbots === 999 ? "∞" : limits.chatbots}
                </Badge>
              </div>
              <Progress 
                value={limits.chatbots === 999 ? 15 : (usageData.chatbotsCreated / limits.chatbots) * 100} 
                className="h-2" 
              />
            </div>

            {/* Analysis Reports */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">AI Analysis</span>
                </div>
                <Badge variant={usageData.analysisReports >= limits.analyses ? "destructive" : "secondary"}>
                  {usageData.analysisReports}/{limits.analyses === 999 ? "∞" : limits.analyses}
                </Badge>
              </div>
              <Progress 
                value={limits.analyses === 999 ? 30 : (usageData.analysisReports / limits.analyses) * 100} 
                className="h-2" 
              />
            </div>

            {/* Signals Generated */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Signals</span>
                </div>
                <Badge variant={usageData.signalsGenerated >= limits.signals ? "destructive" : "secondary"}>
                  {usageData.signalsGenerated}/{limits.signals === 999 ? "∞" : limits.signals}
                </Badge>
              </div>
              <Progress 
                value={limits.signals === 999 ? 25 : (usageData.signalsGenerated / limits.signals) * 100} 
                className="h-2" 
              />
            </div>
          </div>
          
          {isFreeTier && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">Free Plan Limitations</span>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You're on the free plan with monthly usage limits. Visit the Subscribe page to upgrade to Pro for unlimited access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Plan */}
      <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700 mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-white">Current Plan</CardTitle>
            <Badge className="bg-primary">
              {userData?.plan?.charAt(0).toUpperCase() + userData?.plan?.slice(1) || "Starter"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-slate-600 dark:text-slate-400 mb-2">Next billing date</p>
              <p className="font-semibold text-slate-900 dark:text-white">{billingInfo.nextBillingDate}</p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400 mb-2">Amount</p>
              <p className="font-semibold text-slate-900 dark:text-white">{billingInfo.amount}</p>
            </div>
          </div>
          
          
          <div className="flex space-x-4">
            {!isFreeTier && (
              <Button 
                variant="outline" 
                onClick={handleCancelSubscription}
                disabled={loading}
              >
                {loading ? "Canceling..." : "Cancel Subscription"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-8 w-8 text-blue-500" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">**** **** **** {billingInfo.paymentMethod.last4}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {billingInfo.paymentMethod.type} expires {billingInfo.paymentMethod.expiry}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button variant="outline">Add Payment Method</Button>
            </>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
              <p className="text-slate-600 dark:text-slate-400">You're on the free plan. Visit the Subscribe page to upgrade to Pro and add payment methods.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card className="bg-white/90 dark:bg-surface/50 backdrop-blur-xl border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="space-y-4">
              {billingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading billing history...</span>
                </div>
              ) : billingHistory.length > 0 ? (
                billingHistory.map((invoice: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{invoice.date}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{invoice.description}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold text-slate-900 dark:text-white">{invoice.amount}</span>
                      <Badge 
                        variant="outline" 
                        className={invoice.status === "Paid" 
                          ? "text-green-600 dark:text-green-400 border-green-600 dark:border-green-400"
                          : invoice.status === "Pending"
                          ? "text-yellow-600 dark:text-yellow-400 border-yellow-600 dark:border-yellow-400"
                          : "text-red-600 dark:text-red-400 border-red-600 dark:border-red-400"
                        }
                      >
                        <CheckCircle className={`h-3 w-3 mr-1 ${
                          invoice.status === "Paid" ? "text-green-500" : 
                          invoice.status === "Pending" ? "text-yellow-500" : 
                          "text-red-500"
                        }`} />
                        {invoice.status}
                      </Badge>
                      {invoice.downloadUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(invoice.downloadUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Billing History</h3>
                  <p className="text-slate-600 dark:text-slate-400">No invoices found for your account.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Billing History</h3>
              <p className="text-slate-600 dark:text-slate-400">You're on the free plan. Visit the Subscribe page to upgrade to Pro and see billing history.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
