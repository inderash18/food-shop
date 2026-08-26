import { Schema, model, models, Types, Model } from 'mongoose';

export interface IOtpToken {
  _id: Types.ObjectId;
  mobileNumber: string; // Normalized +91XXXXXXXXXX
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  resendCooldownUntil: Date;
  expiresAt: Date;
  isVerified: boolean;
  purpose: 'register' | 'login' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    mobileNumber: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    resendCooldownUntil: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index auto-deletes expired OTPs
    isVerified: { type: Boolean, default: false },
    purpose: { type: String, enum: ['register', 'login', 'admin'], default: 'login' },
  },
  { timestamps: true }
);

otpTokenSchema.index({ mobileNumber: 1, purpose: 1 });

export const OtpToken = (models.OtpToken ?? model<IOtpToken>('OtpToken', otpTokenSchema)) as Model<IOtpToken>;
