import { Request, Response } from 'express';
import { z } from 'zod';
import { stripe } from '../infrastructure/stripe';
import { pool } from '../database/connection';
import { UserRepositoryImpl } from '../models/UserRepositoryImpl';
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl';
import { SubscriptionRepositoryImpl } from '../models/SubscriptionRepositoryImpl';
import { MembershipPlanRepositoryImpl } from '../models/MembershipPlanRepositoryImpl';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { StripePaymentService } from '../services/StripePaymentService';

const userRepository = new UserRepositoryImpl(pool);
const tenantRepository = new TenantRepositoryImpl(pool);
const subscriptionRepository = new SubscriptionRepositoryImpl(pool);
const membershipPlanRepository = new MembershipPlanRepositoryImpl(pool);
const customerRepository = new CustomerRepositoryImpl(pool);
const stripePaymentService = new StripePaymentService();

const billingPlans = [
  {
    id: 'starter',
    name: 'BeautyFlow Completo',
    price: 49.9,
    interval: 'month',
    description: 'Todas as funcionalidades em um unico plano: agenda online, estoque, vendas, relatorios e suporte prioritario.',
    features: [
      'Profissionais ilimitados',
      'Agendamentos ilimitados',
      'Pagina de agendamento online',
      'Gestao de clientes e estoque',
      'Relatorios avancados',
      'Suporte prioritario',
    ],
    billingCycle: 'monthly',
  },
] as const;

type BillingPlan = (typeof billingPlans)[number];

