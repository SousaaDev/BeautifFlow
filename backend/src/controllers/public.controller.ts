import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl';
import { ProfessionalRepositoryImpl } from '../models/ProfessionalRepositoryImpl';
import { ServiceRepositoryImpl } from '../models/ServiceRepositoryImpl';
import { AppointmentRepositoryImpl } from '../models/AppointmentRepositoryImpl';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { validateAppointmentConflicts } from './appointment.controller';

const tenantRepository = new TenantRepositoryImpl(pool);
const professionalRepository = new ProfessionalRepositoryImpl(pool);
const serviceRepository = new ServiceRepositoryImpl(pool);
const appointmentRepository = new AppointmentRepositoryImpl(pool);
const customerRepository = new CustomerRepositoryImpl(pool);

const signCustomerToken = (payload: object, expiresIn = '7d') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, secret as jwt.Secret, options);
};

const getDateKey = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

const parseWorkingHours = (range: string) => {
  const [start, end] = range.split('-').map((value) => value.trim());
  if (!start || !end) return null;
  return { start, end };
};

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const parseTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
};

const buildDateFromTime = (baseDate: Date, time: string) => {
  const parsed = parseTime(time);
  if (!parsed) return null;
  const date = new Date(baseDate);
  date.setHours(parsed.hours, parsed.minutes, 0, 0);
  date.setMilliseconds(0);
  return date;
};

const formatSlot = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const addMinutes = (date: Date, minutes: number) => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

const isOverlapping = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) => startA < endB && endA > startB;

const getBusinessHoursForDate = async (tenantId: string, professionalId: string, date: Date) => {
  const professional = await professionalRepository.findByTenantAndId(tenantId, professionalId);
  const dayKeyFull = getDateKey(date);
  const dayKeyShort = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

  if (professional?.workingHours) {
    const professionalHours = professional.workingHours[dayKeyFull] || professional.workingHours[dayKeyShort];
    if (professionalHours) {
      return professionalHours.isWorking ? professionalHours : null;
    }
  }

  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) {
    return null;
  }

  const range = tenant.businessHours[dayKeyFull] || tenant.businessHours[dayKeyShort];
  if (!range) {
    return null;
  }

  return parseWorkingHours(range);
};

const findExistingCustomer = async (
  tenantId: string,
  email: string,
  phone?: string
) => {
  const result = await pool.query(
    `SELECT id, tenant_id as "tenantId", name, phone, email, tags, last_visit as "lastVisit", created_at as "createdAt", deleted_at as "deletedAt"
     FROM customers
     WHERE tenant_id = $1 AND (email = $2 OR phone = $3)
     LIMIT 1`,
    [tenantId, email, phone || null]
  );
  return result.rows[0] || null;
};

const getSalonData = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const tenant = await tenantRepository.findBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const professionals = await professionalRepository.findByTenant(tenant.id);
    const services = await serviceRepository.findByTenant(tenant.id);

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      professionals,
      services: services.map((service) => ({
        id: service.id,
        tenantId: service.tenantId,
        name: service.name,
        price: service.price,
        duration: service.durationMinutes,
        isActive: service.isActive,
      })),
    });
  } catch (error) {
    console.error('Error fetching public salon data:', error);
    res.status(500).json({ error: 'Failed to load salon information' });
  }
};

const availableSlotsSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const registerCustomerSchema = z.object({
  slug: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas nao coincidem',
  path: ['confirmPassword'],
});

