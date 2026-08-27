import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format (24h)')
  .optional()
  .or(z.literal(''));

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Category is required'),
  imageUrl: z.string().trim().optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0').max(100000),
  stock: z.coerce.number().int().min(0).max(100000).optional(),
  minimumStock: z.coerce.number().int().min(0).max(100000).optional(),
  prepMinutes: z.coerce.number().int().min(1).max(120).optional(),
  isVeg: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  availableFrom: timeSchema,
  availableUntil: timeSchema,
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().trim().optional(),
  isVeg: z.enum(['true', 'false']).optional(),
  inStockOnly: z.enum(['true', 'false']).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'popular', 'newest', 'name']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const stockChangeSchema = z.object({
  type: z.enum(['add', 'remove', 'set', 'waste']),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  reason: z.string().trim().min(3, 'A reason is required').max(500),
});

export const minimumStockSchema = z.object({
  minimumStock: z.coerce.number().int().min(0).max(100000),
});
