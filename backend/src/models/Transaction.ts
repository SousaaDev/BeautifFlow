export interface Transaction {
  id: string;
  tenantId: string;
  type: 'IN' | 'OUT';
  category: string;
  amount: number;
  paymentMethod?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
