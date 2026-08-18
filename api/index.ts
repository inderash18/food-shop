import { Request, Response } from 'express';
import { createApp } from '../server/src/app';
import { connectDatabase } from '../server/src/config/db';

let dbInitialized = false;

const app = createApp();

export default async function handler(req: Request, res: Response) {
  if (!dbInitialized) {
    try {
      await connectDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }

  // Vercel serverless functions handle the request/response cycle
  // by passing them directly to the Express app instance.
  return app(req as any, res as any);
}
