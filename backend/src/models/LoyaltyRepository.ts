import { LoyaltyPoints, LoyaltyTransaction } from './LoyaltyPoints';

export interface LoyaltyRepository {
  getPoints(customerId: string): Promise<LoyaltyPoints | null>;
  addPoints(customerId: string, tenantId: string, points: number, reason: string, referenceId?: string): Promise<LoyaltyPoints>;
  redeemPoints(customerId: string, tenantId: string, points: number, reason: string, referenceId?: string): Promise<LoyaltyPoints>;
  getTransactionHistory(customerId: string): Promise<LoyaltyTransaction[]>;
  getTopCustomersByPoints(tenantId: string, limit?: number): Promise<Array<{customerId: string, customerName: string, points: number}>>;
}