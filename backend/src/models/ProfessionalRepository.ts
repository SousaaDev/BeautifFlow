import { Professional } from './Professional';

export interface ProfessionalRepository {
  create(professional: Omit<Professional, 'id' | 'createdAt'>): Promise<Professional>;
  findById(id: string): Promise<Professional | null>;
  findByTenant(tenantId: string): Promise<Professional[]>;
  update(id: string, data: Partial<Professional>): Promise<Professional>;
  delete(id: string): Promise<void>;
  findByTenantAndId(tenantId: string, id: string): Promise<Professional | null>;
  professionalOffersService(tenantId: string, professionalId: string, serviceId: string): Promise<boolean>;
  setProfessionalServices(tenantId: string, professionalId: string, serviceIds: string[]): Promise<void>;
  seedAllActiveServicesForProfessional(tenantId: string, professionalId: string): Promise<void>;
}
