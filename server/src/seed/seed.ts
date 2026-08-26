import { connectDatabase, disconnectDatabase } from '../config/db';
import {
  User,
  Category,
  Product,
  ShopSettings,
  Coupon,
  InventoryTransaction,
  Event,
  Order,
  Payment,
  PaymentTransaction,
  Cart,
  Notification,
  OtpToken,
  AuditLog,
  RefreshToken,
} from '../models';
import { ROLE, SHOP_STATUS } from '../constants';
import { hashPassword } from '../utils/crypto';
import { logger } from '../config/logger';

const DEV_PASSWORD = 'College@123';

const seedUsers = [
  { name: 'System Admin', email: 'admin@college.local', studentId: 'ADMIN001', role: ROLE.SUPER_ADMIN },
  { name: 'Kitchen Staff', email: 'staff@college.local', studentId: 'STAFF001', role: ROLE.STAFF },
  { name: 'Student One', email: 'student1@college.local', studentId: 'STU2025001', role: ROLE.STUDENT },
  { name: 'Student Two', email: 'student2@college.local', studentId: 'STU2025002', role: ROLE.STUDENT },
];

const seedCategories = [
  { name: 'Breakfast', slug: 'breakfast', sortOrder: 1 },
  { name: 'Lunch', slug: 'lunch', sortOrder: 2 },
  { name: 'Meals', slug: 'meals', sortOrder: 3 },
  { name: 'Snacks', slug: 'snacks', sortOrder: 4 },
  { name: 'Beverages', slug: 'beverages', sortOrder: 5 },
  { name: 'Fast Food', slug: 'fast-food', sortOrder: 6 },
  { name: 'Desserts', slug: 'desserts', sortOrder: 7 },
  { name: 'Combos', slug: 'combos', sortOrder: 8 },
];

const seedProducts = [
  { name: 'Idly (2 pc)', category: 'breakfast', price: 30, stock: 60, minimumStock: 10, prepMinutes: 5, isVeg: true, isPopular: true },
  { name: 'Masala Dosa', category: 'breakfast', price: 55, stock: 50, minimumStock: 10, prepMinutes: 8, isVeg: true, isPopular: true },
  { name: 'Pongal', category: 'breakfast', price: 45, stock: 40, minimumStock: 8, prepMinutes: 6, isVeg: true },
  { name: 'Veg Rice', category: 'lunch', price: 70, stock: 80, minimumStock: 15, prepMinutes: 10, isVeg: true, isPopular: true },
  { name: 'Chicken Rice', category: 'lunch', price: 120, stock: 60, minimumStock: 10, prepMinutes: 12, isVeg: false, isPopular: true },
  { name: 'Dal + Rice Meal', category: 'meals', price: 90, stock: 70, minimumStock: 12, prepMinutes: 10, isVeg: true },
  { name: 'Burger', category: 'fast-food', price: 80, stock: 45, minimumStock: 8, prepMinutes: 8, isVeg: false, isPopular: true },
  { name: 'Veg Sandwich', category: 'snacks', price: 50, stock: 40, minimumStock: 8, prepMinutes: 5, isVeg: true },
  { name: 'Samosa (2 pc)', category: 'snacks', price: 25, stock: 90, minimumStock: 15, prepMinutes: 3, isVeg: true },
  { name: 'Tea', category: 'beverages', price: 15, stock: 200, minimumStock: 30, prepMinutes: 2, isVeg: true },
  { name: 'Coffee', category: 'beverages', price: 20, stock: 180, minimumStock: 30, prepMinutes: 2, isVeg: true },
  { name: 'Fresh Juice', category: 'beverages', price: 40, stock: 50, minimumStock: 10, prepMinutes: 4, isVeg: true },
  { name: 'Bottled Water', category: 'beverages', price: 20, stock: 300, minimumStock: 50, prepMinutes: 1, isVeg: true },
  { name: 'Brownie', category: 'desserts', price: 60, stock: 30, minimumStock: 5, prepMinutes: 2, isVeg: true },
  { name: 'Veg Combo (Meal + Juice)', category: 'combos', price: 110, stock: 25, minimumStock: 5, prepMinutes: 12, isVeg: true },
];

