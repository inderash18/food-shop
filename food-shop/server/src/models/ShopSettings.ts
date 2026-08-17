import { Schema, model, models, Model } from 'mongoose';
import { SHOP_STATUS, ShopStatus } from '../constants';

export interface IShopSettings {
  shopName: string;
  collegeName: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  shopStatus: ShopStatus;
  orderCutoffMinutesBeforeClose: number;
  minOrderAmount: number;
  serviceFee: number;
  currency: string;
  timezone: string;
  orderPreparationEnabled: boolean;
  orderCloseTime?: string;
  orderOpenTime?: string;
  updatedAt: Date;
}

const shopSettingsSchema = new Schema<IShopSettings>(
  {
    shopName: { type: String, required: true, trim: true, maxlength: 100 },
    collegeName: { type: String, required: true, trim: true, maxlength: 100 },
    contactPhone: { type: String, trim: true, maxlength: 20 },
    contactEmail: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true, maxlength: 300 },
    shopStatus: { type: String, enum: Object.values(SHOP_STATUS), default: SHOP_STATUS.OPEN },
    orderCutoffMinutesBeforeClose: { type: Number, default: 15, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    orderPreparationEnabled: { type: Boolean, default: true },
    orderCloseTime: { type: String },
    orderOpenTime: { type: String },
  },
  { timestamps: true }
);

export const ShopSettings = (models.ShopSettings ?? model<IShopSettings>('ShopSettings', shopSettingsSchema)) as Model<IShopSettings>;
