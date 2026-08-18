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
  addons?: string[];
  instructions?: string;
  prepStatus?: 'CONFIRMED' | 'PREPARING' | 'READY_FOR_COLLECTION' | 'COLLECTED';
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  tokenNumber: string; // e.g. A104, B208
  userId: Types.ObjectId;

  // Pre-Order items
  items: IOrderItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
  serviceFee: number;
  total: number;

  // Collection details
  collectionCounter: string; // default: 'Counter 2 - Express Pick'
  collectionStatus: 'PENDING' | 'READY' | 'COLLECTED';
  collectedAt?: Date;
  qrCodeData: string;

  // Lifecycle
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentId?: Types.ObjectId;
  checkoutRequestId: string;
  notes?: string;
  estimatedReadyMinutes: number;
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
    addons: { type: [String], default: [] },
    instructions: { type: String },
    prepStatus: {
      type: String,
      enum: ['CONFIRMED', 'PREPARING', 'READY_FOR_COLLECTION', 'COLLECTED'],
      default: 'CONFIRMED',
    },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    tokenNumber: { type: String, required: true, index: true }, // e.g. A104
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Pre-Order Items
    items: { type: [orderItemSchema], required: true },
    itemCount: { type: Number, required: true, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    serviceFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    // Collection Details
    collectionCounter: { type: String, default: 'Counter 2 - Express Pick' },
    collectionStatus: { type: String, enum: ['PENDING', 'READY', 'COLLECTED'], default: 'PENDING', index: true },
    collectedAt: { type: Date },
    qrCodeData: { type: String, required: true },

    // Lifecycle
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PAYMENT_PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    checkoutRequestId: { type: String, required: true, unique: true, index: true },
    notes: { type: String, maxlength: 500 },
    estimatedReadyMinutes: { type: Number, default: 15 },
    estimatedReadyAt: { type: Date },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ collectionStatus: 1, createdAt: -1 });

export const Order = (models.Order ?? model<IOrder>('Order', orderSchema)) as Model<IOrder>;
