import { Pool } from 'pg';
import { Transaction } from './Transaction';
import { TransactionRepository } from './TransactionRepository';
import { v4 as uuidv4 } from 'uuid';

export class TransactionRepositoryImpl implements TransactionRepository {
  constructor(private pool: Pool) {}

  async create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const id = uuidv4();
    const query = `
      INSERT INTO transactions (id, tenant_id, type, category, amount, payment_method, reference_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tenant_id as "tenantId", type, category, amount, payment_method as "paymentMethod",
                reference_id as "referenceId", metadata, created_at as "createdAt"
    `;
    const result = await this.pool.query(query, [
      id,
      transaction.tenantId,
      transaction.type,
      transaction.category,
      transaction.amount,
      transaction.paymentMethod || null,
      transaction.referenceId || null,
      transaction.metadata || null,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<Transaction | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", type, category, amount, payment_method as "paymentMethod",
             reference_id as "referenceId", metadata, created_at as "createdAt"
      FROM transactions WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Transaction[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", type, category, amount, payment_method as "paymentMethod",
             reference_id as "referenceId", metadata, created_at as "createdAt"
      FROM transactions WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Transaction | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", type, category, amount, payment_method as "paymentMethod",
             reference_id as "referenceId", metadata, created_at as "createdAt"
      FROM transactions WHERE id = $1 AND tenant_id = $2
    `;
    const result = await this.pool.query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", type, category, amount, payment_method as "paymentMethod",
             reference_id as "referenceId", metadata, created_at as "createdAt"
      FROM transactions WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [tenantId, startDate, endDate]);
    return result.rows;
  }

  async findByCategory(tenantId: string, category: string): Promise<Transaction[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", type, category, amount, payment_method as "paymentMethod",
             reference_id as "referenceId", metadata, created_at as "createdAt"
      FROM transactions WHERE tenant_id = $1 AND category = $2
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [tenantId, category]);
    return result.rows;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM transactions WHERE id = $1', [id]);
  }
}
