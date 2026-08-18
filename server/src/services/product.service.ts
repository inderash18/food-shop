import { Types } from 'mongoose';
import { Product, Category } from '../models';
import { AppError, NotFoundError, ConflictError } from '../utils/errors';
import { cache } from './cache.service';
import { recordAudit } from './audit.service';
import { AUDIT_ACTION } from '../constants';
import { INVENTORY_STATUS } from '../constants';
import { getProductImageUrl } from '../utils/imageMapping';

export interface ProductInput {
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
}

export interface ListProductsQuery {
  category?: string;
  search?: string;
  isVeg?: boolean;
  inStockOnly?: boolean;
  availableOnly?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'popular' | 'newest' | 'name';
  page?: number;
  limit?: number;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const isTimeInWindow = (now: Date, from?: string, until?: string): boolean => {
  if (!from && !until) return true;
  const toMinutes = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + (m ?? 0);
  };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const fromMin = from ? toMinutes(from) : 0;
  const untilMin = until ? toMinutes(until) : 24 * 60;
  return nowMin >= fromMin && nowMin <= untilMin;
};

export async function listProducts(query: ListProductsQuery) {
  const {
    category,
    search,
    isVeg,
    inStockOnly,
    availableOnly,
    sort = 'name',
    page = 1,
    limit = 24,
  } = query;

  const filter: Record<string, unknown> = { isActive: true };
  if (category) {
    const cat = await Category.findOne({ slug: category }).lean();
    if (cat) filter.categoryId = cat._id;
    else filter.categoryId = new Types.ObjectId();
  }
  if (search?.trim()) {
    filter.$text = { $search: search.trim() };
  }
  if (isVeg !== undefined) filter.isVeg = isVeg;
  if (inStockOnly) filter.stock = { $gt: 0 };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    popular: { isPopular: -1, price: 1 },
    newest: { createdAt: -1 },
    name: { name: 1 },
  };

  const [docs, total] = await Promise.all([
    Product.find(filter).sort(sortMap[sort] ?? sortMap.name).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  const now = new Date();
  const products = docs.map((p) => {
    const available = isTimeInWindow(now, p.availableFrom, p.availableUntil);
    const effectiveStock = Math.max(0, p.stock - p.reservedStock);
    return {
      ...p,
      availableNow: available && p.stock > 0,
      effectiveStock,
      inventoryStatus:
        effectiveStock <= 0 ? INVENTORY_STATUS.OUT_OF_STOCK : effectiveStock <= p.minimumStock ? INVENTORY_STATUS.LOW_STOCK : INVENTORY_STATUS.IN_STOCK,
    };
  });

  return { products, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getProduct(id: string) {
  const product = await Product.findById(id).lean();
  if (!product || !product.isActive) throw new NotFoundError('Product not found');
  return product;
}

export async function createProduct(input: ProductInput, actorId: string, actorEmail?: string) {
  const slug = slugify(input.name);
  const existing = await Product.findOne({ slug });
  if (existing) throw new ConflictError('A product with this name already exists');
  const category = await Category.findById(input.categoryId);
  if (!category) throw new NotFoundError('Category not found');

  if (!input.imageUrl || input.imageUrl.trim() === '') {
    input.imageUrl = getProductImageUrl(input.name, category.name);
  }

  const product = await Product.create({
    ...input,
    slug,
    stock: input.stock ?? 0,
    reservedStock: 0,
  });

  await recordAudit({
    actorId,
    actorEmail,
    action: AUDIT_ACTION.PRODUCT_CREATED,
    resource: 'product',
    resourceId: String(product.id),
    metadata: { name: product.name, price: product.price, stock: product.stock },
  });
  cache.delByPrefix('products');
  return product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>, actorId: string, actorEmail?: string) {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError('Product not found');

  if (input.name && input.name !== product.name) {
    const slug = slugify(input.name);
    const dup = await Product.findOne({ slug, _id: { $ne: id } });
    if (dup) throw new ConflictError('A product with this name already exists');
    product.slug = slug;
  }
  if (input.categoryId) {
    const category = await Category.findById(input.categoryId);
    if (!category) throw new NotFoundError('Category not found');
  }

  const oldPrice = product.price;
  const auditActions: string[] = [];
  Object.assign(product, input);
  await product.save();

  if (input.price !== undefined && input.price !== oldPrice) {
    auditActions.push(AUDIT_ACTION.PRICE_CHANGED);
  }
  if (auditActions.length > 0 || input.name) {
    await recordAudit({
      actorId,
      actorEmail,
      action: AUDIT_ACTION.PRODUCT_UPDATED,
      resource: 'product',
      resourceId: id,
      metadata: {
        changed: ['name', ...(input.price !== undefined ? ['price'] : [])],
        oldPrice: input.price !== undefined ? oldPrice : undefined,
        newPrice: input.price,
      },
    });
  }
  cache.delByPrefix('products');
  return product;
}

export async function softDeleteProduct(id: string, actorId: string, actorEmail?: string) {
  const product = await Product.findById(id);
  if (!product) throw new NotFoundError('Product not found');
  product.isActive = false;
  await product.save();
  await recordAudit({
    actorId,
    actorEmail,
    action: AUDIT_ACTION.PRODUCT_DEACTIVATED,
    resource: 'product',
    resourceId: id,
    metadata: { name: product.name },
  });
  cache.delByPrefix('products');
  return product;
}
