import { Pool } from 'pg';
import { Sale } from './Sale';
import { SaleRepository } from './SaleRepository';
import { v4 as uuidv4 } from 'uuid';

export class SaleRepositoryImpl implements SaleRepository {
  constructor(private pool: Pool) {}

  async create(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    const id = uuidv4();
    const query = `
      INSERT INTO sales (id, tenant_id, customer_id, professional_id, total, payment_method)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
                total, payment_method as "paymentMethod", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, [
      id,
      sale.tenantId,
      sale.customerId || null,
      sale.professionalId || null,
      sale.total,
      sale.paymentMethod || null,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<Sale | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             total, payment_method as "paymentMethod", created_at as "createdAt"
      FROM sales WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Sale[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             total, payment_method as "paymentMethod", created_at as "createdAt"
      FROM sales WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Sale | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             total, payment_method as "paymentMethod", created_at as "createdAt"
      FROM sales WHERE id = $1 AND tenant_id = $2
    `;
    const result = await this.pool.query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async update(id: string, data: Partial<Sale>): Promise<Sale> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.total !== undefined) {
      fields.push(`total = $${paramCount++}`);
      values.push(data.total);
    }
    if (data.paymentMethod !== undefined) {
      fields.push(`payment_method = $${paramCount++}`);
      values.push(data.paymentMethod);
    }

    if (fields.length === 0) {
      return this.findById(id) as Promise<Sale>;
    }

    values.push(id);
    const query = `
      UPDATE sales SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
                total, payment_method as "paymentMethod", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM sales WHERE id = $1', [id]);
  }

  async findByCustomer(tenantId: string, customerId: string): Promise<Sale[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             total, payment_method as "paymentMethod", created_at as "createdAt"
      FROM sales WHERE tenant_id = $1 AND customer_id = $2
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [tenantId, customerId]);
    return result.rows;
  }

  async findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Sale[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
             total, payment_method as "paymentMethod", created_at as "createdAt"
      FROM sales WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [tenantId, startDate, endDate]);
    return result.rows;
  }
}
