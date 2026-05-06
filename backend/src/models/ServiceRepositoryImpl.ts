import { Pool } from 'pg';
import { Service } from './Service';
import { ServiceRepository } from './ServiceRepository';
import { v4 as uuidv4 } from 'uuid';

export class ServiceRepositoryImpl implements ServiceRepository {
  constructor(private pool: Pool) {}

  async create(service: Omit<Service, 'id' | 'createdAt'>): Promise<Service> {
    const id = uuidv4();
    const query = `
      INSERT INTO services (id, tenant_id, name, duration_minutes, price, commission_rate, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, tenant_id as "tenantId", name, duration_minutes as "durationMinutes",
                price, commission_rate as "commissionRate", is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, [
      id,
      service.tenantId,
      service.name,
      service.durationMinutes,
      service.price,
      service.commissionRate,
      service.isActive,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<Service | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, duration_minutes as "durationMinutes",
             price, commission_rate as "commissionRate", is_active as "isActive", created_at as "createdAt"
      FROM services WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Service[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, duration_minutes as "durationMinutes",
             price, commission_rate as "commissionRate", is_active as "isActive", created_at as "createdAt"
      FROM services WHERE tenant_id = $1 AND is_active = true
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Service | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, duration_minutes as "durationMinutes",
             price, commission_rate as "commissionRate", is_active as "isActive", created_at as "createdAt"
      FROM services WHERE id = $1 AND tenant_id = $2
    `;
    const result = await this.pool.query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async update(id: string, data: Partial<Service>): Promise<Service> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.durationMinutes !== undefined) {
      fields.push(`duration_minutes = $${paramCount++}`);
      values.push(data.durationMinutes);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${paramCount++}`);
      values.push(data.price);
    }
    if (data.commissionRate !== undefined) {
      fields.push(`commission_rate = $${paramCount++}`);
      values.push(data.commissionRate);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    values.push(id);
    const query = `
      UPDATE services SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, tenant_id as "tenantId", name, duration_minutes as "durationMinutes",
                price, commission_rate as "commissionRate", is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM services WHERE id = $1', [id]);
  }
}
