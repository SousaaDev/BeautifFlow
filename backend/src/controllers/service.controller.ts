import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { ServiceRepositoryImpl } from '../models/ServiceRepositoryImpl';

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0).default(0),
  commissionRate: z.number().min(0).max(100).default(0),
});

const updateServiceSchema = createServiceSchema.partial();

const serviceRepository = new ServiceRepositoryImpl(pool);

export const store = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const data = createServiceSchema.parse(req.body);
    const service = await serviceRepository.create({
      tenantId,
      name: data.name,
      durationMinutes: data.duration,
      price: data.price,
      commissionRate: data.commissionRate,
      isActive: true,
    });
    try {
      await pool.query(
        `INSERT INTO professional_services (professional_id, service_id)
         SELECT p.id, $1::uuid FROM professionals p
         WHERE p.tenant_id = $2
         ON CONFLICT DO NOTHING`,
        [service.id, tenantId]
      );
    } catch (e) {
      console.warn('Warning: failed to seed professional services for new service:', e);
    }
    res.status(201).json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service', details: error instanceof Error ? error.message : String(error) });
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.params.tenantId || req.query.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }
    const services = await serviceRepository.findByTenant(tenantId);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    if (!tenantId || !id) {
      return res.status(400).json({ error: 'tenantId and id are required' });
    }
    const service = await serviceRepository.findByTenantAndId(tenantId, id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    if (!tenantId || !id) {
      return res.status(400).json({ error: 'tenantId and id are required' });
    }

    const data = updateServiceSchema.parse(req.body);
    
    const existing = await serviceRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const updated = await serviceRepository.update(id, {
      name: data.name,
      durationMinutes: data.duration,
      price: data.price,
      commissionRate: data.commissionRate,
    });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update service' });
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    if (!tenantId || !id) {
      return res.status(400).json({ error: 'tenantId and id are required' });
    }
    const existing = await serviceRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Service not found' });
    }
    await serviceRepository.delete(id);
    res.json({ message: 'Service deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to delete service' });
  }
};
