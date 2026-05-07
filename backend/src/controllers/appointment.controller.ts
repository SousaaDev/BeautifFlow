import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { AppointmentRepositoryImpl } from '../models/AppointmentRepositoryImpl';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { ProfessionalRepositoryImpl } from '../models/ProfessionalRepositoryImpl';
import { ServiceRepositoryImpl } from '../models/ServiceRepositoryImpl';
import { AutomationEngine } from '../services/AutomationEngine';
import { redisClient } from '../infrastructure/redis';

const createAppointmentSchema = z.object({
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  internalNotes: z.string().optional(),
});

const autoAppointmentTags = ['first_visit', 'returning', 'loyal', 'vip'];

const getCustomerTagsByAppointmentCount = (count: number): string[] => {
  if (count === 1) {
    return ['first_visit'];
  }
  if (count <= 4) {
    return ['returning'];
  }
  if (count <= 9) {
    return ['loyal'];
  }
  return ['vip'];
};

const updateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  internalNotes: z.string().optional(),
  priceCharged: z.number().optional(),
});

const appointmentRepository = new AppointmentRepositoryImpl(pool);
const customerRepository = new CustomerRepositoryImpl(pool);
const serviceRepository = new ServiceRepositoryImpl(pool);
const profRepository = new ProfessionalRepositoryImpl(pool);
const automationEngine = new AutomationEngine();