const loginCustomerSchema = z.object({
  slug: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const query = availableSlotsSchema.parse(req.query);
    const tenant = await tenantRepository.findBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const service = await serviceRepository.findByTenantAndId(tenant.id, query.serviceId);
    const professional = await professionalRepository.findByTenantAndId(tenant.id, query.professionalId);
    if (!service || !professional) {
      return res.status(404).json({ error: 'Service or professional not found' });
    }

    const selectedDate = parseDateOnly(query.date);
    const workingHours = await getBusinessHoursForDate(tenant.id, professional.id, selectedDate);
    if (!workingHours) {
      return res.json([]);
    }

    const workStart = buildDateFromTime(selectedDate, workingHours.start);
    const workEnd = buildDateFromTime(selectedDate, workingHours.end);

    if (!workStart || !workEnd) {
      return res.json([]);
    }

    const appointments = await appointmentRepository.findByProfessional(tenant.id, professional.id);
    const activeAppointments = appointments.filter((appointment) =>
      appointment.status !== 'cancelled' && appointment.status !== 'no_show'
    ).filter((appointment) => {
      const appointmentDate = new Date(appointment.startTime);
      return appointmentDate.toDateString() === selectedDate.toDateString();
    });

    const now = new Date();
    const durationMs = service.durationMinutes * 60 * 1000;
    const bufferMs = professional.bufferMinutes * 60 * 1000;

    const availableSlots: string[] = [];
    for (let current = new Date(workStart); current.getTime() + durationMs <= workEnd.getTime(); current = addMinutes(current, 30)) {
      const slotStart = new Date(current);
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      if (selectedDate.toDateString() === now.toDateString() && slotStart < now) {
        continue;
      }

      const isValid = activeAppointments.every((appointment) => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointment.endTime);
        const blockedStart = new Date(appointmentStart.getTime() - bufferMs);
        const blockedEnd = new Date(appointmentEnd.getTime() + bufferMs);
        return !isOverlapping(slotStart, slotEnd, blockedStart, blockedEnd);
      });

      if (isValid) {
        availableSlots.push(formatSlot(slotStart));
      }
    }

    res.json(availableSlots);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error computing available slots:', error);
    res.status(500).json({ error: 'Failed to compute available slots' });
  }
};

const createPublicAppointmentSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  customerId: z.union([z.string().uuid(), z.literal('')]).optional().transform((value) => (value === '' ? undefined : value)),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
});

const createPublicAppointment = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const data = createPublicAppointmentSchema.parse(req.body);
    const tenant = await tenantRepository.findBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const professional = await professionalRepository.findByTenantAndId(tenant.id, data.professionalId);
    const service = await serviceRepository.findByTenantAndId(tenant.id, data.serviceId);
    if (!professional || !service) {
      return res.status(404).json({ error: 'Service or professional not found' });
    }

    let customer = null;
    if (data.customerId) {
      customer = await customerRepository.findById(data.customerId);
      if (!customer || customer.tenantId !== tenant.id) {
        return res.status(404).json({ error: 'Customer not found' });
      }
    } else {
      const existingCustomer = await findExistingCustomer(tenant.id, data.customerEmail, data.customerPhone);
      if (existingCustomer) {
        customer = existingCustomer;
      } else {
        customer = await customerRepository.create({
          tenantId: tenant.id,
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        });
      }
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    const validation = await validateAppointmentConflicts(
      tenant.id,
      professional.id,
      customer.id,
      startTime,
      endTime,
      service.durationMinutes,
      professional.bufferMinutes
    );

    if (!validation.isValid) {
      return res.status(409).json({
        error: 'Appointment validation failed',
        details: validation.errors,
        conflicts: validation.conflicts.map((conflict) => ({
          id: conflict.id,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          customerName: conflict.customerName,
        })),
      });
    }

    const appointment = await appointmentRepository.create({
      tenantId: tenant.id,
      customerId: customer.id,
      professionalId: professional.id,
      serviceId: service.id,
      startTime,
      endTime,
      status: 'scheduled',
      priceCharged: service.price,
    });

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Error creating public appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

const registerCustomer = async (req: Request, res: Response) => {
  try {
    const data = registerCustomerSchema.parse(req.body);
    const tenant = await tenantRepository.findBySlug(data.slug);
    if (!tenant) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const existingCustomer = await customerRepository.findByEmail(tenant.id, data.email);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    let customer;
    if (existingCustomer) {
      if (existingCustomer.passwordHash) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      customer = await customerRepository.update(existingCustomer.id, {
        name: data.name,
        phone: data.phone || existingCustomer.phone,
        passwordHash: hashedPassword,
      });
    } else {
      customer = await customerRepository.create({
        tenantId: tenant.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: hashedPassword,
      });
    }

    const token = signCustomerToken({ customerId: customer.id, tenantId: tenant.id });

    res.status(201).json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error registering public customer:', error);
    res.status(500).json({ error: 'Failed to register customer' });
  }
};

const loginCustomer = async (req: Request, res: Response) => {
  try {
    const data = loginCustomerSchema.parse(req.body);
    const tenant = await tenantRepository.findBySlug(data.slug);
    if (!tenant) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const customer = await customerRepository.findByEmail(tenant.id, data.email);
    if (!customer || !customer.passwordHash) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const passwordMatches = await bcrypt.compare(data.password, customer.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const token = signCustomerToken({ customerId: customer.id, tenantId: tenant.id });

    res.json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error logging in public customer:', error);
    res.status(500).json({ error: 'Failed to login customer' });
  }
};

export {
  getSalonData,
  getAvailableSlots,
  createPublicAppointment,
  registerCustomer,
  loginCustomer,
};
