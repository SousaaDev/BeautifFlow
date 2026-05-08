import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { ProductRepositoryImpl } from '../models/ProductRepositoryImpl';
import { StockMovementRepositoryImpl } from '../models/StockMovementRepositoryImpl';

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  currentStock: z.number().int().min(0).optional().default(0),
  stock: z.number().int().min(0).optional(),
  minThreshold: z.number().int().min(0).optional().default(5),
  minStock: z.number().int().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional().default(true),
});

const updateProductSchema = z.object({
  tenantId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  currentStock: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  minThreshold: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  adjustStock: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const stockMovementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().int().min(1),
  reason: z.string().optional(),
  referenceId: z.string().optional(),
});

const productRepository = new ProductRepositoryImpl(pool);
const stockMovementRepository = new StockMovementRepositoryImpl(pool);

export const store = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const data = createProductSchema.parse(req.body);
    const product = await productRepository.create({
      tenantId,
      name: data.name,
      currentStock: data.stock || data.currentStock || 0,
      minThreshold: data.minStock || data.minThreshold || 5,
      costPrice: data.costPrice || 0,
      salePrice: data.price || data.salePrice || 0,
      isActive: data.isActive !== false,
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

    // Map frontend field names to backend field names
    if (data.stock !== undefined) {
      data.currentStock = data.stock;
      delete data.stock;
    }
    
    if (data.minStock !== undefined) {
      data.minThreshold = data.minStock;
      delete data.minStock;
    }

    if (data.price !== undefined) {
      data.salePrice = data.price;
      delete data.price;
    }
    
    // Handle stock adjustment
    if (data.adjustStock !== undefined) {
      const newStock = existing.currentStock + data.adjustStock;
      if (newStock < 0) {
        return res.status(400).json({ error: 'Stock cannot be negative' });
      }
      data.currentStock = newStock;
      delete data.adjustStock;
    }
    
    const updated = await productRepository.update(id, data);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Failed to update product', error);
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

// Stock Management Functions
export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const { type, quantity, reason, referenceId } = stockMovementSchema.parse(req.body);

    const existing = await productRepository.findByTenantAndId(tenantId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate new stock level
    let newStock: number;
    if (type === 'OUT' || type === 'ADJUSTMENT') {
      newStock = existing.currentStock - quantity;
      if (newStock < 0) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
    } else { // IN
      newStock = existing.currentStock + quantity;
    }

    // Update product stock
    await productRepository.update(id, { currentStock: newStock });

    // Record stock movement
    const movement = await stockMovementRepository.create({
      tenantId,
      productId: id,
      type,
      quantity,
      reason,
      referenceId,
      createdBy: undefined, // TODO: Add user authentication middleware
    });

    res.json({
      product: { ...existing, currentStock: newStock },
      movement,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
};

const productMoveParamsSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid(),
});

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const params = productMoveParamsSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: 'Invalid tenantId or product id', details: params.error.errors });
    }

    const { id, tenantId } = params.data;
    const movements = await stockMovementRepository.findByProductAndTenant(id, tenantId);
    res.json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
};

export const getStockAlerts = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const alerts = await stockMovementRepository.getStockAlerts(tenantId);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock alerts' });
  }
};

export const getAllStockMovements = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const movements = await stockMovementRepository.findByTenant(tenantId);
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
};
