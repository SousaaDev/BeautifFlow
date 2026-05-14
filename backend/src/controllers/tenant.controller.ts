import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl';
import { Tenant } from '../models/Tenant';
import { CreateTenant } from '../services/CreateTenant';
import { normalizeBusinessHoursPayload } from '../utils/businessHoursSchedule';

// Placeholder schemas
const createTenantSchema = z
  .object({
    name: z.string(),
    slug: z.string(),
    businessHours: z.unknown().optional(),
    bufferMinutes: z.number().int().min(0).optional().default(10),
  })
  .transform((data) => ({
    name: data.name,
    slug: data.slug,
    businessHours: normalizeBusinessHoursPayload(data.businessHours ?? {}),
    bufferMinutes: data.bufferMinutes,
  }));

const tenantRepository = new TenantRepositoryImpl(pool);
const createTenantUseCase = new CreateTenant(tenantRepository);

export const store = async (req: Request, res: Response) => {
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

export const show = async (req: Request, res: Response) => {
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

const updateTenantSchema = z
  .object({
    name: z.string().optional(),
    slug: z.string().optional(),
    businessHours: z.unknown().optional(),
    business_hours: z.unknown().optional(),
    bufferMinutes: z.number().int().min(0).optional(),
    buffer_minutes: z.number().int().min(0).optional(),
    trialEndsAt: z.string().optional(),
  })
  .passthrough();

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const auth = req as any;

  // Verify the user can only update their own tenant (UUID vs string seguro)
  const authUser = auth.user as { tenantId?: string; tenant_id?: string } | undefined;
  if (String(authUser?.tenantId ?? authUser?.tenant_id) !== String(id)) {
    return res.status(403).json({ error: 'Forbidden: Cannot update this tenant' });
  }

  try {
    const data = updateTenantSchema.parse(req.body);
    const rawBody = req.body as Record<string, unknown>;
    const hoursRaw =
      data.businessHours !== undefined && data.businessHours !== null
        ? data.businessHours
        : data.business_hours !== undefined && data.business_hours !== null
          ? data.business_hours
          : rawBody?.business_hours ?? rawBody?.businessHours;

    const updateData: Partial<Tenant> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (hoursRaw !== undefined && hoursRaw !== null) {
      updateData.businessHours = normalizeBusinessHoursPayload(hoursRaw);
    }
    const bufferVal = data.bufferMinutes ?? data.buffer_minutes;
    if (bufferVal !== undefined) {
      updateData.bufferMinutes = bufferVal;
    }
    if (data.trialEndsAt) {
      updateData.trialEndsAt = new Date(data.trialEndsAt);
    }

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

export const destroy = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await tenantRepository.delete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};