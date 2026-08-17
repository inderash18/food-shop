import { Schema, model, models, Model } from 'mongoose';

export interface IShopSequence {
  _id: string;
  key: string;
  value: number;
}

const shopSequenceSchema = new Schema<IShopSequence>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

export const ShopSequence = (models.ShopSequence ?? model<IShopSequence>('ShopSequence', shopSequenceSchema)) as Model<IShopSequence>;
