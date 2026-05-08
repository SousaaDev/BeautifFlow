import { Appointment } from './Appointment';

export interface AppointmentRepository {
  create(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment>;
  findById(id: string): Promise<Appointment | null>;
  findByTenant(tenantId: string): Promise<Appointment[]>;
  findByTenantAndId(tenantId: string, id: string): Promise<Appointment | null>;
  findConflicts(
    tenantId: string,
    professionalId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<Appointment[]>;
  update(id: string, data: Partial<Appointment>): Promise<Appointment>;
  delete(id: string): Promise<void>;
  findByCustomer(tenantId: string, customerId: string): Promise<Appointment[]>;
  findByProfessional(tenantId: string, professionalId: string): Promise<Appointment[]>;
  findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Appointment[]>;
  countCustomerServiceUsageInPeriod(
    tenantId: string,
    customerId: string,
    serviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number>;
}
