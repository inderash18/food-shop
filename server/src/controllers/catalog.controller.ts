import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategorySoft,
} from '../services/category.service';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  softDeleteProduct,
} from '../services/product.service';
import { changeStock, listInventory, getInventoryTransactions, updateMinimumStock } from '../services/inventory.service';
import { recordAudit } from '../services/audit.service';
import { AUDIT_ACTION } from '../constants';
import { AppError } from '../utils/errors';

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await listCategories();
  sendSuccess(res, { categories });
});

export const getCategoryDetail = asyncHandler(async (req: Request, res: Response) => {
  const category = await getCategory(req.params.idOrSlug);
  sendSuccess(res, { category });
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const q = req.validatedQuery as {
    category?: string;
    search?: string;
    isVeg?: string;
    inStockOnly?: string;
    sort?: 'price_asc' | 'price_desc' | 'popular' | 'newest' | 'name';
    page?: number;
    limit?: number;
  };
  const result = await listProducts({
    category: q.category,
    search: q.search,
    isVeg: q.isVeg === 'true' ? true : q.isVeg === 'false' ? false : undefined,
    inStockOnly: q.inStockOnly === 'true',
    sort: q.sort,
    page: q.page,
    limit: q.limit,
  });
  sendSuccess(res, result);
});

export const getProductDetail = asyncHandler(async (req: Request, res: Response) => {
  const product = await getProduct(req.params.id);
  sendSuccess(res, { product });
});

export const getAdminProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50, search } = req.query as { page?: string; limit?: string; search?: string };
  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  const { Product } = await import('../models');
  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).lean(),
    Product.countDocuments(filter),
  ]);
  sendSuccess(res, { products, total, page: Number(page), limit: Number(limit), pages: Math.max(1, Math.ceil(total / Number(limit))) });
});

export const postCreateCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { name: string; description?: string; imageUrl?: string; sortOrder?: number };
  const category = await createCategory(body);
  await recordAudit({
    actorId: req.userId,
    actorEmail: req.user?.email,
    action: AUDIT_ACTION.CATEGORY_CREATED,
    resource: 'category',
    resourceId: String(category.id),
    metadata: { name: category.name },
    ip: req.ip,
  });
  sendSuccess(res, { category }, 201);
});

export const patchUpdateCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { name?: string; description?: string; imageUrl?: string; isActive?: boolean; sortOrder?: number };
  const category = await updateCategory(req.params.id, body);
  await recordAudit({
    actorId: req.userId,
    actorEmail: req.user?.email,
    action: AUDIT_ACTION.CATEGORY_UPDATED,
    resource: 'category',
    resourceId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, { category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await deleteCategorySoft(req.params.id);
  sendSuccess(res, { category, message: 'Category deactivated' });
});

export const postCreateProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as {
    name: string;
    description?: string;
    categoryId: string;
    imageUrl?: string;
    price: number;
    stock?: number;
    minimumStock?: number;
    prepMinutes?: number;
    isVeg?: boolean;
    isPopular?: boolean;
    isActive?: boolean;
    availableFrom?: string;
    availableUntil?: string;
  };
  const product = await createProduct(body, req.userId!, req.user?.email);
  sendSuccess(res, { product }, 201);
});

export const patchUpdateProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as Partial<{
    name: string;
    description?: string;
    categoryId: string;
    imageUrl?: string;
    price: number;
    stock?: number;
    minimumStock?: number;
    prepMinutes?: number;
    isVeg?: boolean;
    isPopular?: boolean;
    isActive?: boolean;
    availableFrom?: string;
    availableUntil?: string;
  }>;
  const product = await updateProduct(req.params.id, body, req.userId!, req.user?.email);
  sendSuccess(res, { product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await softDeleteProduct(req.params.id, req.userId!, req.user?.email);
  sendSuccess(res, { product, message: 'Product deactivated' });
});

export const patchProductAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { isActive, available } = req.body as { isActive?: boolean; available?: boolean };
  const targetActive = isActive !== undefined ? isActive : (available !== undefined ? available : true);
  const product = await updateProduct(req.params.id, { isActive: targetActive }, req.userId!, req.user?.email);
  sendSuccess(res, { product, message: `Product availability updated to ${targetActive}` });
});

export const postStockChange = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { type: 'add' | 'remove' | 'set' | 'waste'; quantity: number; reason: string };
  const result = await changeStock({
    productId: req.params.productId,
    type: body.type,
    quantity: body.quantity,
    reason: body.reason,
    actorId: req.userId!,
    actorEmail: req.user?.email,
  });
  sendSuccess(res, { result });
});

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as { page?: string; limit?: string; status?: string; search?: string };
  const result = await listInventory({
    page: q.page ? Number(q.page) : 1,
    limit: q.limit ? Number(q.limit) : 50,
    status: q.status,
    search: q.search,
  });
  sendSuccess(res, result);
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query as { page?: string; limit?: string };
  const result = await getInventoryTransactions(req.params.productId ?? '', Number(page), Number(limit));
  sendSuccess(res, result);
});

export const patchMinimumStock = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody as { minimumStock: number };
  if (!req.params.productId) throw new AppError(400, 'BAD_REQUEST', 'productId is required');
  const product = await updateMinimumStock(req.params.productId, body.minimumStock, req.userId!, req.user?.email);
  sendSuccess(res, { product });
});
