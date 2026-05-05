import { Customer } from '../models/Customer';
import { CustomerRepository } from '../models/CustomerRepository';

export class CreateCustomer {
  constructor(private customerRepository: CustomerRepository) {}

  async execute(customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    return this.customerRepository.create(customerData);
  }
}
