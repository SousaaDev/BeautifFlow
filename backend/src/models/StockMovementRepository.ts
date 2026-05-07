import { StockMovement } from './StockMovement';

export interface StockMovementRepository {
  create(movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement>;
  findByProduct(productId: string): Promise<StockMovement[]>;
  findByProductAndTenant(productId: string, tenantId: string): Promise<StockMovement[]>;
  findByTenant(tenantId: string): Promise<StockMovement[]>;
  getStockAlerts(tenantId: string): Promise<Array<{productId: string, productName: string, currentStock: number, minThreshold: number}>>;
}