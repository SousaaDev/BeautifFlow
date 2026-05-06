import { Sale } from './Sale';

export interface SaleRepository {
  create(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  findByTenant(tenantId: string): Promise<Sale[]>;
  findByTenantAndId(tenantId: string, id: string): Promise<Sale | null>;
  update(id: string, data: Partial<Sale>): Promise<Sale>;
  delete(id: string): Promise<void>;
  findByCustomer(tenantId: string, customerId: string): Promise<Sale[]>;
  findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Sale[]>;
}
