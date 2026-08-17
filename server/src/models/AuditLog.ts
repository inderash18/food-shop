import { Schema, model, models, Types, Model } from 'mongoose';
import { AUDIT_ACTION, AuditAction } from '../constants';

export interface IAuditLog {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorEmail?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, trim: true },
    action: { type: String, enum: Object.values(AUDIT_ACTION), required: true, index: true },
    resource: { type: String, trim: true },
    resourceId: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: 1 });

export const AuditLog = (models.AuditLog ?? model<IAuditLog>('AuditLog', auditLogSchema)) as Model<IAuditLog>;
