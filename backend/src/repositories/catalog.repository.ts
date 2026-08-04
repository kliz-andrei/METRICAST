import type { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export class CatalogRepository {
  listCategories() { return prisma.category.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } }); }
  category(id: string) { return prisma.category.findFirst({ where: { id, deletedAt: null } }); }
  createCategory(data: Prisma.CategoryCreateInput) { return prisma.category.create({ data }); }
  updateCategory(id: string, data: Prisma.CategoryUpdateInput) { return prisma.category.update({ where: { id }, data }); }
  deleteCategory(id: string) { return prisma.category.update({ where: { id }, data: { deletedAt: new Date() } }); }
  listProducts() { return prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, include: { category: true } }); }
  product(id: string) { return prisma.product.findFirst({ where: { id, deletedAt: null }, include: { category: true } }); }
  createProduct(data: Prisma.ProductUncheckedCreateInput) { return prisma.product.create({ data, include: { category: true } }); }
  updateProduct(id: string, data: Prisma.ProductUncheckedUpdateInput) { return prisma.product.update({ where: { id }, data, include: { category: true } }); }
  deleteProduct(id: string) { return prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }); }
}
