import { Schema, model, models, Types, Model } from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, OrderStatus, PaymentStatus } from '../constants';

export interface IOrderItem {
  productId: Types.ObjectId;
  productNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
  isVeg: boolean;
  imageUrl?: string;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  items: IOrderItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: Types.ObjectId;
  checkoutRequestId: string;
  notes?: string;
  estimatedReadyAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productNameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, default: true },
    imageUrl: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    itemCount: { type: Number, required: true, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    serviceFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PAYMENT_PENDING, index: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    checkoutRequestId: { type: String, required: true, unique: true, index: true },
    notes: { type: String, trim: true, maxlength: 500 },
    estimatedReadyAt: { type: Date },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, status: 1, createdAt: -1 });
orderSchema.index({ createdAt: 1 });

export const Order = (models.Order ?? model<IOrder>('Order', orderSchema)) as Model<IOrder>;
