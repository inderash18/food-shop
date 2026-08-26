import { Schema, model, models, Types, Model } from 'mongoose';

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  body: string;
  type: string;
  read: boolean;
  channel?: 'SMS' | 'EMAIL' | 'IN_APP';
  status?: 'PENDING' | 'SENT' | 'FAILED';
  errorDetails?: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 500 },
    type: { type: String, default: 'general' },
    read: { type: Boolean, default: false, index: true },
    channel: { type: String, enum: ['SMS', 'EMAIL', 'IN_APP'], default: 'IN_APP' },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'SENT' },
    errorDetails: { type: String },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = (models.Notification ?? model<INotification>('Notification', notificationSchema)) as Model<INotification>;
