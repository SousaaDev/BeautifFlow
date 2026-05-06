import { Pool } from 'pg';
import { Tenant } from './Tenant';
import { TenantRepository } from './TenantRepository';

export class TenantRepositoryImpl implements TenantRepository {
  constructor(private pool: Pool) {}

  async create(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
    const query = `
      INSERT INTO beauty_shops (slug, name, trial_ends_at, business_hours)
      VALUES ($1, $2, $3, $4)
      RETURNING id, slug, name, trial_ends_at, business_hours, created_at
    `;
    const values = [tenant.slug, tenant.name, tenant.trialEndsAt, JSON.stringify(tenant.businessHours)];
    const result = await this.pool.query(query, values);
    return this.mapRowToTenant(result.rows[0]);
  }

  async findById(id: string): Promise<Tenant | null> {
    const query = 'SELECT * FROM beauty_shops WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length ? this.mapRowToTenant(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const query = 'SELECT * FROM beauty_shops WHERE slug = $1';
    const result = await this.pool.query(query, [slug]);
    return result.rows.length ? this.mapRowToTenant(result.rows[0]) : null;
  }

  async update(id: string, tenant: Partial<Tenant>): Promise<Tenant> {
    const allowedFields: Array<keyof Omit<Tenant, 'id' | 'createdAt'>> = [
      'slug',
      'name',
      'trialEndsAt',
      'businessHours',
    ];
    const fields: string[] = [];
    const values: any[] = [];

    for (const key of allowedFields) {
      if (tenant[key] !== undefined) {
        fields.push(`${this.toColumnName(key)} = $${values.length + 1}`);
        values.push(
          key === 'businessHours' ? JSON.stringify(tenant.businessHours) : tenant[key]
        );
      }
    }

    if (!fields.length) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE beauty_shops
      SET ${fields.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING id, slug, name, trial_ends_at, business_hours, created_at
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    return this.mapRowToTenant(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM beauty_shops WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  private toColumnName(field: keyof Omit<Tenant, 'id' | 'createdAt'>): string {
    switch (field) {
      case 'trialEndsAt':
        return 'trial_ends_at';
      case 'businessHours':
        return 'business_hours';
      default:
        return field;
    }
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