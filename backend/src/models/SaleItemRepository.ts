import { SaleItem } from './SaleItem';

export interface SaleItemRepository {
  create(saleItem: Omit<SaleItem, 'id'>): Promise<SaleItem>;
  findById(id: string): Promise<SaleItem | null>;
  findBySale(saleId: string): Promise<SaleItem[]>;
  delete(id: string): Promise<void>;
}
