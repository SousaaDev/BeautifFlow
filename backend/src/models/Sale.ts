export interface Sale {
  id: string;
  tenantId: string;
  customerId?: string;
  professionalId?: string;
  total: number;
  discount?: number;
  finalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  createdAt: Date;
}