const checkoutSchema = z.object({
  planId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const getOrCreateBillingPlan = async (
  tenantId: string,
  billingPlan: BillingPlan
) => {
  const existingPlans = await membershipPlanRepository.findByTenant(tenantId);
  const existing = existingPlans.find((plan) => plan.name === billingPlan.name);
  if (existing) {
    return existing;
  }

  return membershipPlanRepository.create({
    tenantId,
    name: billingPlan.name,
    description: billingPlan.description,
    price: billingPlan.price,
    billingCycle: billingPlan.billingCycle,
    servicesIncluded: [],
    isActive: true,
  });
};

const resolveBillingPlanId = async (
  tenantId: string,
  planId: string
) => {
  if (isUuid(planId)) {
    const plan = await membershipPlanRepository.findById(planId);
    if (plan) {
      return plan;
    }
  }

  const billingPlan = billingPlans.find((item) => item.id === planId);
  if (billingPlan) {
    return getOrCreateBillingPlan(tenantId, billingPlan);
  }

  const existingPlans = await membershipPlanRepository.findByTenant(tenantId);
  return existingPlans[0] ?? getOrCreateBillingPlan(tenantId, billingPlans[0]);
};

const getOrCreateBillingCustomer = async (
  tenantId: string,
  email: string,
  name: string
) => {
  const customers = await customerRepository.findAll({ tenantId, excludeBilling: false });
  const existingCustomer = customers.find(
    (customer) => customer.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingCustomer) {
    return existingCustomer;
  }

  return customerRepository.create({
    tenantId,
    name,
    email,
    phone: undefined,
    tags: ['billing'],
    lastVisit: undefined,
  });
};

const getOrCreateBillingCustomerFromStripe = async (
  tenantId: string,
  stripeCustomerId: string
) => {
  const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
  const email = (stripeCustomer as any).email as string | undefined;
  const name = (stripeCustomer as any).name as string | undefined;

  if (!email) {
    throw new Error('Stripe customer email required to create billing customer');
  }

  return getOrCreateBillingCustomer(tenantId, email, name || email);
};

const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

const getAuthTenant = async (req: Request) => {
  const auth = req as any;
  if (!auth.user?.tenantId) {
    throw new Error('Tenant not found in token');
  }

  const tenant = await tenantRepository.findById(auth.user.tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
};

const getAuthUser = async (req: Request) => {
  const auth = req as any;
  if (!auth.user?.userId) {
    throw new Error('User not found in token');
  }

  const user = await userRepository.findById(auth.user.userId);
  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const listBillingPlans = async (_req: Request, res: Response) => {
  res.json(billingPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    interval: plan.interval,
    description: plan.description,
    features: plan.features,
    stripePriceId: `${plan.id}_price`,
  })));
};

export const createBillingCheckout = async (req: Request, res: Response) => {
  try {
    const data = checkoutSchema.parse(req.body);
    const user = await getAuthUser(req);
    const tenant = await getAuthTenant(req);

    const plan = billingPlans.find((item) => item.id === data.planId);
    if (!plan) {
      return res.status(400).json({ error: 'Plano invalido' });
    }

    const membershipPlan = await resolveBillingPlanId(tenant.id, plan.id);

    const billingCustomer = await getOrCreateBillingCustomer(
      tenant.id,
      user.email,
      user.name || user.email
    );

    const stripeCustomerId = await stripePaymentService.getOrCreateStripeCustomer(
      billingCustomer.id,
      user.email,
      user.name || user.email
    );

    let existingSubscription = await subscriptionRepository.findActiveByCustomer(
      tenant.id,
      billingCustomer.id
    );

    if (existingSubscription && !existingSubscription.externalSubscriptionId) {
      const stripeSubscription = await stripePaymentService.findActiveStripeSubscriptionByCustomer(
        stripeCustomerId
      );

      if (stripeSubscription) {
        existingSubscription = await subscriptionRepository.update(
          existingSubscription.id,
          {
            externalSubscriptionId: stripeSubscription.id,
            planId:
              stripeSubscription.metadata?.planId ?? existingSubscription.planId,
            currentPeriodStart: new Date(
              stripeSubscription.current_period_start * 1000
            ),
            currentPeriodEnd: new Date(
              stripeSubscription.current_period_end * 1000
            ),
          }
        );
      } else {
        // Local subscription exists but Stripe cannot find the associated subscription.
        // Ignore the stale local record and continue to checkout to recover.
        existingSubscription = null;
      }
    }

    let stripeSubscription = null;
    if (!existingSubscription) {
      stripeSubscription = await stripePaymentService.findActiveStripeSubscriptionByCustomer(
        stripeCustomerId
      );
      if (stripeSubscription) {
        existingSubscription = await subscriptionRepository.findByExternalSubscriptionId(
          stripeSubscription.id
        );

        if (!existingSubscription) {
          const legacyPlanId = stripeSubscription.metadata?.planId;
          const subscriptionPlan = legacyPlanId
            ? await resolveBillingPlanId(tenant.id, legacyPlanId)
            : membershipPlan;

          existingSubscription = await subscriptionRepository.create({
            tenantId: tenant.id,
            customerId: billingCustomer.id,
            planId: subscriptionPlan.id,
            status: 'active',
            currentPeriodStart: new Date(
              stripeSubscription.current_period_start * 1000
            ),
            currentPeriodEnd: new Date(
              stripeSubscription.current_period_end * 1000
            ),
            externalSubscriptionId: stripeSubscription.id,
          });
        }
      }
    }

    if (existingSubscription) {
      if (existingSubscription.planId === membershipPlan.id) {
        return res.status(400).json({ error: 'Voce já está nesse plano' });
      }

      const externalSubscriptionId =
        existingSubscription.externalSubscriptionId || stripeSubscription?.id;

      if (!externalSubscriptionId) {
        // If we still don't have a Stripe subscription id, fallback to checkout
        existingSubscription = null;
      }
    }

    if (existingSubscription) {
      const updatedSubscription = await stripePaymentService.updateSubscriptionPlan(
        existingSubscription.externalSubscriptionId as string,
        {
          id: membershipPlan.id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          billingCycle: plan.billingCycle,
        }
      );

      await subscriptionRepository.update(existingSubscription.id, {
        planId: membershipPlan.id,
        currentPeriodStart: new Date(
          updatedSubscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          updatedSubscription.current_period_end * 1000
        ),
        status: 'active',
      });

      return res.json({
        planUpdated: true,
        message: 'Plano alterado com sucesso. A diferença será cobrada no ciclo atual.',
      });
    }

    const checkoutUrl = await stripePaymentService.createCheckoutSession({
      tenantId: tenant.id,
      customerId: billingCustomer.id,
      planId: membershipPlan.id,
      plan: {
        id: membershipPlan.id,
        name: membershipPlan.name,
        description: membershipPlan.description || plan.description,
        price: membershipPlan.price,
        billingCycle: membershipPlan.billingCycle,
      },
      customerEmail: user.email,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    });

    res.json({ checkoutUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Billing checkout error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar checkout' });
  }
};

export const verifyBillingPayment = async (req: Request, res: Response) => {
  try {
    const sessionId =
      (req.query.sessionId as string) || (req.query.session_id as string);
    if (!sessionId) {
      return res
        .status(400)
        .json({ error: 'sessionId or session_id is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const planId = session.metadata?.planId as string | undefined;
    const subscriptionStatus =
      typeof session.subscription === 'object' && session.subscription !== null
        ? (session.subscription as any).status
        : undefined;

    const success =
      session.payment_status === 'paid' ||
      session.status === 'complete' ||
      subscriptionStatus === 'active' ||
      subscriptionStatus === 'trialing';

    let localSuccess = success;

    if (success && session.subscription) {
      let stripeSubscription: any = session.subscription;
      if (typeof stripeSubscription === 'string') {
        stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscription);
      }

      const subscriptionData = await stripePaymentService.handleSubscriptionCreated(
        stripeSubscription
      );

      const resolvedPlan = await resolveBillingPlanId(
        subscriptionData.tenantId,
        subscriptionData.planId
      );

      let existingSubscription = await subscriptionRepository.findByExternalSubscriptionId(
        subscriptionData.externalSubscriptionId
      );

      if (!existingSubscription) {
        existingSubscription = await subscriptionRepository.findActiveByTenant(
          subscriptionData.tenantId
        );
      }

      if (!existingSubscription) {
        let customerId = subscriptionData.customerId;
        const customerExists = await customerRepository.findById(customerId);

        if (!customerExists) {
          const stripeCustomerId =
            typeof stripeSubscription.customer === 'string'
              ? stripeSubscription.customer
              : (stripeSubscription.customer as any)?.id;

          if (!stripeCustomerId) {
            throw new Error('Stripe customer ID not available for subscription to resolve billing customer');
          }

          const billingCustomer = await getOrCreateBillingCustomerFromStripe(
            subscriptionData.tenantId,
            stripeCustomerId
          );
          customerId = billingCustomer.id;
        }

        existingSubscription = await subscriptionRepository.create({
          tenantId: subscriptionData.tenantId,
          customerId,
          planId: resolvedPlan.id,
          status: 'active',
          currentPeriodStart: subscriptionData.currentPeriodStart,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
          externalSubscriptionId: subscriptionData.externalSubscriptionId,
        });
      } else {
        await subscriptionRepository.update(existingSubscription.id, {
          planId: resolvedPlan.id,
          status: 'active',
          currentPeriodStart: subscriptionData.currentPeriodStart,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
        });
      }
    }

    if (!localSuccess) {
      const tenantId = session.metadata?.tenantId as string | undefined;
      if (tenantId) {
        const activeSubscription = await subscriptionRepository.findActiveByTenant(tenantId);
        if (activeSubscription) {
          localSuccess = true;
        }
      }
    }

    res.json({
      success: localSuccess,
      plan: planId ?? null,
    });
  } catch (error) {
    console.error('Billing verify error:', error);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
};

export const createBillingPortal = async (req: Request, res: Response) => {
  try {
    const data = portalSchema.parse(req.body);
    const user = await getAuthUser(req);
    const tenant = await getAuthTenant(req);

    const billingCustomer = await getOrCreateBillingCustomer(
      tenant.id,
      user.email,
      user.name || user.email
    );

    const customerId = await stripePaymentService.getOrCreateStripeCustomer(
      billingCustomer.id,
      user.email,
      user.name || user.email
    );

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: data.returnUrl || process.env.FRONTEND_URL || 'http://localhost:3001/dashboard',
    });

    if (!session.url) {
      return res.status(500).json({ error: 'Falha ao criar portal de pagamento' });
    }

    res.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Billing portal error:', error);
    res.status(500).json({ error: 'Erro ao criar portal de pagamento' });
  }
};
