// backend/scripts/createIndexes.js
// Run this ONCE after deploying to fix geospatial indexes

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import Product from '../models/productModel.js';

async function createIndexes() {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[SUCCESS] Connected to MongoDB');
    console.log('[INFO] Database:', mongoose.connection.db.databaseName);
    
    console.log('\n[INFO] Current indexes:');
    const existingIndexes = await Product.collection.indexes();
    console.log(existingIndexes);
    
    console.log('\n[INFO] Dropping old incorrect indexes...');
    try {
      await Product.collection.dropIndex('coordinates_2dsphere');
      console.log('[SUCCESS] Dropped old coordinates_2dsphere index');
    } catch (e) {
      console.log('[INFO] No old coordinates index found (this is fine)');
    }
    
    try {
      await Product.collection.dropIndex('coordinates_1');
      console.log('[SUCCESS] Dropped old coordinates_1 index');
    } catch (e) {
      console.log('[INFO] No coordinates_1 index found (this is fine)');
    }
    
    console.log('\n[INFO] Creating new optimized indexes...');
    await Product.createIndexes();
    console.log('[SUCCESS] All indexes created successfully!');
    
    console.log('\n[INFO] New indexes:');
    const newIndexes = await Product.collection.indexes();
    newIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}`);
      console.log('   Keys:', JSON.stringify(index.key));
      if (index.sparse) console.log('   Sparse: true');
      if (index['2dsphereIndexVersion']) console.log('   Type: 2dsphere (geospatial)');
      if (index.weights) console.log('   Weights:', index.weights);
      console.log('');
    });
    
    console.log('[INFO] Testing geospatial query...');
    const testLocation = await Product.findOne({ 
      'coordinates.coordinates': { $exists: true } 
    });
    
    if (testLocation) {
      console.log('[SUCCESS] Found product with coordinates:', {
        title: testLocation.title,
        location: testLocation.location,
        coordinates: testLocation.coordinates
      });
      
      const [lon, lat] = testLocation.coordinates.coordinates;
      const nearby = await Product.find({
        'coordinates.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            },
            $maxDistance: 50000
          }
        }
      }).limit(5);
      
      console.log(`[SUCCESS] Nearby search works! Found ${nearby.length} products within 50km`);
    } else {
      console.log('[INFO] No products with coordinates yet. Index is ready for when products are added.');
    }
    
    console.log('\n[SUCCESS] Index creation completed successfully!');
    console.log('[INFO] Your database is now optimized for performance.');
    
    await mongoose.connection.close();
    console.log('[INFO] Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n[ERROR] Error creating indexes:', error);
    console.error('Stack trace:', error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createIndexes();