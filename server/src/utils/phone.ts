/**
 * Utility functions for validating and normalizing Indian mobile numbers.
 */

/**
 * Normalizes Indian phone numbers to canonical E.164 format (+91XXXXXXXXXX).
 * Accepts: "+919876543210", "919876543210", "09876543210", "9876543210", "98765 43210", "+91 9876543210".
 * Returns canonical format: "+919876543210" or null if invalid.
 */
export function normalizeIndianMobile(phone: string): string | null {
  if (!phone) return null;

  // Remove spaces, hyphens, parentheses, and non-digit characters except leading +
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // Indian mobile numbers must be 10 digits and start with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return null;
}

/**
 * Validates whether a given string is a valid Indian mobile number.
 */
export function isValidIndianMobile(phone: string): boolean {
  return normalizeIndianMobile(phone) !== null;
}
