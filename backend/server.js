// server.js - Optimized for Performance
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Render runs behind a reverse proxy. Without this every visitor shares one IP
// and express-rate-limit buckets everyone together.
app.set('trust proxy', 1);

// Security & Performance Middleware (ORDER MATTERS - these go first)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression()); // Gzip compression - reduces response size by 70%+

// Response time logger - tracks slow requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    let marker = '[OK]';
    if (duration > 1000) marker = '[SLOW]';
    if (duration > 500) marker = '[WARN]';
    
    console.log(`${marker} ${req.method} ${req.path} - ${duration}ms - ${res.statusCode}`);
    
    // Alert on very slow requests
    if (duration > 3000) {
      console.warn(`[CRITICAL] VERY SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});

// CORS & Body Parser Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Clerk: parses the session token on every request so getAuth(req) works in controllers.
// Requires CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY in the environment.
app.use(clerkMiddleware());

// MongoDB Connection with Pooling and Error Handling
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rummagebazaar';

console.log('[INFO] Attempting MongoDB connection...');

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  w: 'majority'
};

// Retry instead of process.exit(1). A crash-loop makes Render answer with 502s that
// carry no CORS headers, which the browser reports as a generic "fetch failed".
// Staying up lets /api/health report the real state and API calls return proper errors.
async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(MONGODB_URI, MONGO_OPTIONS);
    console.log('[SUCCESS] MongoDB connected successfully');
    console.log('[INFO] Database:', mongoose.connection.db.databaseName);
    console.log('[INFO] Connection pool ready');
  } catch (err) {
    console.error(`[ERROR] MongoDB connection failed (attempt ${attempt}):`, err.message);
    console.log('[WARN] Check MONGO_URI on Render and the Atlas Network Access allowlist. Retrying in 5s...');
    setTimeout(() => connectWithRetry(attempt + 1), 5000);
  }
}

connectWithRetry();

// MongoDB Connection Event Handlers
mongoose.connection.on('error', err => {
  console.error('[ERROR] MongoDB runtime error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[WARN] MongoDB disconnected. Will attempt to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[SUCCESS] MongoDB reconnected successfully');
});

// Enable query logging in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName, method, query) => {
    console.log(`[DB-QUERY] ${collectionName}.${method}`, JSON.stringify(query).substring(0, 100));
  });
}

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint - for UptimeRobot monitoring
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'OK', 
    service: 'RummageBazaar API',
    database: dbStatus,
    databaseName: mongoose.connection.db?.databaseName || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

// Lightweight ping endpoint (even faster than /health)
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Database debug endpoint
app.get('/api/debug/db', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const productCount = await mongoose.connection.db.collection('products').countDocuments();
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    
    res.json({
      database: db.databaseName,
      collections: collections.map(c => c.name),
      counts: {
        products: productCount,
        users: userCount
      },
      connectionState: mongoose.connection.readyState,
      readyStates: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }[mongoose.connection.readyState]
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connectionState: mongoose.connection.readyState
    });
  }
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
      if (fs.existsSync(staticPath)) {
        app.use(express.static(staticPath, {
          maxAge: '1d',
          etag: true
        }));
        console.log(`[INFO] Serving static files from: ${staticPath}`);
        staticServed = true;
      }
    } catch (err) {
      // Path doesn't exist, continue
    }
  }
});

// Fallback for SPA routing - serve index.html for all other routes
app.get(/.*/, (req, res) => {
  // Handle API routes that don't exist
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      availableEndpoints: [
        'GET /api/health',
        'GET /api/products',
        'POST /api/products',
        'GET /api/users'
      ]
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
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    } catch (err) {
      continue;
    }
  }
  
  // If no index.html found, return API info
  res.json({ 
    service: 'RummageBazaar API',
    version: '1.0.0',
    status: 'running',
    frontend: 'Frontend build not found. This is normal for backend-only deployment.',
    documentation: 'Use /api/* endpoints for API access',
    endpoints: {
      health: 'GET /api/health - Service health check',
      products: 'GET /api/products - List all products',
      productDetail: 'GET /api/products/:id - Get product details',
      createProduct: 'POST /api/products - Create new product (auth required)',
      users: 'GET /api/users - User management'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log(`  Server running on port ${PORT}`);
  console.log('========================================');
  console.log(`  Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Pending...'}`);
  console.log('========================================');
  console.log('');
  console.log('Available endpoints:');
  console.log(`   - Health: http://localhost:${PORT}/api/health`);
  console.log(`   - Products: http://localhost:${PORT}/api/products`);
  console.log(`   - Ping: http://localhost:${PORT}/ping`);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WARN] SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('[INFO] Server closed');
    mongoose.connection.close(false, () => {
      console.log('[INFO] MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('[WARN] SIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('[INFO] Server closed');
    mongoose.connection.close(false, () => {
      console.log('[INFO] MongoDB connection closed');
      process.exit(0);
    });
  });
});