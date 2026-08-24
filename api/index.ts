import { Request, Response } from 'express';
import { createApp } from '../server/src/app';
import { connectDatabase } from '../server/src/config/db';

const app = createApp();

export default async function handler(req: Request, res: Response) {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('Database connection failed:', error);
  }

  return app(req as any, res as any);
}
