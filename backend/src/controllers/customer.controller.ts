import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { CreateCustomer } from '../services/CreateCustomer';

const customerRepository = new CustomerRepositoryImpl(pool);
const createCustomerUseCase = new CreateCustomer(customerRepository);

const phoneDigits = (v: string) => v.replace(/\D/g, '');

const phoneSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => phoneDigits(v).length >= 8, {
    message: 'Telefone deve ter pelo menos 8 digitos',
  });

const optionalPhoneUpdate = phoneSchema.optional();

const optionalBirthDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === null || v === undefined ? undefined : v));

const createCustomerSchema = z.object({
  name: z.string().min(2),
  phone: phoneSchema,
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().email().optional()
  ),
  birthDate: optionalBirthDate,
  tags: z.array(z.string()).optional(),
  lastVisit: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  phone: optionalPhoneUpdate,
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().email().optional()
  ),
  birthDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()])
    .optional()
    .transform((v) => {
      if (v === '') return null;
      if (v === null) return null;
      return v;
    }),
  tags: z.array(z.string()).optional(),
  lastVisit: z.string().optional(),
});

export const store = async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const data = createCustomerSchema.parse(req.body);
    const customer = await createCustomerUseCase.execute({
      tenantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate,
      tags: data.tags,
      lastVisit: data.lastVisit ? new Date(data.lastVisit) : undefined,
    });
    res.status(201).json({ message: 'Customer created', customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: 'Invalid input' });
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    const filters = {
      tenantId: req.query.tenantId as string | undefined,
      tag: req.query.tag as string | undefined,
      lastVisitAfter: req.query.lastVisitAfter ? new Date(req.query.lastVisitAfter as string) : undefined,
      lastVisitBefore: req.query.lastVisitBefore ? new Date(req.query.lastVisitBefore as string) : undefined,
    };
    const customers = await customerRepository.findAll(filters);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const customer = await customerRepository.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const data = updateCustomerSchema.parse(req.body);
    const customer = await customerRepository.update(req.params.id, {
      name: data.name,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate,
      tags: data.tags,
      lastVisit: data.lastVisit ? new Date(data.lastVisit) : undefined,
    });
    res.json({ message: 'Customer updated', customer });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: 'Invalid input' });
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    await customerRepository.delete(req.params.id);
    res.json({ message: 'Customer deleted (soft delete for LGPD compliance)' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Soft delete and restore functions
export const softDelete = async (req: Request, res: Response) => {
  try {
    await customerRepository.softDelete(req.params.id);
    res.json({ message: 'Customer soft deleted for LGPD compliance' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const restore = async (req: Request, res: Response) => {
  try {
    await customerRepository.restore(req.params.id);
    const customer = await customerRepository.findById(req.params.id);
    res.json({ message: 'Customer restored', customer });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDeleted = async (req: Request, res: Response) => {
  try {
    const filters = {
      tenantId: req.query.tenantId as string | undefined,
      includeDeleted: true,
    };
    const customers = await customerRepository.findAll(filters);
    const deletedCustomers = customers.filter(c => c.deletedAt);
    res.json(deletedCustomers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
