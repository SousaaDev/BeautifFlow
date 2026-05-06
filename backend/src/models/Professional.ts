export interface Professional {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  commissionRate: number;
  bufferMinutes: number;
  isActive: boolean;
  createdAt: Date;
}
