import { AppointmentRepository } from '../models/AppointmentRepository';
import { ProfessionalRepository } from '../models/ProfessionalRepository';
import { Appointment } from '../models/Appointment';

export class CreateAppointment {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private professionalRepository: ProfessionalRepository
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

    // Validação 2: Buscar profissional
    const professional = await this.professionalRepository.findByTenantAndId(
      data.tenantId,
      data.professionalId
    );
    if (!professional) {
      throw new Error('Professional not found');
    }

    // Validação 3: Verificar conflito com buffer time
    const bufferMs = professional.bufferMinutes * 60 * 1000;
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
