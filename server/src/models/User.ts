import { Schema, model, models, Types, Model } from 'mongoose';
import { ROLE, Role } from '../constants';

export interface IUser {
  _id: Types.ObjectId;
  studentId?: string;
  name: string;
  email?: string;
  emailNormalized?: string;
  mobileNumber?: string;
  phone?: string;
  passwordHash?: string;
  role: Role;
  isActive: boolean;
  approved: boolean;
  avatarUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    studentId: { type: String, trim: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    emailNormalized: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    mobileNumber: { type: String, trim: true, sparse: true, unique: true, index: true },
    phone: { type: String, trim: true, maxlength: 20 },
    avatarUrl: { type: String },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: Object.values(ROLE), default: ROLE.STUDENT, index: true },
    isActive: { type: Boolean, default: true, index: true },
    approved: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ role: 1, createdAt: -1 });

export const User = (models.User ?? model<IUser>('User', userSchema)) as Model<IUser>;
