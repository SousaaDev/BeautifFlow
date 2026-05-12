import { Pool } from 'pg';
import { Professional } from './Professional';
import { ProfessionalRepository } from './ProfessionalRepository';
import { v4 as uuidv4 } from 'uuid';

export class ProfessionalRepositoryImpl implements ProfessionalRepository {
  constructor(private pool: Pool) {}

  async create(professional: Omit<Professional, 'id' | 'createdAt'>): Promise<Professional> {
    const id = uuidv4();
    const query = `
      INSERT INTO professionals (id, tenant_id, name, phone, commission_rate, buffer_minutes, working_hours, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tenant_id as "tenantId", name, phone, commission_rate as "commissionRate", 
                buffer_minutes as "bufferMinutes", working_hours as "workingHours", is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, [
      id,
      professional.tenantId,
      professional.name,
      professional.phone || null,
      professional.commissionRate,
      professional.bufferMinutes,
      professional.workingHours ? JSON.stringify(professional.workingHours) : null,
      professional.isActive,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<Professional | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, phone, commission_rate as "commissionRate",
             buffer_minutes as "bufferMinutes", working_hours as "workingHours", is_active as "isActive", created_at as "createdAt"
      FROM professionals WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Professional[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, phone, commission_rate as "commissionRate",
             buffer_minutes as "bufferMinutes", working_hours as "workingHours", is_active as "isActive", created_at as "createdAt"
      FROM professionals WHERE tenant_id = $1 AND is_active = true
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Professional | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, phone, commission_rate as "commissionRate",
             buffer_minutes as "bufferMinutes", working_hours as "workingHours", is_active as "isActive", created_at as "createdAt"
      FROM professionals WHERE id = $1 AND tenant_id = $2
    `;
    const result = await this.pool.query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async update(id: string, data: Partial<Professional>): Promise<Professional> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.commissionRate !== undefined) {
      fields.push(`commission_rate = $${paramCount++}`);
      values.push(data.commissionRate);
    }
    if (data.bufferMinutes !== undefined) {
      fields.push(`buffer_minutes = $${paramCount++}`);
      values.push(data.bufferMinutes);
    }
    if (data.workingHours !== undefined) {
      fields.push(`working_hours = $${paramCount++}`);
      values.push(data.workingHours ? JSON.stringify(data.workingHours) : null);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    values.push(id);
    const query = `
      UPDATE professionals SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, tenant_id as "tenantId", name, phone, commission_rate as "commissionRate",
                buffer_minutes as "bufferMinutes", is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM professionals WHERE id = $1', [id]);
  }
}
