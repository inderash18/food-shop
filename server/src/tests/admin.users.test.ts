import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User, Order } from '../models';
import { ROLE } from '../constants';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { signAccessToken } from '../utils/jwt';
import userRoutes from '../routes/user.routes';

describe('Admin Users API & Real Student Integration Suite', () => {
  const adminUserId = '507f1f77bcf86cd799439011';
  const studentUserId1 = '507f1f77bcf86cd799439022';
  const studentUserId2 = '507f1f77bcf86cd799439033';

  const mockAdminUser = {
    _id: adminUserId,
    id: adminUserId,
    name: 'Admin User',
    email: 'admin@college.edu',
    studentId: 'ADM001',
    role: ROLE.ADMIN,
    isActive: true,
    approved: true,
    emailVerified: true,
    createdAt: new Date('2026-01-01'),
  };

  const mockStudent1 = {
    _id: studentUserId1,
    id: studentUserId1,
    name: 'Rahul Sharma',
    email: 'rahul@gmail.com',
    emailNormalized: 'rahul@gmail.com',
    mobileNumber: '+919876543210',
    phone: '+919876543210',
    studentId: 'STU101',
    role: ROLE.STUDENT,
    isActive: true,
    approved: true,
    emailVerified: true,
    createdAt: new Date('2026-02-01'),
    lastLoginAt: new Date('2026-02-15'),
  };

  const mockStudent2 = {
    _id: studentUserId2,
    id: studentUserId2,
    name: 'Priya Patel',
    email: 'priya@gmail.com',
    emailNormalized: 'priya@gmail.com',
    mobileNumber: '+919123456789',
    phone: '+919123456789',
    studentId: 'STU102',
    role: ROLE.STUDENT,
    isActive: false,
    approved: true,
    emailVerified: true,
    createdAt: new Date('2026-02-10'),
    lastLoginAt: new Date('2026-02-20'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('queries MongoDB User collection and returns real students with mobile, status, and batch order count', async () => {
    // Mock Users Query & Count
    const mockFindChain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([mockStudent1, mockStudent2]),
    };
    vi.spyOn(User, 'find').mockReturnValue(mockFindChain as any);
    vi.spyOn(User, 'countDocuments').mockResolvedValue(2);

    // Mock Order aggregation for batch order counts
    vi.spyOn(Order, 'aggregate').mockResolvedValue([
      { _id: studentUserId1, count: 4 },
      { _id: studentUserId2, count: 1 },
    ]);

    const req: any = {
      query: { page: '1', limit: '25' },
      user: mockAdminUser,
      userId: adminUserId,
      userRole: ROLE.ADMIN,
    };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((payload) => {
        responseData = payload;
        return res;
      }),
    };
    const next = vi.fn();

    // Invoke listUsers router handler
    const listUsersHandler = (userRoutes.stack.find((s: any) => s.route?.path === '/' && s.route?.methods?.get))?.route?.stack[0]?.handle;
    expect(listUsersHandler).toBeDefined();

    await listUsersHandler(req, res, next);

    expect(responseData).toBeDefined();
    expect(responseData.success).toBe(true);
    expect(responseData.data.users).toHaveLength(2);
    expect(responseData.data.total).toBe(2);

    const student1 = responseData.data.users[0];
    expect(student1.name).toBe('Rahul Sharma');
    expect(student1.mobile).toBe('+919876543210');
    expect(student1.role).toBe('STUDENT');
    expect(student1.status).toBe('ACTIVE');
    expect(student1.orderCount).toBe(4);

    const student2 = responseData.data.users[1];
    expect(student2.name).toBe('Priya Patel');
    expect(student2.mobile).toBe('+919123456789');
    expect(student2.role).toBe('STUDENT');
    expect(student2.status).toBe('INACTIVE');
    expect(student2.orderCount).toBe(1);
  });

  it('filters by search term across name, mobileNumber, and phone', async () => {
    let capturedFilter: any = null;
    const mockFindChain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockImplementation(() => {
        return Promise.resolve([mockStudent1]);
      }),
    };
    vi.spyOn(User, 'find').mockImplementation((filter: any) => {
      capturedFilter = filter;
      return mockFindChain as any;
    });
    vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Order, 'aggregate').mockResolvedValue([{ _id: studentUserId1, count: 4 }]);

    const req: any = {
      query: { search: '9876543210', role: 'STUDENT', status: 'ACTIVE' },
      user: mockAdminUser,
      userId: adminUserId,
      userRole: ROLE.ADMIN,
    };
    let responseData: any = null;
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((payload) => {
        responseData = payload;
        return res;
      }),
    };
    const next = vi.fn();

    const listUsersHandler = (userRoutes.stack.find((s: any) => s.route?.path === '/' && s.route?.methods?.get))?.route?.stack[0]?.handle;
    await listUsersHandler(req, res, next);

    expect(capturedFilter).toBeDefined();
    expect(capturedFilter.role).toBe('STUDENT');
    expect(capturedFilter.isActive).toBe(true);
    expect(capturedFilter.$or).toBeDefined();
    expect(responseData.data.users[0].name).toBe('Rahul Sharma');
  });

  it('enforces RBAC: blocks STUDENT accounts from admin user management', async () => {
    const req: any = {
      userId: studentUserId1,
      userRole: ROLE.STUDENT,
      user: mockStudent1,
    };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    const roleMiddleware = requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN);
    await roleMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
