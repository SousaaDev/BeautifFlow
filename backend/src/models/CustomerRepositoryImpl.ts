import { Pool } from 'pg';
import { Customer } from './Customer';
import { CustomerFilters, CustomerRepository } from './CustomerRepository';

export class CustomerRepositoryImpl implements CustomerRepository {
  constructor(private pool: Pool) {}

  async create(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const query = `
      INSERT INTO customers (tenant_id, name, phone, email, tags, last_visit)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id, name, phone, email, tags, last_visit, created_at
    `;
    const values = [
      customer.tenantId,
      customer.name,
      customer.phone || null,
      customer.email || null,
      customer.tags || null,
      customer.lastVisit || null,
    ];
    const result = await this.pool.query(query, values);
    return this.mapRowToCustomer(result.rows[0]);
  }

  async findById(id: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length ? this.mapRowToCustomer(result.rows[0]) : null;
  }

  async findAll(filters: CustomerFilters): Promise<Customer[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.tenantId) {
      values.push(filters.tenantId);
      conditions.push(`tenant_id = $${values.length}`);
    }

    if (filters.tag) {
      values.push(filters.tag);
      conditions.push(`tags @> ARRAY[$${values.length}]::text[]`);
    }

    if (filters.lastVisitAfter) {
      values.push(filters.lastVisitAfter);
      conditions.push(`last_visit >= $${values.length}`);
    }

    if (filters.lastVisitBefore) {
      values.push(filters.lastVisitBefore);
      conditions.push(`last_visit <= $${values.length}`);
    }

    // Soft delete filter - only show non-deleted customers unless explicitly requested
    if (!filters.includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    // Exclude billing-only contacts from normal salon customer queries
    if (filters.excludeBilling !== false) {
      conditions.push(`(tags IS NULL OR NOT (tags @> ARRAY['billing']::text[]))`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC`;
    const result = await this.pool.query(query, values);
    return result.rows.map((row: any) => this.mapRowToCustomer(row));
  }

  async update(id: string, customer: Partial<Customer>): Promise<Customer> {
    const fields: string[] = [];
    const values: any[] = [];

    if (customer.name !== undefined) {
      values.push(customer.name);
      fields.push(`name = $${values.length}`);
    }
    if (customer.phone !== undefined) {
      values.push(customer.phone);
      fields.push(`phone = $${values.length}`);
    }
    if (customer.email !== undefined) {
      values.push(customer.email);
      fields.push(`email = $${values.length}`);
    }
    if (customer.tags !== undefined) {
      values.push(customer.tags);
      fields.push(`tags = $${values.length}`);
    }
    if (customer.lastVisit !== undefined) {
      values.push(customer.lastVisit);
      fields.push(`last_visit = $${values.length}`);
    }

    if (!fields.length) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING id, tenant_id, name, phone, email, tags, last_visit, created_at
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    if (!result.rows.length) {
      throw new Error('Customer not found');
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    // LGPD compliant: use soft delete by default
    await this.softDelete(id);
  }

  async softDelete(id: string): Promise<void> {
    const query = 'UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL';
    const result = await this.pool.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error('Customer not found or already deleted');
    }
  }

  async restore(id: string): Promise<void> {
    const query = 'UPDATE customers SET deleted_at = NULL WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error('Customer not found');
    }
  }

  private mapRowToCustomer(row: any): Customer {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      tags: row.tags,
      lastVisit: row.last_visit,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    };
  }
}
