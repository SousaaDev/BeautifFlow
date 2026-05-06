export interface Product {
  id: string;
  tenantId: string;
  name: string;
  currentStock: number;
  minThreshold: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
  createdAt: Date;
}
