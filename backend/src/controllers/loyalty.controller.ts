import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { LoyaltyRepositoryImpl } from '../models/LoyaltyRepositoryImpl';

const loyaltyRepository = new LoyaltyRepositoryImpl(pool);

const pointsTransactionSchema = z.object({
  points: z.number().int().min(1),
  reason: z.string().min(1),
  referenceId: z.string().optional(),
});

export const getPoints = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const loyalty = await loyaltyRepository.getPoints(customerId);

    if (!loyalty) {
      return res.json({ customerId, points: 0 });
    }

    res.json(loyalty);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get loyalty points' });
  }
};

export const addPoints = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { tenantId } = req.params;
    const { points, reason, referenceId } = pointsTransactionSchema.parse(req.body);

    const loyalty = await loyaltyRepository.addPoints(customerId, tenantId, points, reason, referenceId);
    res.json({ message: 'Points added successfully', loyalty });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add points' });
  }
};

export const redeemPoints = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { tenantId } = req.params;
    const { points, reason, referenceId } = pointsTransactionSchema.parse(req.body);

    const loyalty = await loyaltyRepository.redeemPoints(customerId, tenantId, points, reason, referenceId);
    res.json({ message: 'Points redeemed successfully', loyalty });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to redeem points' });
  }
};

export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const transactions = await loyaltyRepository.getTransactionHistory(customerId);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
};

export const getTopCustomers = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const topCustomers = await loyaltyRepository.getTopCustomersByPoints(tenantId, limit);
    res.json(topCustomers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get top customers' });
  }
};