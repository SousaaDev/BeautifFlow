import { ProductRepository } from '../models/ProductRepository';
import { Product } from '../models/Product';

export class CreateProduct {
  constructor(private productRepository: ProductRepository) {}

  async execute(data: {
    tenantId: string;
    name: string;
    currentStock: number;
    minThreshold: number;
    costPrice: number;
    salePrice: number;
  }): Promise<Product> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Product name is required');
    }

    if (data.salePrice < data.costPrice) {
      throw new Error('Sale price must be greater than or equal to cost price');
    }

    return this.productRepository.create({
      tenantId: data.tenantId,
      name: data.name,
      currentStock: data.currentStock,
      minThreshold: data.minThreshold,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
      isActive: true,
    });
  }
}
