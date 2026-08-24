import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { me, login, refresh, logout } from '../controllers/auth.controller';
import { User, RefreshToken } from '../models';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { ROLE } from '../constants';
import * as authService from '../services/auth.service';

describe('Auth Flow & /api/auth/me Authentication Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
    name: 'Alice Student',
    email: 'alice@campus.edu',
    studentId: 'STU1001',
    role: ROLE.STUDENT,
    isActive: true,
    createdAt: new Date(),
  };

  it('authenticates request via Bearer Authorization header', async () => {
    const token = signAccessToken(mockUser.id, mockUser.role);
    const req: any = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res: any = { cookie: vi.fn(), setHeader: vi.fn() };
    const next = vi.fn();

    const middleware = requireAuth();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(mockUser.id);
    expect(req.userRole).toBe(ROLE.STUDENT);
  });

  it('authenticates request via accessToken HTTP-only cookie', async () => {
    const token = signAccessToken(mockUser.id, mockUser.role);
    const req: any = { headers: {}, cookies: { accessToken: token } };
    const res: any = { cookie: vi.fn(), setHeader: vi.fn() };
    const next = vi.fn();

    const middleware = requireAuth();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(mockUser.id);
    expect(req.userRole).toBe(ROLE.STUDENT);
  });

  it('auto-refreshes session via refreshToken cookie when accessToken is missing', async () => {
    const refreshToken = signRefreshToken(mockUser.id, 'tok_test');
    vi.spyOn(authService, 'refreshSession').mockResolvedValue({
      accessToken: signAccessToken(mockUser.id, mockUser.role),
      refreshToken: signRefreshToken(mockUser.id, 'tok_new'),
    });

    const req: any = { headers: {}, cookies: { refreshToken } };
    const res: any = { cookie: vi.fn(), setHeader: vi.fn() };
    const next = vi.fn();

    const middleware = requireAuth();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(mockUser.id);
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', expect.any(String), expect.objectContaining({ path: '/' }));
    expect(res.cookie).toHaveBeenCalledWith('accessToken', expect.any(String), expect.objectContaining({ path: '/' }));
  });

  it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
    const req: any = { headers: {}, cookies: {} };
    const res: any = { cookie: vi.fn(), setHeader: vi.fn() };
    let errorPassed: any = null;
    const next = vi.fn((err) => {
      errorPassed = err;
    });

    const middleware = requireAuth();
    await middleware(req, res, next);

    expect(errorPassed).toBeTruthy();
    expect(errorPassed.statusCode).toBe(401);
    expect(errorPassed.code).toBe('UNAUTHORIZED');
  });

  it('loadUser loads user from database and rejects deactivated user', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue({ ...mockUser, isActive: false } as any);
    const req: any = { userId: mockUser.id };
    const res: any = {};
    let errorPassed: any = null;
    const next = vi.fn((err) => {
      errorPassed = err;
    });

    const middleware = loadUser();
    await middleware(req, res, next);

    expect(errorPassed).toBeTruthy();
    expect(errorPassed.statusCode).toBe(401);
  });

  it('me controller returns user profile for authenticated user', async () => {
    const req: any = { user: mockUser };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await me(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: 'alice@campus.edu',
            name: 'Alice Student',
          }),
        }),
      })
    );
  });
});
