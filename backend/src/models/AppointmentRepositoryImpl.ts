import { Pool } from 'pg';
import { Appointment } from './Appointment';
import { AppointmentRepository } from './AppointmentRepository';
import { v4 as uuidv4 } from 'uuid';

export class AppointmentRepositoryImpl implements AppointmentRepository {
  constructor(private pool: Pool) {}

  async create(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const id = uuidv4();
    const query = `
      INSERT INTO appointments 
      (id, tenant_id, customer_id, professional_id, service_id, start_time, end_time, status, internal_notes, price_charged)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
                service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
                status, internal_notes as "internalNotes", price_charged as "priceCharged", 
                created_at as "createdAt"
    `;
    const result = await this.pool.query(query, [
      id,
      appointment.tenantId,
      appointment.customerId,
      appointment.professionalId,
      appointment.serviceId,
      appointment.startTime,
      appointment.endTime,
      appointment.status,
      appointment.internalNotes || null,
      appointment.priceCharged || 0,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<Appointment | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
             status, internal_notes as "internalNotes", price_charged as "priceCharged", 
             created_at as "createdAt"
      FROM appointments WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Appointment[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
             status, internal_notes as "internalNotes", price_charged as "priceCharged", 
             created_at as "createdAt"
      FROM appointments WHERE tenant_id = $1
      ORDER BY start_time DESC
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Appointment | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
             status, internal_notes as "internalNotes", price_charged as "priceCharged", 
             created_at as "createdAt"
      FROM appointments WHERE id = $1 AND tenant_id = $2
    `;
    const result = await this.pool.query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async findConflicts(
    tenantId: string,
    professionalId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<Appointment[]> {
    let query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
             status, internal_notes as "internalNotes", price_charged as "priceCharged", 
             created_at as "createdAt"
      FROM appointments 
      WHERE tenant_id = $1 
        AND professional_id = $2 
        AND status NOT IN ('cancelled')
        AND (start_time, end_time) OVERLAPS ($3::TIMESTAMP, $4::TIMESTAMP)
    `;
    const params: any[] = [tenantId, professionalId, startTime, endTime];

    if (excludeId) {
      query += ` AND id != $5`;
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async update(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.internalNotes !== undefined) {
      fields.push(`internal_notes = $${paramCount++}`);
      values.push(data.internalNotes);
    }
    if (data.priceCharged !== undefined) {
      fields.push(`price_charged = $${paramCount++}`);
      values.push(data.priceCharged);
    }

    if (fields.length === 0) {
      return this.findById(id) as Promise<Appointment>;
    }

    values.push(id);
    const query = `
      UPDATE appointments SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
                service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
                status, internal_notes as "internalNotes", price_charged as "priceCharged", 
                created_at as "createdAt"
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM appointments WHERE id = $1', [id]);
  }

  async findByCustomer(tenantId: string, customerId: string): Promise<Appointment[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
             status, internal_notes as "internalNotes", price_charged as "priceCharged", 
             created_at as "createdAt"
      FROM appointments WHERE tenant_id = $1 AND customer_id = $2
      ORDER BY start_time DESC
    `;
    const result = await this.pool.query(query, [tenantId, customerId]);
    return result.rows;
  }

  async findByProfessional(tenantId: string, professionalId: string): Promise<Appointment[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
             status, internal_notes as "internalNotes", price_charged as "priceCharged", 
             created_at as "createdAt"
      FROM appointments WHERE tenant_id = $1 AND professional_id = $2
      ORDER BY start_time DESC
    `;
    const result = await this.pool.query(query, [tenantId, professionalId]);
    return result.rows;
  }

  async findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Appointment[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             service_id as "serviceId", start_time as "startTime", end_time as "endTime", 
             status, internal_notes as "internalNotes", price_charged as "priceCharged", 
             created_at as "createdAt"
      FROM appointments WHERE tenant_id = $1 AND start_time >= $2 AND end_time <= $3
      ORDER BY start_time ASC
    `;
    const result = await this.pool.query(query, [tenantId, startDate, endDate]);
    return result.rows;
  }
}
