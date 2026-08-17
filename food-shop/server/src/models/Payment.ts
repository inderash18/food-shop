import { Schema, model, models, Types, Model } from 'mongoose';
import { PAYMENT_STATUS, PaymentStatus } from '../constants';

export interface IPayment {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  verifiedAt?: Date;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true },
    providerPaymentId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },
    verifiedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

paymentSchema.index({ providerPaymentId: 1, status: 1 });

export const Payment = (models.Payment ?? model<IPayment>('Payment', paymentSchema)) as Model<IPayment>;
