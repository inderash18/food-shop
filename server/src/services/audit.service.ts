import mongoose from 'mongoose';
import { AuditLog } from '../models';
import { AuditAction } from '../constants';
import { logger } from '../config/logger';

interface AuditEntry {
  actorId?: string;
  actorEmail?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  try {
    await AuditLog.create(entry);
  } catch (err) {
    logger.error('Failed to write audit log', { action: entry.action, error: (err as Error).message });
  }
}
