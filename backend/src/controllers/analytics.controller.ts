import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { AnalyticsRepositoryImpl } from '../models/AnalyticsRepositoryImpl';

const analyticsRepo = new AnalyticsRepositoryImpl(pool);

const getPeriodSchema = z.object({
  tenantId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const getDateRange = (startDateStr?: string, endDateStr?: string) => {
  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  const startDate = startDateStr
    ? new Date(startDateStr)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // default 30 days

  return { startDate, endDate };
};

export const getOverview = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || req.params.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const { startDate, endDate } = getDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const overview = await analyticsRepo.getOverview(tenantId, startDate, endDate);
    res.json(overview);
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
};

export const getRetention = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || req.params.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const { startDate, endDate } = getDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const retention = await analyticsRepo.getRetention(tenantId, startDate, endDate);
    res.json(retention);
  } catch (error) {
    console.error('Error fetching retention:', error);
    res.status(500).json({ error: 'Failed to fetch retention metrics' });
  }
};

export const getChurn = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || req.params.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const inactiveThreshold = parseInt(req.query.inactiveThresholdDays as string) || 30;

    const churn = await analyticsRepo.getChurn(tenantId, inactiveThreshold);
    res.json(churn);
  } catch (error) {
    console.error('Error fetching churn:', error);
    res.status(500).json({ error: 'Failed to fetch churn metrics' });
  }
};

export const getTopCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || req.params.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const topCustomers = await analyticsRepo.getTopCustomers(tenantId, Math.min(limit, 100));
    res.json(topCustomers);
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
};

export const getTopServices = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || req.params.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const topServices = await analyticsRepo.getTopServices(tenantId, Math.min(limit, 100));
    res.json(topServices);
  } catch (error) {
    console.error('Error fetching top services:', error);
    res.status(500).json({ error: 'Failed to fetch top services' });
  }
};
