export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  referenceId?: string; // sale_id, appointment_id, etc.
  createdBy?: string; // user_id
  createdAt: Date;
}