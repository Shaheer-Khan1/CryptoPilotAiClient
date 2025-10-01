import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"

// Hardcoded Stripe Payment Links (test mode) provided by user
const STRIPE_LINKS = {
  monthly: "https://buy.stripe.com/test_eVq4gB56e4efbJVfu92oE03",
  yearly: "https://buy.stripe.com/test_7sY4gB9mu7qr9BN95L2oE01",
} as const

export default function Subscribe() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const { currentUser } = useAuth()

  useEffect(() => {
    if (!currentUser) {
      setLocation('/login')
    }
  }, [currentUser])

  const handleFree = () => {
    toast({ title: 'Free plan activated', description: 'Welcome to the Starter plan.' })
    setLocation('/dashboard')
  }

  const handlePro = () => {
    const link = billingPeriod === 'yearly' ? STRIPE_LINKS.yearly : STRIPE_LINKS.monthly
    window.location.href = link
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="max-w-md w-full space-y-8 p-8">
        <Card className="bg-surface/50 backdrop-blur-xl border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Choose Your Plan</CardTitle>
            <div className="flex justify-center mt-4">
              <div className="inline-flex items-center bg-white/10 rounded-full shadow px-2 py-1">
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
          </CardHeader>

          <CardContent>
            <div className="grid gap-4">
              <Button variant="outline" className="w-full" onClick={handleFree}>
                Continue with Free Plan
              </Button>
              <Button className="w-full" onClick={handlePro}>
                Upgrade to Pro ({billingPeriod === 'yearly' ? '$499/year' : '$69/month'})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