async function seed(): Promise<void> {
  await connectDatabase();

  const reset = process.argv.includes('--reset');
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      ShopSettings.deleteMany({}),
      Coupon.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
      PaymentTransaction.deleteMany({}),
      Cart.deleteMany({}),
      Notification.deleteMany({}),
      OtpToken.deleteMany({}),
      AuditLog.deleteMany({}),
      RefreshToken.deleteMany({}),
      Event.deleteMany({}),
    ]);
    logger.info('Database completely wiped and reset');
  }

  const existingAdmin = await User.findOne({ email: 'admin@college.local' });
  if (!existingAdmin) {
    const passwordHash = await hashPassword(DEV_PASSWORD);
    for (const u of seedUsers) {
      await User.create({ ...u, emailNormalized: u.email, passwordHash, approved: true, isActive: true });
    }
    logger.info('Seed users created. Password for all: "College@123" (development only)');
  } else {
    logger.info('Seed users already exist — skipping');
  }

  if ((await Category.countDocuments()) === 0) {
    await Category.insertMany(seedCategories);
  }

  if ((await Product.countDocuments()) === 0) {
    const categories = await Category.find().lean();
    const products = [];
    for (const p of seedProducts) {
      const cat = categories.find((c) => c.slug === p.category);
      if (!cat) continue;
      products.push({
        name: p.name,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        categoryId: cat._id,
        price: p.price,
        stock: p.stock,
        reservedStock: 0,
        minimumStock: p.minimumStock,
        prepMinutes: p.prepMinutes,
        isVeg: p.isVeg,
        isPopular: p.isPopular ?? false,
        isActive: true,
        description: `${p.isVeg ? 'Vegetarian' : 'Non-vegetarian'} item — freshly prepared at the college food shop.`,
      });
    }
    await Product.insertMany(products);
    logger.info(`Seeded ${products.length} products`);
  }

  const settingsCount = await ShopSettings.countDocuments();
  if (settingsCount === 0) {
    await ShopSettings.create({
      shopName: 'College Food Shop',
      collegeName: 'My College',
      shopStatus: SHOP_STATUS.OPEN,
      contactPhone: '+91 00000 00000',
      contactEmail: 'shop@college.local',
      minOrderAmount: 0,
      serviceFee: 0,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    });
    logger.info('Shop settings created');
  }

  if ((await Coupon.countDocuments()) === 0) {
    await Coupon.create({
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 50,
      maxDiscount: 30,
      usageLimit: 1000,
      isActive: true,
    });
    logger.info('Coupon WELCOME10 created');
  }

  if ((await Event.countDocuments()) === 0) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

    const generateLayout = (rows: string[], cols: number, vipRows: string[] = ['A'], premRows: string[] = ['B', 'C'], basePrice: number = 80) => {
      const layout = [];
      for (const r of rows) {
        for (let c = 1; c <= cols; c++) {
          const isVip = vipRows.includes(r);
          const isPrem = premRows.includes(r);
          layout.push({
            row: r,
            number: c,
            label: `${r}${c}`,
            type: (isVip ? 'VIP' : isPrem ? 'PREMIUM' : 'STANDARD') as 'VIP' | 'PREMIUM' | 'STANDARD',
            price: isVip ? basePrice + 70 : isPrem ? basePrice + 30 : basePrice,
          });
        }
      }
      return layout;
    };

    const seedEvents = [
      {
        title: 'Campus Grand Auditorium Showcase',
        category: 'Auditorium',
        venue: 'Main Auditorium - Screen 1',
        tagline: 'Exclusive campus film premiere & tech keynote with plush recliner seating.',
        description: 'Experience high-fidelity acoustics and reserved seating with fast pre-order snack pickup.',
        bannerImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
        startingPrice: 120,
        durationMinutes: 120,
        dates: [today, tomorrow, dayAfter],
        timeSlots: [
          { time: '11:00 AM - 01:00 PM', label: 'Morning Show', totalSeats: 36, availableSeats: 36 },
          { time: '03:30 PM - 05:30 PM', label: 'Matinee Session', totalSeats: 36, availableSeats: 36 },
          { time: '07:00 PM - 09:00 PM', label: 'Prime Evening', totalSeats: 36, availableSeats: 36 },
        ],
        seatLayout: generateLayout(['A', 'B', 'C', 'D', 'E', 'F'], 6, ['A'], ['B', 'C'], 120),
        collectionCounter: 'Counter 1 - Auditorium Fast Track',
        isActive: true,
      },
      {
        title: 'Central Dining Hall — VIP Table Lounge',
        category: 'Dining Lounge',
        venue: 'Central Dining Hall - Zone A',
        tagline: 'Skip the lunch & dinner counter rush with guaranteed table seating.',
        description: 'Reserve private dining tables for your team or study group with hot meals prepared on arrival.',
        bannerImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        startingPrice: 50,
        durationMinutes: 60,
        dates: [today, tomorrow, dayAfter],
        timeSlots: [
          { time: '12:30 PM - 01:30 PM', label: 'Lunch Peak 1', totalSeats: 24, availableSeats: 24 },
          { time: '01:30 PM - 02:30 PM', label: 'Lunch Peak 2', totalSeats: 24, availableSeats: 24 },
          { time: '07:30 PM - 08:30 PM', label: 'Dinner Session', totalSeats: 24, availableSeats: 24 },
          { time: '08:30 PM - 09:30 PM', label: 'Late Dinner', totalSeats: 24, availableSeats: 24 },
        ],
        seatLayout: generateLayout(['T1', 'T2', 'T3', 'T4'], 6, ['T1'], ['T2'], 50),
        collectionCounter: 'Counter 2 - Express Pick',
        isActive: true,
      },
      {
        title: 'Live Acoustic & Sunset Garden Bistro',
        category: 'Campus Bistro',
        venue: 'Terrace Garden Lounge - Level 3',
        tagline: 'Evening coffee, artisan mocktails, and live acoustic music sets.',
        description: 'Relax with panoramic campus sunset views and reserved premium lounge chairs.',
        bannerImage: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80',
        startingPrice: 80,
        durationMinutes: 90,
        dates: [today, tomorrow, dayAfter],
        timeSlots: [
          { time: '05:00 PM - 06:30 PM', label: 'Sunset Acoustic', totalSeats: 24, availableSeats: 24 },
          { time: '07:00 PM - 08:30 PM', label: 'Evening Live Session', totalSeats: 24, availableSeats: 24 },
          { time: '09:00 PM - 10:30 PM', label: 'Night Jazz & Brews', totalSeats: 24, availableSeats: 24 },
        ],
        seatLayout: generateLayout(['S', 'B', 'C', 'D'], 6, ['S'], ['B'], 80),
        collectionCounter: 'Terrace Barista Bar',
        isActive: true,
      },
      {
        title: 'Late Night Exam Pods & Snack Lounge',
        category: 'Study Pods',
        venue: 'Student Hub - 2nd Floor Silent Zone',
        tagline: 'Quiet study desks with high-speed power, ergonomic chairs, and energy fuel.',
        description: 'Zero distractions with instant hot coffee and late night snacks delivered to your station.',
        bannerImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        startingPrice: 40,
        durationMinutes: 180,
        dates: [today, tomorrow, dayAfter],
        timeSlots: [
          { time: '08:00 PM - 11:00 PM', label: 'Evening Focus', totalSeats: 20, availableSeats: 20 },
          { time: '11:00 PM - 02:00 AM', label: 'Midnight Sprint', totalSeats: 20, availableSeats: 20 },
        ],
        seatLayout: generateLayout(['D1', 'D2', 'D3', 'D4'], 5, ['D1'], ['D2'], 40),
        collectionCounter: 'Hub Express Counter',
        isActive: true,
      },
    ];

    await Event.insertMany(seedEvents);
    logger.info(`Seeded ${seedEvents.length} venue events with interactive seat maps`);
  }

  await disconnectDatabase();
  logger.info('Seeding complete');
}

seed().catch(async (err) => {
  logger.error('Seed failed', { error: (err as Error).message });
  await disconnectDatabase();
  process.exit(1);
});
