import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { getProductImageUrl } from '../utils/imageMapping';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function run() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('No DATABASE_URL found');

    await mongoose.connect(url);
    console.log('Connected to MongoDB');

    const products = await Product.find().populate('categoryId');
    let updated = 0;

    for (const product of products) {
      // Get category name safely
      let categoryName = '';
      if (product.categoryId) {
        const cat = await Category.findById(product.categoryId);
        if (cat) categoryName = cat.name;
      }

      const imageUrl = getProductImageUrl(product.name, categoryName);
      
      product.imageUrl = imageUrl;
      await product.save();
      
      console.log(`Updated ${product.name} -> ${imageUrl.substring(0, 40)}...`);
      updated++;
    }

    console.log(`Successfully migrated ${updated} products with new images.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
