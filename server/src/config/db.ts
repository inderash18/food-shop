import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState >= 1) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.databaseUrl, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
  });
  logger.info('Database connected', { url: env.databaseUrl.replace(/\/\/.*@/, '//***@') });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('Database disconnected');
}
