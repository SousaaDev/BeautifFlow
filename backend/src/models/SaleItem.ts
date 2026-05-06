export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string;
  serviceId?: string;
  quantity: number;
  unitPrice: number;
}
