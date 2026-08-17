import { connectDatabase, disconnectDatabase } from '../config/db';
import { User, Category, Product, ShopSettings, Coupon, InventoryTransaction } from '../models';
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
    ]);
    logger.info('Database reset');
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

  await disconnectDatabase();
  logger.info('Seeding complete');
}

seed().catch(async (err) => {
  logger.error('Seed failed', { error: (err as Error).message });
  await disconnectDatabase();
  process.exit(1);
});
