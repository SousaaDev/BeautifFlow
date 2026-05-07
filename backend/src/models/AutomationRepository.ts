import { Automation } from './Automation';

export interface AutomationRepository {
  create(automation: Omit<Automation, 'id' | 'createdAt'>): Promise<Automation>;
  findById(id: string): Promise<Automation | null>;
  findByTenant(tenantId: string): Promise<Automation[]>;
  findActiveByTrigger(tenantId: string, trigger: string): Promise<Automation[]>;
  update(id: string, automation: Partial<Automation>): Promise<Automation>;
  delete(id: string): Promise<void>;
}
