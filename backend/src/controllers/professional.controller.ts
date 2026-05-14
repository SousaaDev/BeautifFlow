import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { ProfessionalRepositoryImpl } from '../models/ProfessionalRepositoryImpl';

const createProfessionalSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  commissionRate: z.number().min(0).max(100).default(0),
  bufferMinutes: z.number().int().min(0).default(10),
  isActive: z.boolean().optional(),
});

const updateProfessionalSchema = createProfessionalSchema.partial();

const updateProfessionalServicesSchema = z.object({
  serviceIds: z.array(z.string().uuid()),
});

const profRepository = new ProfessionalRepositoryImpl(pool);

export const store = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const data = createProfessionalSchema.parse(req.body);
    const professional = await profRepository.create({
      tenantId,
      name: data.name,
      phone: data.phone,
      commissionRate: data.commissionRate,
      bufferMinutes: data.bufferMinutes,
      workingHours: {},
      isActive: data.isActive ?? true,
    });
    await profRepository.seedAllActiveServicesForProfessional(tenantId, professional.id);
    const full = await profRepository.findByTenantAndId(tenantId, professional.id);
    res.status(201).json(full ?? professional);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating professional:', error);
    res.status(500).json({ error: 'Failed to create professional', details: error instanceof Error ? error.message : String(error) });
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.params.tenantId || req.query.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }
    const professionals = await profRepository.findByTenant(tenantId);
    res.json(professionals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const professional = await profRepository.findByTenantAndId(tenantId, id);
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    res.json(professional);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch professional' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const data = updateProfessionalSchema.parse(req.body);

    const existing = await profRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Professional not found' });
    }

    const updated = await profRepository.update(id, {
      ...data,
      workingHours: {},
    });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update professional' });
  }
};

export const updateServices = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const { serviceIds } = updateProfessionalServicesSchema.parse(req.body);

    const existing = await profRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Professional not found' });
    }

    await profRepository.setProfessionalServices(tenantId, id, serviceIds);
    const full = await profRepository.findByTenantAndId(tenantId, id);
    res.json(full ?? existing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof Error && error.message.includes('invalid')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error updating professional services:', error);
    res.status(500).json({ error: 'Failed to update professional services' });
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const existing = await profRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    await profRepository.delete(id);
    res.json({ message: 'Professional deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete professional' });
  }
};
