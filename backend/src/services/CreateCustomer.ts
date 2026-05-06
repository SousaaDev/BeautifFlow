import { Customer } from '../models/Customer';
import { CustomerRepository } from '../models/CustomerRepository';

export class CreateCustomer {
  constructor(private customerRepository: CustomerRepository) {}

  async execute(customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const tags = customerData.tags && customerData.tags.length ? customerData.tags : ['new'];
    return this.customerRepository.create({
      ...customerData,
      tags,
    });
  }
}
