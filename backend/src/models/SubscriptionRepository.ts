import { Subscription, SubscriptionStatus } from './Subscription';

export interface SubscriptionFilters {
  tenantId: string;
  customerId?: string;
}

export interface SubscriptionRepository {
  create(subscription: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByExternalSubscriptionId(externalSubscriptionId: string): Promise<Subscription | null>;
  findByTenant(filters: SubscriptionFilters): Promise<Subscription[]>;
  findByTenantAndCustomer(tenantId: string, customerId: string): Promise<Subscription[]>;
  findActiveByCustomer(tenantId: string, customerId: string): Promise<Subscription | null>;
  findActiveByTenant(tenantId: string): Promise<Subscription | null>;
  update(id: string, data: Partial<Subscription>): Promise<Subscription>;
  delete(id: string): Promise<void>;
}
