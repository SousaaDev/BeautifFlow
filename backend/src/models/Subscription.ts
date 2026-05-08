export type SubscriptionStatus = 'active' | 'cancelled' | 'paused' | 'expired';

export interface Subscription {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  externalSubscriptionId?: string;
  createdAt: Date;
}
