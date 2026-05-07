import { Request, Response } from 'express';
import { z } from 'zod';
import { AutomationRepositoryImpl } from '../models/AutomationRepositoryImpl';
import { pool } from '../database/connection';
import { AutomationEngine } from '../services/AutomationEngine';

const automationRepo = new AutomationRepositoryImpl(pool);
const automationEngine = new AutomationEngine();

const createAutomationSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(3),
  trigger: z.string(),
  condition: z.record(z.any()).optional().default({}),
  action: z.string(),
  actionPayload: z.record(z.any()).optional(),
  isActive: z.boolean().optional().default(true),
});

const updateAutomationSchema = z.object({
  name: z.string().min(3).optional(),
  trigger: z.string().optional(),
  condition: z.record(z.any()).optional(),
  action: z.string().optional(),
  actionPayload: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const index = async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    const automations = await automationRepo.findByTenant(tenantId);
    res.json(automations);
  } catch (error) {
    console.error('Failed to list automations', error);
    res.status(500).json({ error: 'Failed to list automations' });
  }
};

export const store = async (req: Request, res: Response) => {
  try {
    const data = createAutomationSchema.parse(req.body);
    const automation = await automationRepo.create(data);
    res.status(201).json(automation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid payload', details: error.errors });
    }
    console.error('Failed to create automation', error);
    res.status(500).json({ error: 'Failed to create automation' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateAutomationSchema.parse(req.body);
    const automation = await automationRepo.update(id, data);
    res.json(automation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid payload', details: error.errors });
    }
    console.error('Failed to update automation', error);
    res.status(500).json({ error: 'Failed to update automation' });
  }
};

export const execute = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId as string || req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const result = await automationEngine.runLastVisitRules(tenantId);
    res.json({ ok: true, triggered: result.triggered });
  } catch (error) {
    console.error('Failed to execute automations', error);
    res.status(500).json({ error: 'Failed to execute automations' });
  }
};
