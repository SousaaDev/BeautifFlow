import { Pool } from 'pg';
import { Tenant } from './Tenant';
import { TenantRepository } from './TenantRepository';
import { coerceBusinessHoursRecord, coerceSettingsRecord } from '../utils/businessHoursSchedule';

export class TenantRepositoryImpl implements TenantRepository {
  constructor(private pool: Pool) {}

  async create(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
    const query = `
      INSERT INTO beauty_shops (slug, name, trial_ends_at, business_hours, buffer_minutes, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, slug, name, trial_ends_at, business_hours, buffer_minutes, settings, created_at
    `;
    const values = [tenant.slug, tenant.name, tenant.trialEndsAt, JSON.stringify(tenant.businessHours), tenant.bufferMinutes || 10, JSON.stringify(tenant.settings || {})];
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
      'bufferMinutes',
      'settings',
    ];
    const fields: string[] = [];
    const values: any[] = [];

    for (const key of allowedFields) {
      if (tenant[key] !== undefined) {
        fields.push(`${this.toColumnName(key)} = $${values.length + 1}`);
        values.push(
          key === 'businessHours' || key === 'settings' ? JSON.stringify(tenant[key]) : tenant[key]
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
      RETURNING id, slug, name, trial_ends_at, business_hours, buffer_minutes, settings, created_at
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
      case 'bufferMinutes':
        return 'buffer_minutes';
      case 'settings':
        return 'settings';
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
      businessHours: coerceBusinessHoursRecord(row.business_hours) ?? {},
      bufferMinutes: row.buffer_minutes || 10,
      settings: coerceSettingsRecord(row.settings),
      createdAt: row.created_at,
    };
  }
}