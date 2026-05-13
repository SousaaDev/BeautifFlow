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

const parseWorkingHours = (range: unknown) => {
  if (!range) return null;

  if (typeof range === 'string') {
    const normalized = range.trim().toLowerCase();
    if (normalized === 'closed' || normalized === 'fechado') return null;
    const [start, end] = range.split(/[-–—]/).map((value) => value.trim());
    if (!start || !end) return null;
    return { start, end };
  }

  if (typeof range === 'object' && range !== null) {
    const maybeRange = range as { start?: string; end?: string };
    if (maybeRange.start && maybeRange.end) {
      return { start: maybeRange.start.trim(), end: maybeRange.end.trim() };
    }
  }

  return null;
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

const getNormalizedScheduleValue = <T>(schedule: Record<string, T> | undefined, keys: string[]) => {
  if (!schedule) return undefined;
  const normalizedSchedule = Object.entries(schedule).reduce<Record<string, T>>((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = value;
    return acc;
  }, {} as Record<string, T>);

  return keys.reduce<T | undefined>((found, key) => found ?? normalizedSchedule[key.trim().toLowerCase()], undefined as T | undefined);
};

const getWeekdayKeys = (date: Date) => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNamesShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const ptDayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const ptDayNamesNoAccent = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'];
  const ptDayNamesShort = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const ptDayNamesShortNoAccent = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const keys: string[] = [];

  const addKey = (locale: string, format: 'long' | 'short') =>
    keys.push(date.toLocaleDateString(locale, { weekday: format }).toLowerCase());

  const isoDate = date.toISOString().slice(0, 10);
  keys.push(isoDate);
  addKey('en-US', 'long');
  addKey('en-US', 'short');
  addKey('pt-BR', 'long');
  addKey('pt-BR', 'short');
  keys.push(dayNames[date.getDay()]);
  keys.push(dayNamesShort[date.getDay()]);
  keys.push(ptDayNames[date.getDay()]);
  keys.push(ptDayNamesNoAccent[date.getDay()]);
  keys.push(ptDayNamesShort[date.getDay()]);
  keys.push(ptDayNamesShortNoAccent[date.getDay()]);
  keys.push(String(date.getDay()));

  return Array.from(new Set(keys.filter(Boolean)));
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

/** Dashboard sends per-day objects { isWorking, start, end }; detect to merge with tenant defaults correctly */
const isWorkingHoursEntry = (value: unknown): value is { isWorking?: boolean; start?: string; end?: string } =>
  typeof value === 'object' && value !== null && 'isWorking' in value;

const getBusinessHoursForDate = async (tenantId: string, professionalId: string, date: Date) => {
  const dayKeys = getWeekdayKeys(date);

  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) {
    return null;
  }

  let businessHoursValue: unknown = getNormalizedScheduleValue(tenant.businessHours, dayKeys);

  const professional = await professionalRepository.findByTenantAndId(tenantId, professionalId);
  if (professional?.workingHours && Object.keys(professional.workingHours).length > 0) {
    const professionalHours = getNormalizedScheduleValue(professional.workingHours, dayKeys);
    if (professionalHours !== undefined && professionalHours !== null) {
      if (isWorkingHoursEntry(professionalHours)) {
        if (professionalHours.isWorking === false) {
          return null;
        }
        const parsedProfessional = parseWorkingHours(professionalHours);
        if (parsedProfessional) {
          businessHoursValue = professionalHours;
        }
      } else if (parseWorkingHours(professionalHours)) {
        businessHoursValue = professionalHours;
      }
    }
  }

  if (!businessHoursValue) {
    return null;
  }

  return parseWorkingHours(businessHoursValue);
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
        price: Number(service.price ?? 0),
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

    console.log('🕐 Horários de trabalho:', {
      selectedDate: selectedDate.toDateString(),
      workingHours,
      workStart: workStart.toLocaleString(),
      workEnd: workEnd.toLocaleString(),
      durationMinutes: service.durationMinutes,
    });

    const appointments = await appointmentRepository.findByProfessional(tenant.id, professional.id);
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const activeAppointments = appointments
      .filter((appointment) => {
        const status = String(appointment.status ?? '').toLowerCase();
        return status !== 'cancelled' && status !== 'no_show';
      })
      .filter((appointment) => {
        const appointmentDate = new Date(appointment.startTime);
        return appointmentDate >= dayStart && appointmentDate < dayEnd;
      });

    const now = new Date();
    const durationMs = service.durationMinutes * 60 * 1000;
    // Use tenant's buffer_minutes (configured by owner), not professional's
    const bufferMs = tenant.bufferMinutes * 60 * 1000;

    const availableSlots: string[] = [];
    let slotCount = 0;
    // Permite slots que COMEÇAM até workEnd (mesmo que terminem depois)
    for (let current = new Date(workStart); current.getTime() <= workEnd.getTime(); current = addMinutes(current, 30)) {
      const slotStart = new Date(current);
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      // Validar que o slot começa dentro do horário de funcionamento
      // Slot pode terminar APÓS o fechamento, desde que comece antes
      if (slotStart.getTime() < workStart.getTime() || slotStart.getTime() > workEnd.getTime()) {
        continue;
      }

      // Remove slots que já passaram
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
        slotCount++;
      }
    }

    console.log('✅ Slots gerados:', {
      totalSlots: slotCount,
      slots: availableSlots,
    });

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

    // Use tenant's buffer_minutes (configured by owner)
    const validation = await validateAppointmentConflicts(
      tenant.id,
      professional.id,
      customer.id,
      startTime,
      endTime,
      service.durationMinutes,
      tenant.bufferMinutes
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
