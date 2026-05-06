import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { ProductRepositoryImpl } from '../models/ProductRepositoryImpl';

const createProductSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  currentStock: z.number().int().min(0).default(0),
  minThreshold: z.number().int().min(0).default(5),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
});

const updateProductSchema = createProductSchema.partial().extend({
  adjustStock: z.number().int().optional(),
});

const productRepository = new ProductRepositoryImpl(pool);

export const store = async (req: Request, res: Response) => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await productRepository.create({
      ...data,
      isActive: true,
    });
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.params.tenantId || req.query.tenantId) as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }
    const products = await productRepository.findByTenant(tenantId);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const product = await productRepository.findByTenantAndId(tenantId, id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const data = updateProductSchema.parse(req.body);
    
    const existing = await productRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Handle stock adjustment
    if (data.adjustStock !== undefined) {
      const newStock = existing.currentStock + data.adjustStock;
      if (newStock < 0) {
        return res.status(400).json({ error: 'Stock cannot be negative' });
      }
      data.currentStock = newStock;
      delete data.adjustStock; // Remove adjustStock from data as it's not a DB field
    }
    
    const updated = await productRepository.update(id, data);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const destroy = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const existing = await productRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await productRepository.delete(id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};
