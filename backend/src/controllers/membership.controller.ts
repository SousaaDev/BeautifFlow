import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { MembershipPlanRepositoryImpl } from '../models/MembershipPlanRepositoryImpl';
import { SubscriptionRepositoryImpl } from '../models/SubscriptionRepositoryImpl';
import { MembershipPlan } from '../models/MembershipPlan';
import { SubscriptionStatus } from '../models/Subscription';

const membershipPlanRepository = new MembershipPlanRepositoryImpl(pool);
const subscriptionRepository = new SubscriptionRepositoryImpl(pool);

const createPlanSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number().positive(),
  billingCycle: z.enum(['monthly', 'yearly']),
  servicesIncluded: z.array(
    z.object({
      serviceId: z.string().uuid(),
      monthlyLimit: z.number().int().nonnegative(),
    })
  ).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  externalSubscriptionId: z.string().optional(),
});

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(['active', 'cancelled', 'paused', 'expired']).optional(),
  externalSubscriptionId: z.string().optional(),
});

const calculatePeriodDates = (billingCycle: 'monthly' | 'yearly') => {
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  
  if (billingCycle === 'monthly') {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  } else {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  }

  return { currentPeriodStart, currentPeriodEnd };
};

export const listMembershipPlans = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const plans = await membershipPlanRepository.findByTenant(tenantId);
    res.json(plans);
  } catch (error) {
    console.error('Error listing membership plans:', error);
    res.status(500).json({ error: 'Failed to list membership plans' });
  }
};

export const createMembershipPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const data = createPlanSchema.parse(req.body);

    const plan: Omit<MembershipPlan, 'id' | 'createdAt'> = {
      tenantId,
      name: data.name,
      description: data.description,
      price: data.price,
      billingCycle: data.billingCycle,
      servicesIncluded: data.servicesIncluded,
      isActive: data.isActive,
    };

    const createdPlan = await membershipPlanRepository.create(plan);
    res.status(201).json({ message: 'Membership plan created', plan: createdPlan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating membership plan:', error);
    res.status(500).json({ error: 'Failed to create membership plan' });
  }
};

export const listSubscriptions = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const customerId = req.query.customerId as string | undefined;
    const subscriptions = await subscriptionRepository.findByTenant({ tenantId, customerId });
    res.json(subscriptions);
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    res.status(500).json({ error: 'Failed to list subscriptions' });
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const data = createSubscriptionSchema.parse(req.body);

    const plan = await membershipPlanRepository.findById(data.planId);
    if (!plan || plan.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Membership plan not found for this tenant' });
    }

    const { currentPeriodStart, currentPeriodEnd } = calculatePeriodDates(plan.billingCycle);

    const subscription = await subscriptionRepository.create({
      tenantId,
      customerId: data.customerId,
      planId: data.planId,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
      externalSubscriptionId: data.externalSubscriptionId,
    });

    res.status(201).json({ message: 'Subscription created', subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const subscriptionId = req.params.id;
    const data = updateSubscriptionSchema.parse(req.body);

    const existingSubscription = await subscriptionRepository.findById(subscriptionId);
    if (!existingSubscription || existingSubscription.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const updateData: any = {};

    if (data.planId && data.planId !== existingSubscription.planId) {
      const plan = await membershipPlanRepository.findById(data.planId);
      if (!plan || plan.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Membership plan not found for this tenant' });
      }
      const { currentPeriodStart, currentPeriodEnd } = calculatePeriodDates(plan.billingCycle);
      updateData.planId = data.planId;
      updateData.currentPeriodStart = currentPeriodStart;
      updateData.currentPeriodEnd = currentPeriodEnd;
      updateData.status = 'active';
    }

    if (data.status) {
      updateData.status = data.status as SubscriptionStatus;
    }

    if (data.externalSubscriptionId !== undefined) {
      updateData.externalSubscriptionId = data.externalSubscriptionId;
    }

    const subscription = await subscriptionRepository.update(subscriptionId, updateData);
    res.json({ message: 'Subscription updated', subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};