// Enhanced conflict validation with buffer time and working hours
const validateAppointmentConflicts = async (
  tenantId: string,
  professionalId: string,
  customerId: string,
  startTime: Date,
  endTime: Date,
  serviceDuration: number,
  bufferMinutes: number,
  excludeAppointmentId?: string
): Promise<{ isValid: boolean; errors: string[]; conflicts: any[] }> => {
  const errors: string[] = [];
  const conflicts: any[] = [];

  // 1. Validate basic time logic
  if (startTime >= endTime) {
    errors.push('Start time must be before end time');
    return { isValid: false, errors, conflicts };
  }

  // 2. Validate service duration matches appointment duration
  const appointmentDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  if (Math.abs(appointmentDuration - serviceDuration) > 1) { // Allow 1 minute tolerance
    errors.push(`Appointment duration (${appointmentDuration}min) doesn't match service duration (${serviceDuration}min)`);
  }

  // 3. Check working hours (professional and salon)
  const dayOfWeek = startTime.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const professional = await profRepository.findByTenantAndId(tenantId, professionalId);

  if (professional?.workingHours?.[dayOfWeek]) {
    const workingHours = professional.workingHours[dayOfWeek];
    if (!workingHours.isWorking) {
      errors.push(`Professional is not working on ${dayOfWeek}`);
    } else {
      const workStart = new Date(startTime);
      const workEnd = new Date(startTime);
      const [startHour, startMin] = workingHours.start.split(':').map(Number);
      const [endHour, endMin] = workingHours.end.split(':').map(Number);

      workStart.setHours(startHour, startMin, 0, 0);
      workEnd.setHours(endHour, endMin, 0, 0);

      if (startTime < workStart || endTime > workEnd) {
        errors.push(`Appointment time (${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}) is outside professional working hours (${workingHours.start} - ${workingHours.end})`);
      }
    }
  }

  // 4. Check buffer time conflicts (including preparation/cleanup time)
  const bufferMs = bufferMinutes * 60 * 1000;
  const checkStart = new Date(startTime.getTime() - bufferMs);
  const checkEnd = new Date(endTime.getTime() + bufferMs);

  const appointmentConflicts = await appointmentRepository.findConflicts(
    tenantId,
    professionalId,
    checkStart,
    checkEnd,
    excludeAppointmentId
  );

  if (appointmentConflicts.length > 0) {
    conflicts.push(...appointmentConflicts);
    errors.push(`Time slot conflicts with ${appointmentConflicts.length} existing appointment(s) (including ${bufferMinutes}min buffer)`);
  }

  // 5. Check if customer has overlapping appointments
  const customerConflicts = await appointmentRepository.findByCustomer(tenantId, customerId);
  const overlappingCustomerAppointments = customerConflicts.filter(apt => {
    if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
    const aptStart = new Date(apt.startTime);
    const aptEnd = new Date(apt.endTime);
    return (startTime < aptEnd && endTime > aptStart);
  });

  if (overlappingCustomerAppointments.length > 0) {
    conflicts.push(...overlappingCustomerAppointments);
    errors.push('Customer has overlapping appointments');
  }

  // 6. Check for appointments too close together (minimum 15min gap without buffer)
  const professionalAppointments = await appointmentRepository.findByProfessional(tenantId, professionalId);
  const sameDayAppointments = professionalAppointments.filter(apt => {
    const aptDate = new Date(apt.startTime);
    return aptDate.toDateString() === startTime.toDateString();
  });

  const minGapMs = 15 * 60 * 1000; // 15 minutes minimum gap
  for (const apt of sameDayAppointments) {
    if (excludeAppointmentId && apt.id === excludeAppointmentId) continue;

    const aptStart = new Date(apt.startTime);
    const aptEnd = new Date(apt.endTime);

    // Check if appointment is too close before or after
    const timeDiffBefore = Math.abs(startTime.getTime() - aptEnd.getTime());
    const timeDiffAfter = Math.abs(endTime.getTime() - aptStart.getTime());

    if (timeDiffBefore < minGapMs || timeDiffAfter < minGapMs) {
      conflicts.push(apt);
      errors.push('Appointments must have at least 15 minutes gap between them');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    conflicts
  };
};

export const store = async (req: Request, res: Response) => {
  const lockKey = `lock:appointment:${req.body.professionalId}:${new Date(req.body.startTime).toISOString()}`;
  let lockId: string | null = null;

  try {
    // Adquirir lock distribuído para evitar double-booking
    lockId = await redisClient.acquireLock(lockKey, 10);
    if (!lockId) {
      return res.status(409).json({ error: 'Time slot being booked by another user, please try again' });
    }

    const data = createAppointmentSchema.parse(req.body);
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    // Validação 1: startTime deve ser antes de endTime
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    // Validação 2: Buscar cliente e serviço antes de criar o agendamento
    const customer = await customerRepository.findById(data.customerId);
    if (!customer || customer.tenantId !== data.tenantId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const service = await serviceRepository.findByTenantAndId(data.tenantId, data.serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Validação 3: Buscar profissional para pegar buffer_minutes
    const professional = await profRepository.findByTenantAndId(data.tenantId, data.professionalId);
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }

    // Validação 4: Verificar conflitos robustos com buffer time e working hours
    const validation = await validateAppointmentConflicts(
      data.tenantId,
      data.professionalId,
      data.customerId,
      startTime,
      endTime,
      service.durationMinutes,
      professional.bufferMinutes
    );

    if (!validation.isValid) {
      return res.status(409).json({
        error: 'Appointment validation failed',
        details: validation.errors,
        conflicts: validation.conflicts.map(c => ({
          id: c.id,
          startTime: c.startTime,
          endTime: c.endTime,
          customerName: c.customerName,
        })),
      });
    }

    // Criar agendamento
    const appointment = await appointmentRepository.create({
      tenantId: data.tenantId,
      customerId: data.customerId,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      startTime,
      endTime,
      status: 'scheduled',
      internalNotes: data.internalNotes,
    });

    // Atualizar tag e última visita do cliente automaticamente
    try {
      const customerAppointments = await appointmentRepository.findByCustomer(
        data.tenantId,
        data.customerId
      );
      const appointmentCount = customerAppointments.filter(a => a.status !== 'cancelled').length;
      const autoTags = getCustomerTagsByAppointmentCount(appointmentCount);
      const preservedTags = (customer.tags || []).filter(
        tag => !autoAppointmentTags.includes(tag.toLowerCase())
      );
      const updatedTags = [...new Set([...preservedTags, ...autoTags])];

      await customerRepository.update(customer.id, {
        tags: updatedTags,
        lastVisit: startTime,
      });
    } catch (updateError) {
      console.error('Failed to update customer tags/lastVisit:', updateError);
    }

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  } finally {
    // Liberar lock distribuído
    if (lockId) {
      await redisClient.releaseLock(lockKey, lockId);
    }
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.params.tenantId || req.query.tenantId) as string;
    const { customerId, professionalId, startDate, endDate } = req.query;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    let appointments;
    if (customerId) {
      appointments = await appointmentRepository.findByCustomer(
        tenantId as string,
        customerId as string
      );
    } else if (professionalId) {
      appointments = await appointmentRepository.findByProfessional(
        tenantId as string,
        professionalId as string
      );
    } else if (startDate && endDate) {
      appointments = await appointmentRepository.findByDateRange(
        tenantId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      appointments = await appointmentRepository.findByTenant(tenantId as string);
    }

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const appointment = await appointmentRepository.findByTenantAndId(tenantId, id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const data = updateAppointmentSchema.parse(req.body);
    
    const existing = await appointmentRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const updated = await appointmentRepository.update(id, data);

    if (data.status === 'completed' && existing.status !== 'completed') {
      automationEngine.runForAppointmentCompleted(tenantId, id).catch(error => {
        console.error('Automation execution failed for appointment completion:', error);
      });
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    
    const existing = await appointmentRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const updated = await appointmentRepository.update(id, { status: 'cancelled' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};
