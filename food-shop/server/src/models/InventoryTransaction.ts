import { Schema, model, models, Types, Model } from 'mongoose';
import { INVENTORY_TX_TYPE, InventoryTxType } from '../constants';

export interface IInventoryTransaction {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  type: InventoryTxType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  actorId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  createdAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: Object.values(INVENTORY_TX_TYPE), required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 500, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ productId: 1, createdAt: -1 });

export const InventoryTransaction = (models.InventoryTransaction ?? model<IInventoryTransaction>('InventoryTransaction', inventoryTransactionSchema)) as Model<IInventoryTransaction>;
