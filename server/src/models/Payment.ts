import { Schema, model, models, Types, Model } from 'mongoose';
import { PAYMENT_STATUS, PaymentStatus, SETTLEMENT_STATUS, SettlementStatus } from '../constants';

export interface IPayment {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  provider: string;
  providerPaymentId: string;
  providerTransactionId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  verificationStatus: 'NOT_VERIFIED' | 'VERIFYING' | 'VERIFIED' | 'REJECTED';
  failureReason?: string;
  merchantAccountId?: string;
  merchantUpiId?: string;
  settlementStatus: SettlementStatus;
  settlementDate?: Date;
  settlementReferenceId?: string;
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
    providerTransactionId: { type: String, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING, index: true },
    verificationStatus: { type: String, enum: ['NOT_VERIFIED', 'VERIFYING', 'VERIFIED', 'REJECTED'], default: 'NOT_VERIFIED' },
    failureReason: { type: String },
    merchantAccountId: { type: String },
    merchantUpiId: { type: String },
    settlementStatus: { type: String, enum: Object.values(SETTLEMENT_STATUS), default: SETTLEMENT_STATUS.NOT_SETTLED, index: true },
    settlementDate: { type: Date },
    settlementReferenceId: { type: String },
    verifiedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

paymentSchema.index({ providerPaymentId: 1, status: 1 });
paymentSchema.index({ status: 1, verificationStatus: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = (models.Payment ?? model<IPayment>('Payment', paymentSchema)) as Model<IPayment>;
