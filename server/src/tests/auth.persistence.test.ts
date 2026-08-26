import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROLE } from '../constants';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { User, RefreshToken } from '../models';
import { requireAuth, requireRole } from '../middlewares/auth';
import { me, logout } from '../controllers/auth.controller';
import { handleAdminMe, handleAdminRefresh, handleAdminLogout } from '../controllers/admin.auth.controller';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// Mock User & RefreshToken models
vi.mock('../models', () => {
  return {
    User: {
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
    },
    RefreshToken: {
      create: vi.fn(),
      findOne: vi.fn(),
      updateMany: vi.fn(),
    },
    Category: { find: vi.fn() },
    Product: { find: vi.fn() },
    Order: { find: vi.fn() },
    Payment: { find: vi.fn() },
    Booking: { find: vi.fn() },
    AuditLog: { create: vi.fn() },
    Coupon: { find: vi.fn() },
    Notification: { find: vi.fn() },
    Setting: { find: vi.fn() },
  };
});

// Mock audit service
vi.mock('../services/audit.service', () => ({
  recordAudit: vi.fn(),
}));

describe('Authentication & Session Persistence Lifecycle Tests', () => {
  const mockStudent = {
    _id: 'student_123',
    id: 'student_123',
    name: 'Rahul Sharma',
    email: 'rahul@college.edu',
    studentId: 'STU1001',
    role: ROLE.STUDENT,
    isActive: true,
    emailVerified: true,
    save: vi.fn(),
    updateOne: vi.fn(),
  };

  const mockAdmin = {
    _id: 'admin_456',
    id: 'admin_456',
    name: 'Admin Chief',
    email: 'admin@college.edu',
    studentId: 'ADM001',
    role: ROLE.ADMIN,
    isActive: true,
    emailVerified: true,
    save: vi.fn(),
    updateOne: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TEST 1: requireAuth authenticates student with Bearer token header', async () => {
    const token = signAccessToken(mockStudent.id, mockStudent.role as any);
    const req: any = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res: any = { cookie: vi.fn(), setHeader: vi.fn() };
    const next = vi.fn();

    const authMiddleware = requireAuth();
    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(mockStudent.id);
    expect(req.userRole).toBe(ROLE.STUDENT);
  });

  it('TEST 2: requireAuth authenticates student with accessToken cookie', async () => {
    const token = signAccessToken(mockStudent.id, mockStudent.role as any);
    const req: any = { headers: {}, cookies: { accessToken: token } };
    const res: any = { cookie: vi.fn(), setHeader: vi.fn() };
    const next = vi.fn();

    const authMiddleware = requireAuth();
    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(mockStudent.id);
    expect(req.userRole).toBe(ROLE.STUDENT);
  });

  it('TEST 3: requireAuth authenticates admin with adminAccessToken cookie', async () => {
    const token = signAccessToken(mockAdmin.id, mockAdmin.role as any);
    const req: any = { headers: {}, cookies: { adminAccessToken: token } };
    const res: any = { cookie: vi.fn(), setHeader: vi.fn() };
    const next = vi.fn();

    const authMiddleware = requireAuth();
    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(mockAdmin.id);
    expect(req.userRole).toBe(ROLE.ADMIN);
  });

  it('TEST 4: Student me controller returns public student data', async () => {
    const req: any = { user: mockStudent, userId: mockStudent.id };
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);

    await me(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: mockStudent.id,
            email: mockStudent.email,
            role: ROLE.STUDENT,
          }),
        }),
      })
    );
  });

  it('TEST 5: Admin adminMe controller succeeds for ADMIN role', async () => {
    const req: any = { user: mockAdmin, userId: mockAdmin.id };
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);

    await handleAdminMe(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: mockAdmin.id,
            email: mockAdmin.email,
            role: ROLE.ADMIN,
          }),
        }),
      })
    );
  });

  it('TEST 6: Admin adminMe controller rejects STUDENT role with ForbiddenError', async () => {
    const req: any = { user: mockStudent, userId: mockStudent.id };
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);

    await expect(handleAdminMe(req, res)).rejects.toThrow(ForbiddenError);
  });

  it('TEST 7: Admin logout clears admin cookies with secure path', async () => {
    const req: any = { cookies: { adminRefreshToken: 'test_tok' }, userId: mockAdmin.id };
    const res: any = {};
    res.clearCookie = vi.fn();
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);

    await handleAdminLogout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('adminRefreshToken', expect.objectContaining({ path: '/' }));
    expect(res.clearCookie).toHaveBeenCalledWith('adminAccessToken', expect.objectContaining({ path: '/' }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });

  it('TEST 8: Student logout clears student cookies', async () => {
    const req: any = { cookies: { refreshToken: 'test_tok' }, userId: mockStudent.id };
    const res: any = {};
    res.clearCookie = vi.fn();
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);

    await logout(req, res, vi.fn());

    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({ path: '/' }));
    expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.objectContaining({ path: '/' }));
  });
});
