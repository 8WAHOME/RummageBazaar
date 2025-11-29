// server.js - Updated static file serving
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rummagebazaar';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Don't exit process, just log error
  });

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RummageBazaar API is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Static files - Multiple possible locations for Render deployment
const staticPaths = [
  path.join(__dirname, 'frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, 'dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), 'dist')
];

let staticServed = false;

// Try multiple possible static file locations
staticPaths.forEach(staticPath => {
  if (!staticServed) {
    try {
      const fs = require('fs');
      if (fs.existsSync(staticPath)) {
        app.use(express.static(staticPath));
        console.log(`Serving static files from: ${staticPath}`);
        staticServed = true;
      }
    } catch (err) {
      console.log(`Static path not available: ${staticPath}`);
    }
  }
});

// Fallback for SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  // Handle API routes that don't exist
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path 
    });
  }

  const possibleIndexPaths = [
    path.join(__dirname, 'frontend/dist/index.html'),
    path.join(__dirname, '../frontend/dist/index.html'),
    path.join(__dirname, 'dist/index.html'),
    path.join(process.cwd(), 'frontend/dist/index.html'),
    path.join(process.cwd(), 'dist/index.html')
  ];

  for (const indexPath of possibleIndexPaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    } catch (err) {
      continue;
    }
  }
  
  // If no index.html found, return simple response
  res.json({ 
    message: 'RummageBazaar API is running', 
    frontend: 'Frontend build not found. Please check deployment.',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/products - Get products',
      'POST /api/users/sync - Sync user'
    ]
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});