import { env } from '../config/env';
import { ShopSequence } from '../models/ShopSequence';

/**
 * Generate a human-friendly, monotonic order number and short pickup token:
 * Order Number: ORD-YYYYMMDD-000124
 * Token Number: A104, B208 (easy to announce/call at Counter 2)
 */
export async function generateOrderIdentifiers(date = new Date()): Promise<{ orderNumber: string; tokenNumber: string }> {
  const dayKey = formatDayKey(date);
  const doc = await ShopSequence.findOneAndUpdate(
    { key: `order:${dayKey}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `order:${dayKey}` } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seq = doc.value;
  const prefix = 'ORD';
  const orderNumber = `${prefix}-${dayKey}-${String(seq).padStart(6, '0')}`;

  // Generate Token #A104 (cycles letters A-Z, 100-999)
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const letterIndex = Math.floor((seq - 1) / 100) % letters.length;
  const letter = letters[letterIndex];
  const numInSeries = 100 + ((seq - 1) % 100) + 1; // 101 .. 200
  const tokenNumber = `${letter}${numInSeries}`;

  return { orderNumber, tokenNumber };
}

export async function generateOrderNumber(date = new Date()): Promise<string> {
  const { orderNumber } = await generateOrderIdentifiers(date);
  return orderNumber;
}

export function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
