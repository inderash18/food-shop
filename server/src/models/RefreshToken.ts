import { Schema, model, models, Types, Model } from 'mongoose';

export interface IRefreshToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenId: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = (models.RefreshToken ?? model<IRefreshToken>('RefreshToken', refreshTokenSchema)) as Model<IRefreshToken>;
