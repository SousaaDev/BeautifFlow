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

const readJsonBody = (req: Request): Record<string, unknown> => {
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return {};
  return b as Record<string, unknown>;
};

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const auth = req as any;

  // 1. LOGS DE DIAGNÓSTICO (Obrigatório para ver no Railway)
  console.log("--- INÍCIO DO UPDATE TENANT ---");
  console.log("ID da URL (req.params):", id);
  console.log("Body bruto (req.body):", JSON.stringify(req.body, null, 2));
  console.log("Usuário vindo do Token (req.user):", auth.user);

  const authUser = auth.user as { tenantId?: string; tenant_id?: string } | undefined;
  const tenantIdDoToken = String(authUser?.tenantId ?? authUser?.tenant_id ?? "");

  // 2. VALIDAÇÃO DE SEGURANÇA
  if (tenantIdDoToken !== String(id)) {
    console.error("BLOQUEIO: ID do token não coincide com o ID da URL", { 
      token: tenantIdDoToken, 
      url: id 
    });
    return res.status(403).json({ error: 'Forbidden: Cannot update this tenant' });
  }

  try {
    const body = readJsonBody(req);
    const updateData: Partial<Tenant> = {};

    // Mapeamento manual dos campos
    if (Object.prototype.hasOwnProperty.call(body, 'name') && typeof body.name === 'string') {
      updateData.name = body.name;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'slug') && typeof body.slug === 'string') {
      updateData.slug = body.slug;
    }

    const hasBusinessHours =
      Object.prototype.hasOwnProperty.call(body, 'businessHours') ||
      Object.prototype.hasOwnProperty.call(body, 'business_hours');
    
    if (hasBusinessHours) {
      const hoursRaw = body.businessHours ?? body.business_hours;
      updateData.businessHours = normalizeBusinessHoursPayload(hoursRaw ?? {});
      console.log("Horários normalizados para salvar:", updateData.businessHours);
    }

    const hasBuffer =
      Object.prototype.hasOwnProperty.call(body, 'bufferMinutes') ||
      Object.prototype.hasOwnProperty.call(body, 'buffer_minutes');
    
    if (hasBuffer) {
      const bufferRaw = body.bufferMinutes ?? body.buffer_minutes;
      const n = Number(bufferRaw);
      if (!Number.isNaN(n) && n >= 0) {
        updateData.bufferMinutes = Math.floor(n);
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'trialEndsAt') && typeof body.trialEndsAt === 'string') {
      const t = body.trialEndsAt.trim();
      if (t) updateData.trialEndsAt = new Date(t);
    }

    // 3. SE CHEGAR AQUI VAZIO, O FRONTEND ESTÁ ENVIANDO CHAVES ERRADAS
    if (Object.keys(updateData).length === 0) {
      console.error("ERRO 400: Nenhum campo válido foi identificado no body.");
      return res.status(400).json({ error: 'No fields to update' });
    }

    const tenant = await tenantRepository.update(id, updateData);
    console.log("SUCESSO: Tenant atualizado no banco.");
    res.json({ message: 'Tenant updated', tenant });

  } catch (error) {
    console.error("ERRO DURANTE O UPDATE:", error);
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