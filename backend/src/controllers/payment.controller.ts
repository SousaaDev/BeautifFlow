import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { MembershipPlanRepositoryImpl } from '../models/MembershipPlanRepositoryImpl';
import { SubscriptionRepositoryImpl } from '../models/SubscriptionRepositoryImpl';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { StripePaymentService } from '../services/StripePaymentService';

const membershipPlanRepository = new MembershipPlanRepositoryImpl(pool);
const subscriptionRepository = new SubscriptionRepositoryImpl(pool);
const customerRepository = new CustomerRepositoryImpl(pool);
const stripePaymentService = new StripePaymentService();

const createCheckoutSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

/**
 * Create checkout session for subscription
 * POST /api/tenants/:tenantId/payments/checkout
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const data = createCheckoutSchema.parse(req.body);

    // Verify customer exists
    const customer = await customerRepository.findById(data.customerId);
    if (!customer || customer.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!customer.email) {
      return res.status(400).json({ error: 'Customer email is required for payment' });
    }

    // Verify plan exists
    const plan = await membershipPlanRepository.findById(data.planId);
    if (!plan || plan.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Membership plan not found' });
    }

    // Check if customer already has active subscription
    const existingSubscription = await subscriptionRepository.findActiveByCustomer(
      tenantId,
      data.customerId
    );
    if (existingSubscription) {
      return res.status(409).json({
        error: 'Customer already has an active subscription',
        subscriptionId: existingSubscription.id,
      });
    }

    // Create checkout session
    const checkoutUrl = await stripePaymentService.createCheckoutSession({
      tenantId,
      customerId: data.customerId,
      planId: data.planId,
      plan,
      customerEmail: customer.email,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    });

    res.json({
      checkoutUrl,
      message: 'Checkout session created',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

/**
 * Handle Stripe webhooks
 * POST /api/payments/webhooks/stripe
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // Verify and parse the event
    const event = stripePaymentService.verifyWebhookSignature(
      req.body,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'customer.subscription.created': {
        const stripeSubscription = event.data.object;
        const subscriptionData = await stripePaymentService.handleSubscriptionCreated(
          stripeSubscription
        );

        // Create subscription in our database
        const subscription = await subscriptionRepository.create({
          tenantId: subscriptionData.tenantId,
          customerId: subscriptionData.customerId,
          planId: subscriptionData.planId,
          status: 'active',
          currentPeriodStart: subscriptionData.currentPeriodStart,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
          externalSubscriptionId: subscriptionData.externalSubscriptionId,
        });

        console.log('Subscription created:', subscription.id);
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object;
        const updateData = await stripePaymentService.handleSubscriptionUpdated(
          stripeSubscription
        );

        const tenantId = stripeSubscription.metadata?.tenantId as string | undefined;
        if (!tenantId) {
          break;
        }

        const subscriptions = await subscriptionRepository.findByTenant({
          tenantId,
        });

        const existingSubscription = subscriptions.find(
          sub => sub.externalSubscriptionId === updateData.externalSubscriptionId
        );

        if (existingSubscription) {
          await subscriptionRepository.update(existingSubscription.id, {
            status: updateData.status,
            currentPeriodEnd: updateData.currentPeriodEnd,
          });
          console.log('Subscription updated:', existingSubscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object;
        const tenantId = stripeSubscription.metadata?.tenantId as string | undefined;
        if (!tenantId) {
          break;
        }

        const subscriptions = await subscriptionRepository.findByTenant({
          tenantId,
        });

        const existingSubscription = subscriptions.find(
          sub => sub.externalSubscriptionId === stripeSubscription.id
        );

        if (existingSubscription) {
          await subscriptionRepository.update(existingSubscription.id, {
            status: 'cancelled',
          });
          console.log('Subscription cancelled:', existingSubscription.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed for invoice:', invoice.id);
        // Could trigger notifications, retry logic, etc.
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
};
