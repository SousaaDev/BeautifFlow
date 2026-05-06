import { Pool } from 'pg';
import { Product } from './Product';
import { ProductRepository } from './ProductRepository';
import { v4 as uuidv4 } from 'uuid';

export class ProductRepositoryImpl implements ProductRepository {
  constructor(private pool: Pool) {}

  async create(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    const id = uuidv4();
    const query = `
      INSERT INTO products (id, tenant_id, name, current_stock, min_threshold, cost_price, sale_price, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tenant_id as "tenantId", name, current_stock as "currentStock",
                min_threshold as "minThreshold", cost_price as "costPrice", sale_price as "salePrice",
                is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, [
      id,
      product.tenantId,
      product.name,
      product.currentStock,
      product.minThreshold,
      product.costPrice,
      product.salePrice,
      product.isActive,
    ]);
    return result.rows[0];
  }

  async findById(id: string): Promise<Product | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, current_stock as "currentStock",
             min_threshold as "minThreshold", cost_price as "costPrice", sale_price as "salePrice",
             is_active as "isActive", created_at as "createdAt"
      FROM products WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Product[]> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, current_stock as "currentStock",
             min_threshold as "minThreshold", cost_price as "costPrice", sale_price as "salePrice",
             is_active as "isActive", created_at as "createdAt"
      FROM products WHERE tenant_id = $1 AND is_active = true
    `;
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<Product | null> {
    const query = `
      SELECT id, tenant_id as "tenantId", name, current_stock as "currentStock",
             min_threshold as "minThreshold", cost_price as "costPrice", sale_price as "salePrice",
             is_active as "isActive", created_at as "createdAt"
      FROM products WHERE id = $1 AND tenant_id = $2
    `;
    const result = await this.pool.query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.currentStock !== undefined) {
      fields.push(`current_stock = $${paramCount++}`);
      values.push(data.currentStock);
    }
    if (data.minThreshold !== undefined) {
      fields.push(`min_threshold = $${paramCount++}`);
      values.push(data.minThreshold);
    }
    if (data.costPrice !== undefined) {
      fields.push(`cost_price = $${paramCount++}`);
      values.push(data.costPrice);
    }
    if (data.salePrice !== undefined) {
      fields.push(`sale_price = $${paramCount++}`);
      values.push(data.salePrice);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    values.push(id);
    const query = `
      UPDATE products SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, tenant_id as "tenantId", name, current_stock as "currentStock",
                min_threshold as "minThreshold", cost_price as "costPrice", sale_price as "salePrice",
                is_active as "isActive", created_at as "createdAt"
    `;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM products WHERE id = $1', [id]);
  }
}
