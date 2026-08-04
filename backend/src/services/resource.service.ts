import { AppError } from '../lib/errors.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { CatalogRepository } from '../repositories/catalog.repository.js';

export class ResourceService {
  constructor(private readonly catalog = new CatalogRepository(), private readonly business = new BusinessRepository()) {}
  async category(id: string) { const value = await this.catalog.category(id); if (!value) throw new AppError(404, 'Category not found.', 'NOT_FOUND'); return value; }
  async product(id: string) { const value = await this.catalog.product(id); if (!value) throw new AppError(404, 'Product not found.', 'NOT_FOUND'); return value; }
  async customer(id: string) { const value = await this.business.customer(id); if (!value) throw new AppError(404, 'Customer not found.', 'NOT_FOUND'); return value; }
  async transaction(id: string) { const value = await this.business.transaction(id); if (!value) throw new AppError(404, 'Transaction not found.', 'NOT_FOUND'); return value; }
  async payment(id: string) { const value = await this.business.payment(id); if (!value) throw new AppError(404, 'Payment not found.', 'NOT_FOUND'); return value; }
  get catalogRepository() { return this.catalog; }
  get businessRepository() { return this.business; }
}
