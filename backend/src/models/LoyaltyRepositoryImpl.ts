import { Pool } from 'pg';
import { LoyaltyPoints, LoyaltyTransaction } from './LoyaltyPoints';
import { LoyaltyRepository } from './LoyaltyRepository';

export class LoyaltyRepositoryImpl implements LoyaltyRepository {
  constructor(private pool: Pool) {}

  async getPoints(customerId: string): Promise<LoyaltyPoints | null> {
    const query = `
      SELECT id, customer_id, tenant_id, points, updated_at
      FROM loyalty_points
      WHERE customer_id = $1
    `;
    const result = await this.pool.query(query, [customerId]);
    return result.rows.length ? result.rows[0] : null;
  }

  async addPoints(customerId: string, tenantId: string, points: number, reason: string, referenceId?: string): Promise<LoyaltyPoints> {
    // Start transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert or update loyalty points
      const upsertQuery = `
        INSERT INTO loyalty_points (customer_id, tenant_id, points, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (customer_id)
        DO UPDATE SET
          points = loyalty_points.points + $3,
          updated_at = NOW()
        RETURNING id, customer_id, tenant_id, points, updated_at
      `;
      const upsertResult = await client.query(upsertQuery, [customerId, tenantId, points]);

      // Record transaction
      const transactionQuery = `
        INSERT INTO loyalty_transactions (customer_id, tenant_id, type, points, reason, reference_id)
        VALUES ($1, $2, 'EARNED', $3, $4, $5)
      `;
      await client.query(transactionQuery, [customerId, tenantId, points, reason, referenceId]);

      await client.query('COMMIT');
      return upsertResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async redeemPoints(customerId: string, tenantId: string, points: number, reason: string, referenceId?: string): Promise<LoyaltyPoints> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check current points
      const currentPoints = await this.getPoints(customerId);
      if (!currentPoints || currentPoints.points < points) {
        throw new Error('Insufficient loyalty points');
      }

      // Deduct points
      const updateQuery = `
        UPDATE loyalty_points
        SET points = points - $1, updated_at = NOW()
        WHERE customer_id = $2
        RETURNING id, customer_id, tenant_id, points, updated_at
      `;
      const updateResult = await client.query(updateQuery, [points, customerId]);

      // Record transaction
      const transactionQuery = `
        INSERT INTO loyalty_transactions (customer_id, tenant_id, type, points, reason, reference_id)
        VALUES ($1, $2, 'REDEEMED', $3, $4, $5)
      `;
      await client.query(transactionQuery, [customerId, tenantId, points, reason, referenceId]);

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTransactionHistory(customerId: string): Promise<LoyaltyTransaction[]> {
    const query = `
      SELECT id, customer_id, tenant_id, type, points, reason, reference_id, created_at
      FROM loyalty_transactions
      WHERE customer_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [customerId]);
    return result.rows;
  }

  async getTopCustomersByPoints(tenantId: string, limit: number = 10): Promise<Array<{customerId: string, customerName: string, points: number}>> {
    const query = `
      SELECT lp.customer_id, c.name as customer_name, lp.points
      FROM loyalty_points lp
      JOIN customers c ON lp.customer_id = c.id
      WHERE lp.tenant_id = $1 AND c.deleted_at IS NULL
      ORDER BY lp.points DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [tenantId, limit]);
    return result.rows;
  }
}