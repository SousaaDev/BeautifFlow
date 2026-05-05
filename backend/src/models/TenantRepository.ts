import { Tenant } from './Tenant';

export interface TenantRepository {
  create(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant>;
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  update(id: string, tenant: Partial<Tenant>): Promise<Tenant>;
  delete(id: string): Promise<void>;
}