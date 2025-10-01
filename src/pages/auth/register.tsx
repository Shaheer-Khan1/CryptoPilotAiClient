import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { firestoreStorage } from "@/lib/firestoreStorage";
// Removed Stripe Elements; using Stripe Checkout/Payment Links

const PaymentForm = ({
  planType,
  setupIntentId,
  onSuccess,
  onFail,
  onSkipToFree,
  billingPeriod
}: {
  planType: string;
  setupIntentId: string;
  onSuccess: () => void;
  onFail: () => void;
  onSkipToFree: () => void;
  billingPeriod: 'monthly' | 'yearly';
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCheckoutRedirect = async () => {
    setLoading(true);
    try {
      // Use hardcoded Stripe Payment Links (as requested)
      const monthly = 'https://buy.stripe.com/test_eVq4gB56e4efbJVfu92oE03';
      const yearly = 'https://buy.stripe.com/test_7sY4gB9mu7qr9BN95L2oE01';
      const link = planType === 'pro' && (billingPeriod === 'yearly' ? yearly : monthly);
      if (!link) {
        toast({ title: 'Configuration missing', description: 'Set VITE_STRIPE_LINK_MONTHLY and VITE_STRIPE_LINK_YEARLY', variant: 'destructive' });
        setLoading(false);
        return;
      }
      window.location.href = link;
    } catch (error: any) {
      toast({ title: 'Checkout error', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button type="button" onClick={handleCheckoutRedirect} disabled={loading} className="w-full">
          {loading ? "Redirecting..." : `Continue to Stripe Checkout`}
        </Button>
      </div>
      <div className="text-center">
        <button type="button" className="text-sm text-muted-foreground underline" onClick={onSkipToFree}>
          Skip payment and use Free plan
        </button>
      </div>
    </div>
  );
};

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    plan: "starter"
  });
  const [loading, setLoading] = useState(false);
  // Check URL immediately to prevent flicker
  const urlParams = new URLSearchParams(window.location.search);
  const redirectStatus = urlParams.get("redirect_status");
  const returnedSetupIntentId = urlParams.get("setup_intent");
  const isReturningFromStripe = redirectStatus === 'succeeded' && returnedSetupIntentId;
  
  const [step, setStep] = useState<'payment' | 'account' | 'completing'>(
    isReturningFromStripe ? 'completing' : 'account'
  );
  const [clientSecret, setClientSecret] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");
  const { register, refreshUserData } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const PENDING_KEY = 'cp_pending_registration';

  const completeRegistration = async (dataOverride?: typeof formData) => {
    const data = dataOverride || formData;

    // Register the user first
    await register(data.email, data.password, data.username, data.plan);
    // No payment here; plan selection and Stripe checkout happen on /subscribe
  };

  // Extract plan from URL query parameters
  useEffect(() => {
    const planParam = urlParams.get("plan");
    const periodParam = urlParams.get("period");
    const stepParam = urlParams.get("step");
    const paid = urlParams.get("paid");
    
    if (planParam) {
      // Map the plan names correctly - for user creation, we only need 'starter' or 'pro'
      if (planParam === "starter") {
        setFormData(prev => ({ ...prev, plan: "starter" }));
      } else if (planParam === "pro") {
        setFormData(prev => ({ ...prev, plan: "pro" })); // Just 'pro', not 'pro_monthly'/'pro_yearly'
      }
    }
    if (periodParam === 'yearly') {
      setBillingPeriod('yearly');
    }

    // Handle Stripe Payment Link return (serverless)
    // If user returned with paid=success, upgrade plan locally now
    if (paid === 'success') {
      setFormData(prev => ({ ...prev, plan: 'pro' }));
      toast({ title: 'Payment confirmed', description: 'Upgrading your account to Pro…' });
      (async () => {
        try {
          // If the user is already logged in, update plan. Otherwise, it will be set after register
          await refreshUserData();
          // If logged-in user exists after refresh, go to dashboard
          if (auth.currentUser) {
            setLocation('/dashboard');
          }
        } catch {}
      })();
    }
    // Handle Stripe redirect results
    if (redirectStatus === 'succeeded' && returnedSetupIntentId) {
      setSetupIntentId(returnedSetupIntentId);
      // Clean URL noise
      const u = new URL(window.location.href);
      u.searchParams.delete('redirect_status');
      u.searchParams.delete('setup_intent');
      u.searchParams.delete('setup_intent_client_secret');
      u.searchParams.set('step', 'completing');
      window.history.replaceState({}, '', u.toString());
      
      // Restore pending form data and auto-complete registration
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          setFormData(parsed);
          setLoading(true);
          (async () => {
            try {
              await completeRegistration(parsed);
              await refreshUserData(); // Refresh to get updated plan
              toast({ title: 'Account created!', description: 'Welcome to CryptoPilot Pro.' });
              localStorage.removeItem(PENDING_KEY);
              setLocation('/dashboard');
            } catch (err: any) {
              toast({ title: 'Registration failed', description: err.message || 'Please try again.', variant: 'destructive' });
              setStep('account');
              setLoading(false);
            }
          })();
        } catch {
          setStep('account');
          toast({ title: 'Error', description: 'Failed to restore registration data.', variant: 'destructive' });
        }
      } else {
        setStep('account');
        toast({ title: 'Payment method saved', description: 'Finish creating your account.' });
      }
    } else if (redirectStatus && redirectStatus !== 'succeeded') {
      // Clear payment data on failed payment
      setSetupIntentId('');
      setClientSecret('');
      // Fallback to free on failed or incomplete states
      setFormData(prev => ({ ...prev, plan: 'starter' }));
      setStep('account');
      const u = new URL(window.location.href);
      u.searchParams.delete('redirect_status');
      u.searchParams.delete('setup_intent');
      u.searchParams.delete('setup_intent_client_secret');
      u.searchParams.set('step', 'account');
      u.searchParams.set('plan', 'starter');
      window.history.replaceState({}, '', u.toString());
      localStorage.removeItem(PENDING_KEY); // Clear cached registration data
      toast({ title: 'Payment failed', description: 'Continuing with Free plan.', variant: 'destructive' });
    } else if (stepParam === 'account') {
      setStep('account');
    }
  }, []);

  // Create setup intent for payment when step changes to payment
  useEffect(() => {
    if (step === 'payment' && formData.plan !== 'starter') {
      const createSetupIntent = async () => {
        try {
          // For serverless operation, we'll handle payment method collection
          // directly in the PaymentForm component using Stripe Elements
          console.log("Payment method collection will be handled by Stripe Elements");
          setStep('payment');
        } catch (error: any) {
          console.error("Error in payment setup:", error);
          toast({
            title: "Setup Failed",
            description: error.message,
            variant: "destructive",
          });
          // Fall back to account step if setup fails
          setStep('account');
        }
      };

      createSetupIntent();
    }
  }, [step, formData.plan, formData.email, billingPeriod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form first
      if (!formData.username || !formData.email || !formData.password) {
        toast({
          title: "Missing information",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await completeRegistration();
      localStorage.removeItem(PENDING_KEY);
      
      // Refresh user data to ensure plan is up-to-date
      await refreshUserData();

      // If returning with paid=success, enforce Pro plan in Firestore and auto-login redirect
      const url = new URL(window.location.href);
      const paid = url.searchParams.get('paid');
      const periodParam = url.searchParams.get('period');
      if (paid === 'success' && auth.currentUser) {
        try {
          const user = await firestoreStorage.getUserByFirebaseUid(auth.currentUser.uid);
          if (user && user.plan !== 'pro') {
            await firestoreStorage.updateUserPlan(user.id, 'pro');
          }
        } catch {}
      }
      
      toast({
        title: "Account created!",
        description: "Welcome to CryptoPilot AI. Your account has been created successfully.",
      });

      // After registration, go to plan selection page
      setLocation("/subscribe");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const planDetails = {
    starter: { name: "Free Tier", price: "Free" },
    pro: { name: "CryptoPilot Pro", price: billingPeriod === 'yearly' ? "$499/year" : "$69/month" },
  } as const;

  const currentPlan = planDetails[formData.plan as keyof typeof planDetails] || planDetails.starter;

  // Show completing screen when processing after payment
  if (step === 'completing') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="max-w-md w-full space-y-8 p-8">
          <Card className="bg-surface/50 backdrop-blur-xl border-slate-700">
            <CardContent className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Creating Your Account</h3>
              <p className="text-muted-foreground">
                Payment successful! Setting up your CryptoPilot Pro account...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'payment' && formData.plan !== 'starter') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="max-w-md w-full space-y-8 p-8">
          <Card className="bg-surface/50 backdrop-blur-xl border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Complete Your Payment</CardTitle>
              <p className="text-muted-foreground mt-2">
                {currentPlan.name} Plan - {currentPlan.price}
              </p>
            </CardHeader>
            
            <CardContent>
              {formData.plan !== 'starter' && loading ? (
                <div className="text-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Setting up payment...</p>
                </div>
              ) : (
                <PaymentForm
                  planType={formData.plan}
                  setupIntentId={setupIntentId}
                  onSuccess={() => setStep('account')}
                  onFail={() => {
                    // fallback: switch to free plan and continue
                    setFormData(prev => ({ ...prev, plan: 'starter' }));
                    setStep('account');
                  }}
                  onSkipToFree={() => {
                    setFormData(prev => ({ ...prev, plan: 'starter' }));
                    setStep('account');
                  }}
                  billingPeriod={billingPeriod}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="max-w-md w-full space-y-8 p-8">
        <Card className="bg-surface/50 backdrop-blur-xl border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Create Your Account</CardTitle>
            <p className="text-muted-foreground mt-2">
              {currentPlan.name} Plan - {currentPlan.price}
            </p>
          </CardHeader>
          
          <CardContent>
            {/* Plan Selection */}
            <div className="mb-6">
              <div className="flex justify-center mb-3">
                <div className="inline-flex items-center bg-white/10 rounded-full shadow px-2 py-1">
                  <button
                    className={`px-4 py-2 rounded-full font-semibold transition-colors ${billingPeriod === 'monthly' ? 'bg-orange-500 text-white' : 'text-slate-700 dark:text-slate-200'}`}
                    onClick={() => {
                      setBillingPeriod('monthly');
                      const u = new URL(window.location.href);
                      u.searchParams.set('period', 'monthly');
                      window.history.replaceState({}, '', u.toString());
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    className={`px-4 py-2 rounded-full font-semibold transition-colors ${billingPeriod === 'yearly' ? 'bg-orange-500 text-white' : 'text-slate-700 dark:text-slate-200'}`}
                    onClick={() => {
                      setBillingPeriod('yearly');
                      const u = new URL(window.location.href);
                      u.searchParams.set('period', 'yearly');
                      window.history.replaceState({}, '', u.toString());
                    }}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, plan: 'starter' }));
                    setStep('account');
                    const u = new URL(window.location.href);
                    u.searchParams.set('plan', 'starter');
                    window.history.replaceState({}, '', u.toString());
                  }}
                  className={`p-4 rounded-lg border text-left ${formData.plan === 'starter' ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-600'}`}
                >
                  <div className="font-semibold">Free Tier</div>
                  <div className="text-sm text-muted-foreground">Market Feed, 1 signal/day, 1 portfolio scan, 1 bot</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, plan: 'pro' }));
                    // Clear any previous payment data when switching to Pro
                    setSetupIntentId('');
                    setClientSecret('');
                    const u = new URL(window.location.href);
                    u.searchParams.set('plan', 'pro');
                    window.history.replaceState({}, '', u.toString());
                  }}
                  className={`p-4 rounded-lg border text-left ${formData.plan === 'pro' ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-600'}`}
                >
                  <div className="font-semibold">CryptoPilot Pro</div>
                  <div className="text-sm text-muted-foreground">Full market feed, unlimited signals, weekly reports, unlimited bots</div>
                  <div className="text-sm mt-1">{billingPeriod === 'yearly' ? '$499/year' : '$69/month'}</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-muted-foreground">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                  className="mt-2 bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600 focus:border-primary"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="mt-2 bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600 focus:border-primary"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="mt-2 bg-white dark:bg-slate-800 text-black dark:text-white border-slate-300 dark:border-slate-600 focus:border-primary"
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full py-3 font-semibold">
                {loading
                  ? (formData.plan === 'pro' && !setupIntentId ? "Continuing..." : "Creating Account...")
                  : (formData.plan === 'pro' && !setupIntentId ? "Next" : "Create Account")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
