import { Transaction } from './Transaction';

export interface TransactionRepository {
  create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findByTenant(tenantId: string): Promise<Transaction[]>;
  findByTenantAndId(tenantId: string, id: string): Promise<Transaction | null>;
  findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
  findByCategory(tenantId: string, category: string): Promise<Transaction[]>;
  delete(id: string): Promise<void>;
}
