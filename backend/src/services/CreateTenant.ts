import { Tenant } from '../models/Tenant';
import { TenantRepository } from '../models/TenantRepository';

export class CreateTenant {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(tenantData: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
    // Business logic here, e.g., validate slug uniqueness
    const existing = await this.tenantRepository.findBySlug(tenantData.slug);
    if (existing) {
      throw new Error('Slug already exists');
    }

    return this.tenantRepository.create(tenantData);
  }
}