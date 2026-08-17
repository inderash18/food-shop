import { Cart, Product } from '../models';
import { NotFoundError, BadRequestError, AppError } from '../utils/errors';

export async function getCartForUser(userId: string) {
  const cart = await Cart.findOne({ userId }).lean();
  if (!cart) return { userId, items: [], cartCount: 0, subtotal: 0 };
  return hydrateCart(cart);
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new NotFoundError('Product not found');
  if (product.stock <= 0) throw new AppError(409, 'OUT_OF_STOCK', 'This item is currently sold out');
  if (quantity < 1 || quantity > 99) throw new BadRequestError('Quantity must be between 1 and 99');

  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });

  const existing = cart.items.find((i) => String(i.productId) === String(productId));
  const newQty = (existing?.quantity ?? 0) + quantity;
  if (newQty > 99) throw new BadRequestError('Maximum quantity per item is 99');

  const available = product.stock - product.reservedStock;
  if (newQty > available) {
    throw new AppError(409, 'OUT_OF_STOCK', `Only ${Math.max(0, available)} units available`);
  }

  if (existing) {
    await Cart.updateOne({ userId, 'items.productId': productId }, { $set: { 'items.$.quantity': newQty } });
  } else {
    await Cart.updateOne({ userId }, { $push: { items: { productId, quantity } } });
  }

  return getCartForUser(userId);
}

export async function updateCartItem(userId: string, productId: string, quantity: number) {
  if (quantity < 1 || quantity > 99) throw new BadRequestError('Quantity must be between 1 and 99');
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new NotFoundError('Product not found');

  const available = Math.max(0, product.stock - product.reservedStock);
  if (quantity > available) {
    throw new AppError(409, 'OUT_OF_STOCK', `Only ${available} units available`);
  }

  const result = await Cart.updateOne(
    { userId, 'items.productId': productId },
    { $set: { 'items.$.quantity': quantity } }
  );
  if (result.modifiedCount === 0) throw new NotFoundError('Item not in cart');

  return getCartForUser(userId);
}

export async function removeCartItem(userId: string, productId: string) {
  await Cart.updateOne({ userId }, { $pull: { items: { productId } } });
  return getCartForUser(userId);
}

export async function clearCart(userId: string) {
  await Cart.updateOne({ userId }, { $set: { items: [] } });
  return getCartForUser(userId);
}

interface HydratedItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  available: boolean;
  stockAvailable: number;
  subtotal: number;
}

interface HydratedCart {
  userId: string;
  items: HydratedItem[];
  cartCount: number;
  subtotal: number;
}

async function hydrateCart(cart: { userId: unknown; items: { productId: unknown; quantity: number }[] }): Promise<HydratedCart> {
  const ids = cart.items.map((i) => String(i.productId));
  const products = ids.length ? await Product.find({ _id: { $in: ids } }).lean() : [];

  const items: HydratedItem[] = [];
  for (const item of cart.items) {
    const product = products.find((p) => String(p._id) === String(item.productId));
    if (!product) continue;
    const available = Math.max(0, product.stock - product.reservedStock);
    items.push({
      productId: String(product._id),
      quantity: item.quantity,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      isVeg: product.isVeg,
      available: available >= item.quantity,
      stockAvailable: available,
      subtotal: product.price * item.quantity,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { userId: String(cart.userId), items, cartCount, subtotal };
}
