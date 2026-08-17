import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  studentId: z.string().trim().min(2, 'Student ID is required').max(50).transform((v) => v.toUpperCase()),
  password: passwordSchema,
  phone: z.string().trim().regex(/^[+\d\s-]{7,20}$/, 'Enter a valid phone number').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(2, 'Email or Student ID is required').max(100),
  password: z.string().min(1, 'Password is required').max(72),
});

export const createAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  studentId: z.string().trim().min(2).max(50).transform((v) => v.toUpperCase()),
  password: passwordSchema,
  role: z.enum(['STAFF', 'ADMIN', 'SUPER_ADMIN']).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});
