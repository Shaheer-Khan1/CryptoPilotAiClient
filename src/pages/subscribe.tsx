import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const SubscribeForm = ({ planType, setupIntentId }: { planType: string; setupIntentId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!stripe || !elements) {
      setLoading(false);
      return;
    }

    try {
      // Confirm the setup intent
      const { error: setupError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard`,
      },
    });

      if (setupError) {
        throw new Error(setupError.message);
      }

      // If setup is successful, confirm the subscription
      const token = await currentUser?.getIdToken();
      const response = await fetch("/api/confirm-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          setupIntentId,
          planType 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }

      toast({
        title: "Subscription Created",
        description: "Your subscription has been created successfully!",
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? "Processing..." : `Subscribe to ${planType.charAt(0).toUpperCase() + planType.slice(1)}`}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");
  const [planType, setPlanType] = useState("pro_monthly");
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Extract plan and period from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get("plan");
    const periodParam = urlParams.get("period");
    
    console.log("=== SUBSCRIBE PAGE DEBUG ===");
    console.log("URL params - plan:", planParam, "period:", periodParam);
    console.log("Current URL:", window.location.href);
    
    if (planParam === 'pro') {
      const finalPlanType = periodParam === 'yearly' ? 'pro_yearly' : 'pro_monthly';
      console.log("Setting planType to:", finalPlanType);
      setPlanType(finalPlanType);
      setBillingPeriod(periodParam === 'yearly' ? 'yearly' : 'monthly');
    } else {
      console.log("Setting planType to: starter");
      setPlanType('starter');
    }

    // Create subscription setup
    const createSubscription = async () => {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdToken();
        const finalPlanType = planParam === 'pro' ? (periodParam === 'yearly' ? 'pro_yearly' : 'pro_monthly') : 'starter';
        
        console.log("Sending to backend - planType:", finalPlanType);
        
        const response = await fetch("/api/create-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ planType: finalPlanType }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message);
        }

        // For free plan, redirect to dashboard
        if (data.clientSecret === null) {
          toast({
            title: "Subscription Created",
            description: "Your free subscription has been created!",
          });
          setLocation("/dashboard");
          return;
        }

        setClientSecret(data.clientSecret);
        setSetupIntentId(data.setupIntentId);
      } catch (error: any) {
        console.error("Subscription creation error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to create subscription",
          variant: "destructive",
        });
      }
    };

    createSubscription();
  }, [currentUser, toast, setLocation]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  const planDetails = {
    pro: { name: "Pro", price: "$29/month" },
    enterprise: { name: "Enterprise", price: "$99/month" }
  };

  const currentPlan = planDetails[planType as keyof typeof planDetails] || planDetails.pro;

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="max-w-md w-full space-y-8 p-8">
        <Card className="bg-surface/50 backdrop-blur-xl border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Subscribe to {currentPlan.name}</CardTitle>
            <p className="text-muted-foreground mt-2">{currentPlan.price}</p>
          </CardHeader>
          
          <CardContent>
            {!stripePromise ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">Stripe not configured</p>
                <p className="text-sm text-muted-foreground">Please add VITE_STRIPE_PUBLIC_KEY to enable payments</p>
              </div>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm planType={planType} setupIntentId={setupIntentId} />
              </Elements>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
