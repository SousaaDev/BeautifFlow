import { Pool } from 'pg';
import { SaleItem } from './SaleItem';
import { SaleItemRepository } from './SaleItemRepository';
import { v4 as uuidv4 } from 'uuid';

export class SaleItemRepositoryImpl implements SaleItemRepository {
  constructor(private pool: Pool) {}

  async create(saleItem: Omit<SaleItem, 'id'>): Promise<SaleItem> {
    const id = uuidv4();
    const query = `
      INSERT INTO sale_items (id, sale_id, product_id, service_id, quantity, unit_price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, sale_id as "saleId", product_id as "productId", service_id as "serviceId",
                quantity, unit_price as "unitPrice"
    `;
    const result = await this.pool.query(query, [
      id,
      saleItem.saleId,
      saleItem.productId || null,
      saleItem.serviceId || null,
      saleItem.quantity,
      saleItem.unitPrice,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<SaleItem | null> {
    const query = `
      SELECT id, sale_id as "saleId", product_id as "productId", service_id as "serviceId",
             quantity, unit_price as "unitPrice"
      FROM sale_items WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findBySale(saleId: string): Promise<SaleItem[]> {
    const query = `
      SELECT id, sale_id as "saleId", product_id as "productId", service_id as "serviceId",
             quantity, unit_price as "unitPrice"
      FROM sale_items WHERE sale_id = $1
    `;
    const result = await this.pool.query(query, [saleId]);
    return result.rows;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM sale_items WHERE id = $1', [id]);
  }
}
