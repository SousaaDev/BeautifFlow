import { stripe } from '../infrastructure/stripe';
import { MembershipPlan } from '../models/MembershipPlan';
import { Subscription } from '../models/Subscription';

export type CheckoutPlanInfo = Pick<
  MembershipPlan,
  'id' | 'name' | 'description' | 'price' | 'billingCycle'
>;

export interface CreateCheckoutSessionParams {
  tenantId: string;
  customerId: string;
  planId: string;
  plan: CheckoutPlanInfo;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeSubscriptionMetadata {
  tenantId: string;
  customerId: string;
  planId: string;
  [key: string]: any;
}

export class StripePaymentService {
  /**
   * Create or get Stripe customer
   */
  async getOrCreateStripeCustomer(
    externalCustomerId: string,
    email: string,
    name: string
  ): Promise<string> {
    // Check if customer already exists (by metadata)
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        externalCustomerId,
      },
    });

    return customer.id;
  }

  /**
   * Create Stripe product if not exists
   */
  async getOrCreateStripeProduct(plan: CheckoutPlanInfo): Promise<string> {
    // Check if product exists by metadata
    const products = await stripe.products.search({
      query: `metadata['planId']:'${plan.id}'`,
    });

    if (products.data.length > 0) {
      return products.data[0].id;
    }

    // Create new product
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        planId: plan.id,
        billingCycle: plan.billingCycle,
      },
    });

    return product.id;
  }

  /**
   * Create Stripe price for a product
   */
  async getOrCreateStripePrice(
    product: string,
    plan: CheckoutPlanInfo
  ): Promise<string> {
    // Check if price exists
    const prices = await stripe.prices.list({
      product,
      limit: 1,
    });

    if (prices.data.length > 0 && prices.data[0].active) {
      return prices.data[0].id;
    }

    // Create new price
    const interval = plan.billingCycle === 'monthly' ? 'month' : 'year';
    const price = await stripe.prices.create({
      product,
      unit_amount: Math.round(plan.price * 100), // Convert to cents
      currency: 'brl', // Brazilian Real
      recurring: {
        interval,
      },
    });

    return price.id;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<string> {
    const {
      tenantId,
      customerId,
      planId,
      plan,
      customerEmail,
      successUrl,
      cancelUrl,
    } = params;

    // Get or create Stripe customer
    const stripeCustomer = await this.getOrCreateStripeCustomer(
      customerId,
      customerEmail,
      `Customer-${customerId.substring(0, 8)}`
    );

    // Get or create product
    const stripeProduct = await this.getOrCreateStripeProduct(plan);

    // Get or create price
    const stripePrice = await this.getOrCreateStripePrice(
      stripeProduct,
      plan
    );

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer,
      line_items: [
        {
          price: stripePrice,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          tenantId,
          customerId,
          planId,
        } as StripeSubscriptionMetadata,
      },
      metadata: {
        tenantId,
        customerId,
        planId,
      },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return session.url;
  }

  async findActiveStripeSubscriptionByCustomer(
    stripeCustomerId: string
  ): Promise<any | null> {
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      expand: ['data.items.data.price'],
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find((subscription) =>
      ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(
        subscription.status
      ) && subscription.cancel_at_period_end !== true
    );

    return activeSubscription || null;
  }

  async updateSubscriptionPlan(
    externalSubscriptionId: string,
    plan: CheckoutPlanInfo
  ): Promise<any> {
    const stripeSubscription = await stripe.subscriptions.retrieve(
      externalSubscriptionId,
      {
        expand: ['items.data.price'],
      }
    );

    const subscriptionItem = stripeSubscription.items?.data?.[0];
    if (!subscriptionItem) {
      throw new Error('Subscription item not found');
    }

    const stripeProduct = await this.getOrCreateStripeProduct(plan);
    const stripePrice = await this.getOrCreateStripePrice(stripeProduct, plan);

    if (subscriptionItem.price.id === stripePrice) {
      return stripeSubscription;
    }

    const updatedSubscription = await stripe.subscriptions.update(
      externalSubscriptionId,
      {
        items: [
          {
            id: subscriptionItem.id,
            price: stripePrice,
          },
        ],
        proration_behavior: 'create_prorations',
      }
    );

    return updatedSubscription;
  }

  /**
   * Handle successful payment webhook
   */
  async handleSubscriptionCreated(stripeSubscription: any): Promise<{
    tenantId: string;
    customerId: string;
    planId: string;
    externalSubscriptionId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }> {
    const metadata = stripeSubscription.metadata as StripeSubscriptionMetadata;
    const currentPeriodStart = new Date(
      stripeSubscription.current_period_start * 1000
    );
    const currentPeriodEnd = new Date(
      stripeSubscription.current_period_end * 1000
    );

    return {
      tenantId: metadata.tenantId,
      customerId: metadata.customerId,
      planId: metadata.planId,
      externalSubscriptionId: stripeSubscription.id,
      currentPeriodStart,
      currentPeriodEnd,
    };
  }

  /**
   * Handle subscription update (e.g., payment failed)
   */
  async handleSubscriptionUpdated(stripeSubscription: any): Promise<{
    externalSubscriptionId: string;
    status: 'active' | 'cancelled' | 'paused' | 'expired';
    currentPeriodEnd: Date;
  }> {
    const statusMap: {
      [key: string]: 'active' | 'cancelled' | 'paused' | 'expired';
    } = {
      active: 'active',
      past_due: 'paused',
      unpaid: 'paused',
      canceled: 'cancelled',
      incomplete: 'paused',
      incomplete_expired: 'expired',
    };

    return {
      externalSubscriptionId: stripeSubscription.id,
      status: statusMap[stripeSubscription.status] || 'paused',
      currentPeriodEnd: new Date(
        stripeSubscription.current_period_end * 1000
      ),
    };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    body: string,
    signature: string,
    webhookSecret: string
  ): any {
    try {
      return stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error}`);
    }
  }
}
