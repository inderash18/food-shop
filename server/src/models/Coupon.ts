import { Schema, model, models, Types, Model } from 'mongoose';
import { COUPON_TYPE, CouponType } from '../constants';

export interface ICoupon {
  _id: Types.ObjectId;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount: number;
  expiresAt?: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    type: { type: String, enum: Object.values(COUPON_TYPE), required: true },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Coupon = (models.Coupon ?? model<ICoupon>('Coupon', couponSchema)) as Model<ICoupon>;
