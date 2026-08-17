import { Category, Product } from '../models';
import { AppError, ConflictError, NotFoundError } from '../utils/errors';
import { cache } from './cache.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listCategories(includeInactive = false) {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
}

export async function getCategory(idOrSlug: string) {
  const category = await Category.findOne({
    $or: [{ _id: idOrSlug.match(/^[a-f\d]{24}$/i) ? idOrSlug : undefined }, { slug: idOrSlug }],
  }).lean();
  if (!category) throw new NotFoundError('Category not found');
  return category;
}

export async function createCategory(input: { name: string; description?: string; imageUrl?: string; sortOrder?: number }) {
  const slug = slugify(input.name);
  const existing = await Category.findOne({ slug });
  if (existing) throw new ConflictError('A category with this name already exists');
  const category = await Category.create({ ...input, slug });
  cache.delByPrefix('categories');
  return category;
}

export async function updateCategory(id: string, input: Partial<{ name: string; description: string; imageUrl: string; isActive: boolean; sortOrder: number }>) {
  const category = await Category.findById(id);
  if (!category) throw new NotFoundError('Category not found');
  if (input.name && input.name !== category.name) {
    const slug = slugify(input.name);
    const dup = await Category.findOne({ slug, _id: { $ne: id } });
    if (dup) throw new ConflictError('A category with this name already exists');
    category.slug = slug;
  }
  Object.assign(category, input);
  await category.save();
  cache.delByPrefix('categories');
  return category;
}

export async function deleteCategorySoft(id: string) {
  const category = await Category.findById(id);
  if (!category) throw new NotFoundError('Category not found');
  const productCount = await Product.countDocuments({ categoryId: id, isActive: true });
  if (productCount > 0) {
    throw new AppError(409, 'CONFLICT', 'Cannot deactivate a category that still has active products');
  }
  category.isActive = false;
  await category.save();
  cache.delByPrefix('categories');
  return category;
}
