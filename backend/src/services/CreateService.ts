import { ServiceRepository } from '../models/ServiceRepository';
import { Service } from '../models/Service';

export class CreateService {
  constructor(private serviceRepository: ServiceRepository) {}

  async execute(data: {
    tenantId: string;
    name: string;
    durationMinutes: number;
    price: number;
    commissionRate?: number;
  }): Promise<Service> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Service name is required');
    }

    if (data.durationMinutes <= 0) {
      throw new Error('Duration must be greater than 0');
    }

    if (data.price < 0) {
      throw new Error('Price cannot be negative');
    }

    return this.serviceRepository.create({
      tenantId: data.tenantId,
      name: data.name,
      durationMinutes: data.durationMinutes,
      price: data.price,
      commissionRate: data.commissionRate || 0,
      isActive: true,
    });
  }
}
