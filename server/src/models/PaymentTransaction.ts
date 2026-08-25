import { Schema, model, models, Types, Model } from 'mongoose';
import { PAYMENT_STATUS, PaymentStatus, SETTLEMENT_STATUS, SettlementStatus } from '../constants';

export interface IPaymentTransaction {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  orderId: Types.ObjectId;
  provider: string;
  transactionId: string;
  providerReference?: string;
  amount: number;
  currency: string;
  merchantAccountId: string;
  status: PaymentStatus;
  settlementStatus: SettlementStatus;
  settlementDate?: Date;
  settlementReferenceId?: string;
  rawReference?: Record<string, unknown>;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, required: true },
    transactionId: { type: String, required: true },
    providerReference: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    merchantAccountId: { type: String, required: true },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), required: true },
    settlementStatus: { type: String, enum: Object.values(SETTLEMENT_STATUS), default: SETTLEMENT_STATUS.NOT_SETTLED, index: true },
    settlementDate: { type: Date },
    settlementReferenceId: { type: String },
    rawReference: { type: Schema.Types.Mixed },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ provider: 1, transactionId: 1 }, { unique: true });
paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });
paymentTransactionSchema.index({ settlementStatus: 1, createdAt: -1 });

export const PaymentTransaction = (models.PaymentTransaction ?? model<IPaymentTransaction>('PaymentTransaction', paymentTransactionSchema)) as Model<IPaymentTransaction>;
