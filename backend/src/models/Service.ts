export interface Service {
  id: string;
  tenantId: string;
  name: string;
  durationMinutes: number;
  price: number;
  commissionRate: number;
  isActive: boolean;
  createdAt: Date;
}
