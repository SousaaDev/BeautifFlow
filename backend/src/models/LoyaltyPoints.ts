export interface LoyaltyPoints {
  id: string;
  customerId: string;
  tenantId: string;
  points: number;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  tenantId: string;
  type: 'EARNED' | 'REDEEMED';
  points: number;
  reason: string;
  referenceId?: string; // appointment_id, sale_id, etc.
  createdAt: Date;
}