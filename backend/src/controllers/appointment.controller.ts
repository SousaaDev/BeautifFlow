import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { AppointmentRepositoryImpl } from '../models/AppointmentRepositoryImpl';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { ProfessionalRepositoryImpl } from '../models/ProfessionalRepositoryImpl';
import { ServiceRepositoryImpl } from '../models/ServiceRepositoryImpl';

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

export const store = async (req: Request, res: Response) => {
  try {
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

    // Validação 4: Verificar conflito de slot (com buffer time)
    const bufferMs = professional.bufferMinutes * 60 * 1000;
    const adjustedStartTime = new Date(startTime.getTime() - bufferMs);
    const adjustedEndTime = new Date(endTime.getTime() + bufferMs);

    const conflicts = await appointmentRepository.findConflicts(
      data.tenantId,
      data.professionalId,
      adjustedStartTime,
      adjustedEndTime
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Time slot not available',
        conflicts: conflicts.map(c => ({
          id: c.id,
          startTime: c.startTime,
          endTime: c.endTime,
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
