export interface MembershipServiceIncluded {
  serviceId: string;
  monthlyLimit: number;
}

export interface MembershipPlan {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  servicesIncluded: MembershipServiceIncluded[];
  isActive: boolean;
  createdAt: Date;
}
