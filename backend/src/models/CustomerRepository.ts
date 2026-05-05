import { Customer } from './Customer';

export interface CustomerFilters {
  tenantId?: string;
  tag?: string;
  lastVisitAfter?: Date;
  lastVisitBefore?: Date;
}

export interface CustomerRepository {
  create(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findAll(filters: CustomerFilters): Promise<Customer[]>;
  update(id: string, customer: Partial<Customer>): Promise<Customer>;
  delete(id: string): Promise<void>;
}
