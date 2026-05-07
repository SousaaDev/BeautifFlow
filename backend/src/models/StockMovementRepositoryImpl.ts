import { Pool } from 'pg';
import { StockMovement } from './StockMovement';
import { StockMovementRepository } from './StockMovementRepository';

export class StockMovementRepositoryImpl implements StockMovementRepository {
  constructor(private pool: Pool) {}

  async create(movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement> {
    const query = `
      INSERT INTO stock_movements (tenant_id, product_id, type, quantity, reason, reference_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, tenant_id, product_id, type, quantity, reason, reference_id, created_by, created_at
    `;
    const values = [
      movement.tenantId,
      movement.productId,
      movement.type,
      movement.quantity,
      movement.reason,
      movement.referenceId,
      movement.createdBy,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findByProduct(productId: string): Promise<StockMovement[]> {
    const query = `
      SELECT id, tenant_id, product_id, type, quantity, reason, reference_id, created_by, created_at
      FROM stock_movements
      WHERE product_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [productId]);
    return result.rows;
  }

  async findByProductAndTenant(productId: string, tenantId: string): Promise<StockMovement[]> {
    const query = `
      SELECT id, tenant_id, product_id, type, quantity, reason, reference_id, created_by, created_at
      FROM stock_movements
      WHERE product_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [productId, tenantId]);
    return result.rows;
  }

  async findByTenant(tenantId: string): Promise<StockMovement[]> {
    const query = `
      SELECT sm.id, sm.tenant_id, sm.product_id, sm.type, sm.quantity, sm.reason, sm.reference_id, sm.created_by, sm.created_at,
             p.name as product_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.tenant_id = $1
      ORDER BY sm.created_at DESC
      LIMIT 1000
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async getStockAlerts(tenantId: string): Promise<Array<{productId: string, productName: string, currentStock: number, minThreshold: number}>> {
    const query = `
      SELECT id as product_id, name as product_name, current_stock, min_threshold
      FROM products
      WHERE tenant_id = $1 AND current_stock <= min_threshold AND is_active = true
      ORDER BY current_stock ASC
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }
}