import { ProfessionalRepository } from '../models/ProfessionalRepository';
import { Professional } from '../models/Professional';

export class CreateProfessional {
  constructor(private professionalRepository: ProfessionalRepository) {}

  async execute(data: {
    tenantId: string;
    name: string;
    phone?: string;
    commissionRate: number;
    bufferMinutes?: number;
  }): Promise<Professional> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Professional name is required');
    }

    if (data.commissionRate < 0 || data.commissionRate > 100) {
      throw new Error('Commission rate must be between 0 and 100');
    }

    return this.professionalRepository.create({
      tenantId: data.tenantId,
      name: data.name,
      phone: data.phone,
      commissionRate: data.commissionRate,
      bufferMinutes: data.bufferMinutes ?? 10,
      isActive: true,
    });
  }
}
