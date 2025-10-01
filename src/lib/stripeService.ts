import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

export interface StripeSubscriptionData {
  subscriptionId: string;
  clientSecret: string;
}

export interface StripeCustomer {
  id: string;
  email: string;
}

// Stripe price IDs - these should match your Stripe dashboard
export const STRIPE_PRICE_IDS = {
  pro_monthly: 'price_1RnDcORYcgsHio0AkYwJwbos', // Replace with your actual Stripe price ID
  pro_yearly: 'price_1RnDcyRYcgsHio0AyFI0WPsD'   // Replace with your actual Stripe price ID
};

export class StripeService {
  private stripe: any = null;

  constructor() {
    this.initializeStripe();
  }

  private async initializeStripe() {
    if (stripePromise) {
      this.stripe = await stripePromise;
    }
  }

  /**
   * Create a setup intent for payment method collection (client-side)
   */
  async createSetupIntent(email: string): Promise<{ clientSecret: string; setupIntentId: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // For serverless, we'll create the setup intent directly using Stripe Elements
      // This requires the payment method to be collected first
      return {
        clientSecret: '', // Will be set when payment method is collected
        setupIntentId: ''  // Will be set when payment method is collected
      };
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  /**
   * Create a subscription using client-side Stripe APIs
   */
  async createSubscription(
    priceId: string,
    paymentMethodId: string
  ): Promise<StripeSubscriptionData> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // For serverless operation, we need to create the subscription directly
      // This would typically require a backend, but for demo purposes we'll simulate
      const mockSubscription = {
        subscriptionId: `sub_${Date.now()}`,
        clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`
      };

      // In a real implementation, you would need a backend endpoint for this
      // or use Stripe's serverless functions
      console.warn('Using mock subscription creation - needs backend for production');

      return mockSubscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Confirm a setup intent with payment method
   */
  async confirmSetupIntent(clientSecret: string, returnUrl?: string): Promise<{ setupIntent?: any; error?: any }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    return await this.stripe.confirmSetup({
      clientSecret,
      confirmParams: {
        return_url: returnUrl || `${window.location.origin}/register?step=account`,
      },
    });
  }

  /**
   * Cancel a subscription (client-side simulation)
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      // For serverless operation, this would need a backend endpoint
      console.warn('Using mock subscription cancellation - needs backend for production');
      console.log('Would cancel subscription:', subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription status (client-side simulation)
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      // For serverless operation, this would need a backend endpoint
      console.warn('Using mock subscription status - needs backend for production');
      return {
        id: subscriptionId,
        status: 'active',
        current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days from now
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
