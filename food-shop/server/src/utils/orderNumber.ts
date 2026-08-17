import { env } from '../config/env';

/**
 * Generate a human-friendly, monotonic order number:
 * COL-YYYYMMDD-000124
 * Guaranteed unique via a daily sequence stored in the ShopSequence collection.
 */
export async function generateOrderNumber(date = new Date()): Promise<string> {
  const { ShopSequence } = await import('../models/ShopSequence');
  const dayKey = formatDayKey(date);
  const doc = await ShopSequence.findOneAndUpdate(
    { key: `order:${dayKey}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `order:${dayKey}` } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const prefix = env.collegeName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3) || 'COL';
  return `${prefix}-${dayKey}-${String(doc.value).padStart(6, '0')}`;
}

export function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
