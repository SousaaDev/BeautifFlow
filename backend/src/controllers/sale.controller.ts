import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection';
import { SaleRepositoryImpl } from '../models/SaleRepositoryImpl';
import { SaleItemRepositoryImpl } from '../models/SaleItemRepositoryImpl';
import { TransactionRepositoryImpl } from '../models/TransactionRepositoryImpl';
import { ProductRepositoryImpl } from '../models/ProductRepositoryImpl';
import { CustomerRepositoryImpl } from '../models/CustomerRepositoryImpl';

const createSaleSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal('')),
  professionalId: z.string().uuid().optional().or(z.literal('')),
  paymentMethod: z.string().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid().optional(),
      serviceId: z.string().uuid().optional(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1),
});

const saleRepository = new SaleRepositoryImpl(pool);
const saleItemRepository = new SaleItemRepositoryImpl(pool);
const transactionRepository = new TransactionRepositoryImpl(pool);
const productRepository = new ProductRepositoryImpl(pool);
const customerRepository = new CustomerRepositoryImpl(pool);

export const store = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const tenantId = req.params.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const data = createSaleSchema.parse(req.body);

    // Validar que cada item tem pelo menos productId ou serviceId
    const validItems = data.items.every(item => item.productId || item.serviceId);
    if (!validItems) {
      return res.status(400).json({ error: 'Each item must have either productId or serviceId' });
    }

    await client.query('BEGIN');

    // Calcular total
    const total = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = data.discount || 0;
    const finalAmount = Math.max(0, total - discount);

    // 1. Criar venda
    const sale = await client.query(
      `INSERT INTO sales (id, tenant_id, customer_id, professional_id, total, discount, final_amount, payment_method, notes)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id as "tenantId", customer_id as "customerId", professional_id as "professionalId",
                 total, discount, final_amount as "finalAmount", payment_method as "paymentMethod", notes, created_at as "createdAt"`,
      [tenantId, data.customerId || null, data.professionalId || null, total, discount, finalAmount, data.paymentMethod || null, data.notes || null]
    );
    const saleId = sale.rows[0].id;

    // 2. Criar itens de venda e decrementar estoque
    for (const item of data.items) {
      await client.query(
        `INSERT INTO sale_items (id, sale_id, product_id, service_id, quantity, unit_price)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [saleId, item.productId || null, item.serviceId || null, item.quantity, item.unitPrice]
      );

      // Decrementar estoque se for produto
      if (item.productId) {
        await client.query(
          `UPDATE products SET current_stock = current_stock - $1 WHERE id = $2`,
          [item.quantity, item.productId]
        );
      }
    }

    // 3. Lançar transação financeira
    await client.query(
      `INSERT INTO transactions (id, tenant_id, type, category, amount, payment_method, reference_id)
       VALUES (gen_random_uuid(), $1, 'IN', 'sale', $2, $3, $4)`,
      [tenantId, finalAmount, data.paymentMethod || 'cash', saleId]
    );

    // 4. Atualizar last_visit do cliente se existir
    if (data.customerId) {
      await client.query(
        `UPDATE customers SET last_visit = NOW() WHERE id = $1`,
        [data.customerId]
      );
    }

    await client.query('COMMIT');

    // Fetch items criados com IDs
    const createdItems = await saleItemRepository.findBySale(saleId);
    
    // Fetch customer and professional details
    const customerQuery = sale.rows[0].customerId 
      ? await pool.query('SELECT id, name FROM customers WHERE id = $1', [sale.rows[0].customerId])
      : null;
    const professionalQuery = sale.rows[0].professionalId
      ? await pool.query('SELECT id, name FROM professionals WHERE id = $1', [sale.rows[0].professionalId])
      : null;

    const saleWithItems = {
      ...sale.rows[0],
      customer: customerQuery?.rows[0] || null,
      professional: professionalQuery?.rows[0] || null,
      items: createdItems,
    };

    res.status(201).json(saleWithItems);
  } catch (error) {
    await client.query('ROLLBACK');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  } finally {
    client.release();
  }
};

export const index = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.params.tenantId || req.query.tenantId) as string;
    const { customerId, startDate, endDate } = req.query;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    let sales;
    if (customerId) {
      sales = await saleRepository.findByCustomer(tenantId as string, customerId as string);
    } else if (startDate && endDate) {
      sales = await saleRepository.findByDateRange(
        tenantId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      sales = await saleRepository.findByTenant(tenantId as string);
    }

    // Fetch items and relations for each sale
    const salesWithDetails = await Promise.all(
      sales.map(async (sale) => {
        const items = await saleItemRepository.findBySale(sale.id);
        
        // Fetch customer and professional details
        const customerQuery = sale.customerId 
          ? await pool.query('SELECT id, name FROM customers WHERE id = $1', [sale.customerId])
          : null;
        const professionalQuery = sale.professionalId
          ? await pool.query('SELECT id, name FROM professionals WHERE id = $1', [sale.professionalId])
          : null;
        
        // Fetch product/service details for items
        const itemsWithDetails = await Promise.all(
          items.map(async (item) => {
            let product = null;
            let service = null;
            
            if (item.productId) {
              const productQuery = await pool.query('SELECT id, name FROM products WHERE id = $1', [item.productId]);
              product = productQuery.rows[0] || null;
            }
            
            if (item.serviceId) {
              const serviceQuery = await pool.query('SELECT id, name FROM services WHERE id = $1', [item.serviceId]);
              service = serviceQuery.rows[0] || null;
            }
            
            return { ...item, product, service };
          })
        );

        return {
          ...sale,
          customer: customerQuery?.rows[0] || null,
          professional: professionalQuery?.rows[0] || null,
          items: itemsWithDetails,
        };
      })
    );

    res.json(salesWithDetails);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const { id, tenantId } = req.params;
    const sale = await saleRepository.findByTenantAndId(tenantId, id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await saleItemRepository.findBySale(id);
    
    // Fetch customer and professional details
    const customerQuery = sale.customerId 
      ? await pool.query('SELECT id, name FROM customers WHERE id = $1', [sale.customerId])
      : null;
    const professionalQuery = sale.professionalId
      ? await pool.query('SELECT id, name FROM professionals WHERE id = $1', [sale.professionalId])
      : null;
    
    // Fetch product/service details for items
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        let product = null;
        let service = null;
        
        if (item.productId) {
          const productQuery = await pool.query('SELECT id, name FROM products WHERE id = $1', [item.productId]);
          product = productQuery.rows[0] || null;
        }
        
        if (item.serviceId) {
          const serviceQuery = await pool.query('SELECT id, name FROM services WHERE id = $1', [item.serviceId]);
          service = serviceQuery.rows[0] || null;
        }
        
        return { ...item, product, service };
      })
    );

    res.json({
      ...sale,
      customer: customerQuery?.rows[0] || null,
      professional: professionalQuery?.rows[0] || null,
      items: itemsWithDetails,
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
};
