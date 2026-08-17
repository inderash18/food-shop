import { Schema, model, models, Types, Model } from 'mongoose';

export interface IPaymentWebhookEvent {
  _id: Types.ObjectId;
  eventId: string;
  provider: string;
  eventType: string;
  transactionId?: string;
  processed: boolean;
  processedAt?: Date;
  rawPayload: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    eventId: { type: String, required: true },
    provider: { type: String, required: true },
    eventType: { type: String, required: true },
    transactionId: { type: String },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
    rawPayload: { type: String, required: true },
  },
  { timestamps: true }
);

paymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const PaymentWebhookEvent = (models.PaymentWebhookEvent ?? model<IPaymentWebhookEvent>('PaymentWebhookEvent', paymentWebhookEventSchema)) as Model<IPaymentWebhookEvent>;
