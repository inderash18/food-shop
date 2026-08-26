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

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  phone: z.string().trim().regex(/^[+\d\s-]{7,20}$/, 'Enter a valid phone number').optional().or(z.literal('')),
  avatarUrl: z.string().max(2_000_000, 'Image is too large').optional().nullable(),
});

export const sendEmailOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  purpose: z.enum(['register', 'login', 'admin']).optional().default('login'),
});

export const resendEmailOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  purpose: z.enum(['register', 'login', 'admin']).optional().default('login'),
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  name: z.string().trim().min(2).max(100).optional(),
  studentId: z.string().trim().min(2).max(50).optional(),
  password: passwordSchema.optional(),
  purpose: z.enum(['register', 'login', 'admin']).optional().default('login'),
});

