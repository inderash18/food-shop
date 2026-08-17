import { Schema, model, models, Types, Model } from 'mongoose';

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  categoryId: Types.ObjectId;
  imageUrl?: string;
  price: number;
  stock: number;
  reservedStock: number;
  minimumStock: number;
  prepMinutes: number;
  isVeg: boolean;
  isPopular: boolean;
  isActive: boolean;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    imageUrl: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 5, min: 0 },
    prepMinutes: { type: Number, default: 10, min: 1, max: 120 },
    isVeg: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    availableFrom: { type: String, default: undefined },
    availableUntil: { type: String, default: undefined },
  },
  { timestamps: true }
);

productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ isPopular: 1, isActive: 1 });
productSchema.index({ stock: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });

export const Product = (models.Product ?? model<IProduct>('Product', productSchema)) as Model<IProduct>;
