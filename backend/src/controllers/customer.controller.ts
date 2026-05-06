import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';
import { CreateCustomer } from '../services/CreateCustomer';

const customerRepository = new CustomerRepositoryImpl(pool);
const createCustomerUseCase = new CreateCustomer(customerRepository);

const createCustomerSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  lastVisit: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  lastVisit: z.string().optional(),
});

export const store = async (req: Request, res: Response) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await createCustomerUseCase.execute({
      tenantId: data.tenantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      tags: data.tags,
      lastVisit: data.lastVisit ? new Date(data.lastVisit) : undefined,
    });
    res.status(201).json({ message: 'Customer created', customer });
  } catch (error) {
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
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
