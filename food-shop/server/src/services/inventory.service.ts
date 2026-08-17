import { Product, InventoryTransaction } from '../models';
import { NotFoundError, AppError, BadRequestError } from '../utils/errors';
import { INVENTORY_TX_TYPE, INVENTORY_STATUS } from '../constants';
import { recordAudit } from './audit.service';
import { cache } from './cache.service';
import { emit } from '../events';

type ChangeType = 'add' | 'remove' | 'set' | 'waste';

export interface StockChangeInput {
  productId: string;
  type: ChangeType;
  quantity: number;
  reason: string;
  actorId: string;
  actorEmail?: string;
}

/**
 * Applies a manual stock change and always writes an inventory transaction + audit record.
 */
export async function changeStock(input: StockChangeInput) {
  const { productId, type, quantity, reason, actorId, actorEmail } = input;

  const product = await Product.findById(productId);
  if (!product) throw new NotFoundError('Product not found');
  if (quantity <= 0) throw new BadRequestError('Quantity must be greater than zero');

  const previousStock = product.stock;
  let newStock = previousStock;

  switch (type) {
    case 'add':
      newStock = previousStock + quantity;
      break;
    case 'remove':
      if (quantity > previousStock) throw new AppError(409, 'CONFLICT', 'Cannot remove more stock than available');
      newStock = previousStock - quantity;
      break;
    case 'set':
      newStock = quantity;
      break;
    case 'waste':
      if (quantity > previousStock) throw new AppError(409, 'CONFLICT', 'Cannot waste more stock than available');
      newStock = previousStock - quantity;
      break;
  }

  product.stock = newStock;
  await product.save();

  const txTypeMap: Record<ChangeType, string> = {
    add: INVENTORY_TX_TYPE.STOCK_ADDED,
    remove: INVENTORY_TX_TYPE.STOCK_REMOVED,
    set: INVENTORY_TX_TYPE.STOCK_ADJUSTED,
    waste: INVENTORY_TX_TYPE.WASTED,
  };

  await InventoryTransaction.create({
    productId,
    type: txTypeMap[type],
    quantity,
    previousStock,
    newStock,
    reason,
    actorId,
  });

  await recordAudit({
    actorId,
    actorEmail,
    action: type === 'add' ? 'STOCK_ADDED' : type === 'remove' ? 'STOCK_REMOVED' : type === 'set' ? 'STOCK_ADJUSTED' : 'STOCK_ADJUSTED',
    resource: 'product',
    resourceId: productId,
    metadata: { previousStock, newStock, reason },
  });

  cache.delByPrefix('products');
  emit('inventoryUpdated', { productId, stock: newStock });
  return { previousStock, newStock, product };
}

export async function listInventory(query: { page?: number; limit?: number; status?: string; search?: string }) {
  const { page = 1, limit = 50, status, search } = query;
  const filter: Record<string, unknown> = { isActive: true };
  if (search?.trim()) filter.name = { $regex: search.trim(), $options: 'i' };

  const [all, total] = await Promise.all([
    Product.find(filter).sort({ name: 1 }).lean(),
    Product.countDocuments(filter),
  ]);

  const rows = all.map((p) => {
    const effectiveStock = Math.max(0, p.stock - p.reservedStock);
    const computed =
      effectiveStock <= 0
        ? INVENTORY_STATUS.OUT_OF_STOCK
        : effectiveStock <= p.minimumStock
          ? INVENTORY_STATUS.LOW_STOCK
          : INVENTORY_STATUS.IN_STOCK;
    const row = {
      productId: String(p._id),
      name: p.name,
      currentStock: p.stock,
      reserved: p.reservedStock,
      available: effectiveStock,
      minimumLevel: p.minimumStock,
      status: computed,
      isActive: p.isActive,
    };
    return row;
  });

  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  const paged = filtered.slice((page - 1) * limit, page * limit);
  return { rows: paged, total: filtered.length, page, limit, pages: Math.max(1, Math.ceil(filtered.length / limit)) };
}

export async function getInventoryTransactions(productId: string, page = 1, limit = 50) {
  const filter = productId ? { productId } : {};
  const [rows, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actorId', 'name email')
      .lean(),
    InventoryTransaction.countDocuments(filter),
  ]);
  return { rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function updateMinimumStock(productId: string, minimumStock: number, actorId: string, actorEmail?: string) {
  const product = await Product.findById(productId);
  if (!product) throw new NotFoundError('Product not found');
  if (minimumStock < 0) throw new BadRequestError('Minimum stock cannot be negative');
  product.minimumStock = minimumStock;
  await product.save();
  await recordAudit({
    actorId,
    actorEmail,
    action: 'PRODUCT_UPDATED',
    resource: 'product',
    resourceId: productId,
    metadata: { minimumStock },
  });
  cache.delByPrefix('products');
  return product;
}
