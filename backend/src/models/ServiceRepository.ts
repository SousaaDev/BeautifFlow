import { Service } from './Service';

export interface ServiceRepository {
  create(service: Omit<Service, 'id' | 'createdAt'>): Promise<Service>;
  findById(id: string): Promise<Service | null>;
  findByTenant(tenantId: string): Promise<Service[]>;
  update(id: string, data: Partial<Service>): Promise<Service>;
  delete(id: string): Promise<void>;
  findByTenantAndId(tenantId: string, id: string): Promise<Service | null>;
}
