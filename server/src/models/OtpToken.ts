import { Schema, model, models, Types, Model } from 'mongoose';

export interface IOtpToken {
  _id: Types.ObjectId;
  email?: string; // Normalized lowercase email address
  mobileNumber?: string; // Backward compatibility / normalized phone
  target: string; // Identifier (normalized email or phone)
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
    email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    mobileNumber: { type: String, trim: true, sparse: true, index: true },
    target: { type: String, required: true, trim: true, lowercase: true, index: true },
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

otpTokenSchema.index({ target: 1, purpose: 1 });
otpTokenSchema.index({ email: 1, purpose: 1 });
otpTokenSchema.index({ mobileNumber: 1, purpose: 1 });

export const OtpToken = (models.OtpToken ?? model<IOtpToken>('OtpToken', otpTokenSchema)) as Model<IOtpToken>;

