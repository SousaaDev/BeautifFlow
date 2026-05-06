export interface Sale {
  id: string;
  tenantId: string;
  customerId?: string;
  professionalId?: string;
  total: number;
  paymentMethod?: string;
  createdAt: Date;
}
