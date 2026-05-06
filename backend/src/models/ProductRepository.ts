import { Product } from './Product';

export interface ProductRepository {
  create(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findByTenant(tenantId: string): Promise<Product[]>;
  update(id: string, data: Partial<Product>): Promise<Product>;
  delete(id: string): Promise<void>;
  findByTenantAndId(tenantId: string, id: string): Promise<Product | null>;
}
