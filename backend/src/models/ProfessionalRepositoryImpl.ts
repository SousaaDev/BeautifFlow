import { Pool } from 'pg';
import { Professional } from './Professional';
import { ProfessionalRepository } from './ProfessionalRepository';
import { v4 as uuidv4 } from 'uuid';

const SERVICE_IDS_SQL = `
  COALESCE(
    (SELECT ARRAY_AGG(ps.service_id ORDER BY s.name)
     FROM professional_services ps
     INNER JOIN services s ON s.id = ps.service_id
     WHERE ps.professional_id = p.id),
    ARRAY[]::uuid[]
  ) AS "serviceIds"
`;

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
      JSON.stringify(professional.workingHours || {}),
      professional.isActive,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<Professional | null> {
    const query = `
      SELECT p.id, p.tenant_id as "tenantId", p.name, p.phone, p.commission_rate as "commissionRate",
             p.buffer_minutes as "bufferMinutes", p.working_hours as "workingHours", p.is_active as "isActive", p.created_at as "createdAt",
             ${SERVICE_IDS_SQL}
      FROM professionals p WHERE p.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    const row = result.rows[0];
    return row ? this.mapServiceIds(row) : null;
  }

  async findByTenant(tenantId: string): Promise<Professional[]> {
    const query = `
      SELECT p.id, p.tenant_id as "tenantId", p.name, p.phone, p.commission_rate as "commissionRate",
             p.buffer_minutes as "bufferMinutes", p.working_hours as "workingHours", p.is_active as "isActive", p.created_at as "createdAt",
             ${SERVICE_IDS_SQL}
      FROM professionals p WHERE p.tenant_id = $1
      ORDER BY p.name ASC
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows.map((row) => this.mapServiceIds(row));
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Professional | null> {
    const query = `
      SELECT p.id, p.tenant_id as "tenantId", p.name, p.phone, p.commission_rate as "commissionRate",
             p.buffer_minutes as "bufferMinutes", p.working_hours as "workingHours", p.is_active as "isActive", p.created_at as "createdAt",
             ${SERVICE_IDS_SQL}
      FROM professionals p WHERE p.id = $1 AND p.tenant_id = $2
    `;
    const result = await this.pool.query(query, [id, tenantId]);
    const row = result.rows[0];
    return row ? this.mapServiceIds(row) : null;
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
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }
    if (data.workingHours !== undefined) {
      fields.push(`working_hours = $${paramCount++}`);
      values.push(JSON.stringify(data.workingHours));
    }

    values.push(id);
    const query = `
      UPDATE professionals SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, tenant_id as "tenantId", name, phone, commission_rate as "commissionRate",
                buffer_minutes as "bufferMinutes", working_hours as "workingHours", is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, values);
    const updated = result.rows[0];
    const full = await this.findByTenantAndId(updated.tenantId, updated.id);
    return full ?? updated;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM professionals WHERE id = $1', [id]);
  }

  async professionalOffersService(tenantId: string, professionalId: string, serviceId: string): Promise<boolean> {
    const r = await this.pool.query(
      `SELECT 1 FROM professional_services ps
       INNER JOIN professionals p ON p.id = ps.professional_id
       WHERE p.tenant_id = $1 AND ps.professional_id = $2 AND ps.service_id = $3
       LIMIT 1`,
      [tenantId, professionalId, serviceId]
    );
    return (r.rowCount ?? 0) > 0;
  }

  async setProfessionalServices(tenantId: string, professionalId: string, serviceIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const pro = await client.query('SELECT id FROM professionals WHERE id = $1 AND tenant_id = $2', [
        professionalId,
        tenantId,
      ]);
      if (!pro.rowCount) {
        throw new Error('Professional not found');
      }
      const uniq = [...new Set(serviceIds)];
      if (uniq.length > 0) {
        const chk = await client.query(
          `SELECT COUNT(*)::int AS c FROM services WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
          [tenantId, uniq]
        );
        if (Number(chk.rows[0]?.c) !== uniq.length) {
          throw new Error('One or more services are invalid for this salon');
        }
      }
      await client.query('DELETE FROM professional_services WHERE professional_id = $1', [professionalId]);
      if (uniq.length > 0) {
        await client.query(
          `INSERT INTO professional_services (professional_id, service_id)
           SELECT $1::uuid, unnest($2::uuid[])`,
          [professionalId, uniq]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async seedAllActiveServicesForProfessional(tenantId: string, professionalId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO professional_services (professional_id, service_id)
       SELECT $1::uuid, s.id FROM services s
       WHERE s.tenant_id = $2 AND s.is_active = true
       ON CONFLICT DO NOTHING`,
      [professionalId, tenantId]
    );
  }

  private mapServiceIds(row: any): Professional {
    const ids: string[] = Array.isArray(row.serviceIds)
      ? row.serviceIds.map((x: unknown) => String(x))
      : [];
    const { serviceIds: _s, ...rest } = row;
    return { ...rest, serviceIds: ids };
  }
}
