import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY not configured');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15',
});

export const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
