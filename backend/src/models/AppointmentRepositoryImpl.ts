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
      SELECT a.id, a.tenant_id as "tenantId", a.customer_id as "customerId", a.professional_id as "professionalId",
             a.service_id as "serviceId", a.start_time as "startTime", a.end_time as "endTime", 
             a.status, a.internal_notes as "internalNotes", a.price_charged as "priceCharged", 
             a.created_at as "createdAt",
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as "customer",
             json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes) as "service",
             json_build_object('id', p.id, 'name', p.name) as "professional"
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE a.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Appointment[]> {
    const query = `
      SELECT a.id, a.tenant_id as "tenantId", a.customer_id as "customerId", a.professional_id as "professionalId",
             a.service_id as "serviceId", a.start_time as "startTime", a.end_time as "endTime", 
             a.status, a.internal_notes as "internalNotes", a.price_charged as "priceCharged", 
             a.created_at as "createdAt",
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as "customer",
             json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes) as "service",
             json_build_object('id', p.id, 'name', p.name) as "professional"
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE a.tenant_id = $1
      ORDER BY a.start_time DESC
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Appointment | null> {
    const query = `
      SELECT a.id, a.tenant_id as "tenantId", a.customer_id as "customerId", a.professional_id as "professionalId",
             a.service_id as "serviceId", a.start_time as "startTime", a.end_time as "endTime", 
             a.status, a.internal_notes as "internalNotes", a.price_charged as "priceCharged", 
             a.created_at as "createdAt",
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as "customer",
             json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes) as "service",
             json_build_object('id', p.id, 'name', p.name) as "professional"
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE a.id = $1 AND a.tenant_id = $2
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
      SELECT a.id, a.tenant_id as "tenantId", a.customer_id as "customerId", a.professional_id as "professionalId",
             a.service_id as "serviceId", a.start_time as "startTime", a.end_time as "endTime", 
             a.status, a.internal_notes as "internalNotes", a.price_charged as "priceCharged", 
             a.created_at as "createdAt",
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as "customer",
             json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes) as "service",
             json_build_object('id', p.id, 'name', p.name) as "professional"
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE a.tenant_id = $1 
        AND a.professional_id = $2 
        AND a.status NOT IN ('cancelled')
        AND (a.start_time, a.end_time) OVERLAPS ($3::TIMESTAMP, $4::TIMESTAMP)
    `;
    const params: any[] = [tenantId, professionalId, startTime, endTime];

    if (excludeId) {
      query += ` AND a.id != $5`;
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async update(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.customerId !== undefined) {
      fields.push(`customer_id = $${paramCount++}`);
      values.push(data.customerId);
    }
    if (data.professionalId !== undefined) {
      fields.push(`professional_id = $${paramCount++}`);
      values.push(data.professionalId);
    }
    if (data.serviceId !== undefined) {
      fields.push(`service_id = $${paramCount++}`);
      values.push(data.serviceId);
    }
    if (data.startTime !== undefined) {
      fields.push(`start_time = $${paramCount++}`);
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      fields.push(`end_time = $${paramCount++}`);
      values.push(data.endTime);
    }
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
      SELECT a.id, a.tenant_id as "tenantId", a.customer_id as "customerId", a.professional_id as "professionalId",
             a.service_id as "serviceId", a.start_time as "startTime", a.end_time as "endTime", 
             a.status, a.internal_notes as "internalNotes", a.price_charged as "priceCharged", 
             a.created_at as "createdAt",
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as "customer",
             json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes) as "service",
             json_build_object('id', p.id, 'name', p.name) as "professional"
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE a.tenant_id = $1 AND a.customer_id = $2
      ORDER BY a.start_time DESC
    `;
    const result = await this.pool.query(query, [tenantId, customerId]);
    return result.rows;
  }

  async findByProfessional(tenantId: string, professionalId: string): Promise<Appointment[]> {
    const query = `
      SELECT a.id, a.tenant_id as "tenantId", a.customer_id as "customerId", a.professional_id as "professionalId",
             a.service_id as "serviceId", a.start_time as "startTime", a.end_time as "endTime", 
             a.status, a.internal_notes as "internalNotes", a.price_charged as "priceCharged", 
             a.created_at as "createdAt",
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as "customer",
             json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes) as "service",
             json_build_object('id', p.id, 'name', p.name) as "professional"
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE a.tenant_id = $1 AND a.professional_id = $2
      ORDER BY a.start_time DESC
    `;
    const result = await this.pool.query(query, [tenantId, professionalId]);
    return result.rows;
  }

  async findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Appointment[]> {
    const query = `
      SELECT a.id, a.tenant_id as "tenantId", a.customer_id as "customerId", a.professional_id as "professionalId",
             a.service_id as "serviceId", a.start_time as "startTime", a.end_time as "endTime", 
             a.status, a.internal_notes as "internalNotes", a.price_charged as "priceCharged", 
             a.created_at as "createdAt",
             json_build_object('id', c.id, 'name', c.name, 'email', c.email) as "customer",
             json_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration', s.duration_minutes) as "service",
             json_build_object('id', p.id, 'name', p.name) as "professional"
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN professionals p ON a.professional_id = p.id
      WHERE a.tenant_id = $1 AND a.start_time >= $2 AND a.end_time <= $3
      ORDER BY a.start_time ASC
    `;
    const result = await this.pool.query(query, [tenantId, startDate, endDate]);
    return result.rows;
  }

  async countCustomerServiceUsageInPeriod(
    tenantId: string,
    customerId: string,
    serviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM appointments
       WHERE tenant_id = $1
         AND customer_id = $2
         AND service_id = $3
         AND status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
         AND start_time >= $4
         AND start_time < $5`,
      [tenantId, customerId, serviceId, startDate, endDate]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  }
}
