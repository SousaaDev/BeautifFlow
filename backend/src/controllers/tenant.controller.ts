import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl';
import { CreateTenant } from '../services/CreateTenant';

// Placeholder schemas
const createTenantSchema = z.object({
  name: z.string(),
  slug: z.string(),
  businessHours: z.record(z.string()),
});

const tenantRepository = new TenantRepositoryImpl(pool);
const createTenantUseCase = new CreateTenant(tenantRepository);

export const createTenant = async (req: Request, res: Response) => {
  try {
    const data = createTenantSchema.parse(req.body);
    const tenant = await createTenantUseCase.execute(data);
    res.status(201).json({ message: 'Tenant created', tenant });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'Invalid input' });
    }
  }
};

export const getTenant = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTenantSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  businessHours: z.record(z.string()).optional(),
  trialEndsAt: z.string().optional(),
});

export const updateTenant = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const data = updateTenantSchema.parse(req.body);
    const updateData = {
      ...data,
      trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : undefined,
    };
    const tenant = await tenantRepository.update(id, updateData);
    res.json({ message: 'Tenant updated', tenant });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'Invalid input' });
    }
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await tenantRepository.delete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};