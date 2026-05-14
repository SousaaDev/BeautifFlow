import { AppointmentRepository } from '../models/AppointmentRepository';
import { ProfessionalRepository } from '../models/ProfessionalRepository';
import { TenantRepository } from '../models/TenantRepository';
import { Appointment } from '../models/Appointment';

export class CreateAppointment {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private professionalRepository: ProfessionalRepository,
    private tenantRepository: TenantRepository
  ) {}

  async execute(data: {
    tenantId: string;
    customerId: string;
    professionalId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
    internalNotes?: string;
  }): Promise<Appointment> {
    // Validação 1: startTime antes de endTime
    if (data.startTime >= data.endTime) {
      throw new Error('startTime must be before endTime');
    }

    // Validação 2: Buscar profissional e tenant
    const professional = await this.professionalRepository.findByTenantAndId(
      data.tenantId,
      data.professionalId
    );
    if (!professional) {
      throw new Error('Professional not found');
    }

    const tenant = await this.tenantRepository.findById(data.tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Validação 3: Verificar conflito com buffer time (use tenant's buffer configuration)
    const bufferMs = Math.max(0, Number(tenant.bufferMinutes ?? 0)) * 60 * 1000;
    const adjustedStart = new Date(data.startTime.getTime() - bufferMs);
    const adjustedEnd = new Date(data.endTime.getTime() + bufferMs);

    const conflicts = await this.appointmentRepository.findConflicts(
      data.tenantId,
      data.professionalId,
      adjustedStart,
      adjustedEnd
    );

    if (conflicts.length > 0) {
      throw new Error(
        `Time slot not available. Conflicts: ${conflicts.map(c => c.startTime).join(', ')}`
      );
    }

    // Criar agendamento
    return this.appointmentRepository.create({
      tenantId: data.tenantId,
      customerId: data.customerId,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'scheduled',
      internalNotes: data.internalNotes,
    });
  }
}
