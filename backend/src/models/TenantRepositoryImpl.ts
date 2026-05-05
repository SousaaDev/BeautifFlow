import { Pool } from 'pg';
import { Tenant } from './Tenant';
import { TenantRepository } from './TenantRepository';

export class TenantRepositoryImpl implements TenantRepository {
  constructor(private pool: Pool) {}

  async create(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
    const query = `
      INSERT INTO barbershops (slug, name, trial_ends_at, business_hours)
      VALUES ($1, $2, $3, $4)
      RETURNING id, slug, name, trial_ends_at, business_hours, created_at
    `;
    const values = [tenant.slug, tenant.name, tenant.trialEndsAt, JSON.stringify(tenant.businessHours)];
    const result = await this.pool.query(query, values);
    return this.mapRowToTenant(result.rows[0]);
  }

  async findById(id: string): Promise<Tenant | null> {
    const query = 'SELECT * FROM barbershops WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length ? this.mapRowToTenant(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const query = 'SELECT * FROM barbershops WHERE slug = $1';
    const result = await this.pool.query(query, [slug]);
    return result.rows.length ? this.mapRowToTenant(result.rows[0]) : null;
  }

  async update(id: string, tenant: Partial<Tenant>): Promise<Tenant> {
    // TODO: Implement update logic
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement delete logic
    throw new Error('Not implemented');
  }

  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      trialEndsAt: row.trial_ends_at,
      businessHours: row.business_hours,
      createdAt: row.created_at,
    };
  }
}