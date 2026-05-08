import { MembershipPlan } from './MembershipPlan';

export interface MembershipPlanRepository {
  create(plan: Omit<MembershipPlan, 'id' | 'createdAt'>): Promise<MembershipPlan>;
  findByTenant(tenantId: string): Promise<MembershipPlan[]>;
  findById(id: string): Promise<MembershipPlan | null>;
  update(id: string, plan: Partial<MembershipPlan>): Promise<MembershipPlan>;
}
