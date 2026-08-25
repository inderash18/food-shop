/**
 * Centralized utility functions for accurate currency and unit conversions (Rupees <-> Paise).
 * Eliminates float rounding errors and ensures exact amounts sent to payment gateways.
 */

/**
 * Converts Indian Rupees (INR) to paise (smallest currency unit).
 * Example: 70 -> 7000, 149.50 -> 14950
 */
export function toPaise(rupees: number | string): number {
  const parsed = typeof rupees === 'string' ? parseFloat(rupees) : Number(rupees);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid rupee amount: ${rupees}`);
  }
  return Math.round(parsed * 100);
}

/**
 * Converts paise to Indian Rupees (INR).
 * Example: 7000 -> 70, 14950 -> 149.5
 */
export function toRupees(paise: number | string): number {
  const parsed = typeof paise === 'string' ? parseInt(paise, 10) : Number(paise);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid paise amount: ${paise}`);
  }
  return Number((parsed / 100).toFixed(2));
}

/**
 * Validates that two rupee amounts match within a 0.01 threshold (1 paisa).
 */
export function isAmountEqual(amount1: number, amount2: number): boolean {
  return Math.abs(Number(amount1) - Number(amount2)) < 0.01;
}
