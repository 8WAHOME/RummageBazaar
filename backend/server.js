// server.js - Updated static file serving
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import productRoutes from './routes/products.js';
import userRoutes from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

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
  if (!staticServed && express.static(staticPath)) {
    try {
      app.use(express.static(staticPath));
      console.log(`Serving static files from: ${staticPath}`);
      staticServed = true;
    } catch (err) {
      console.log(`Static path not available: ${staticPath}`);
    }
  }
});

// Fallback for SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  const possibleIndexPaths = [
    path.join(__dirname, 'frontend/dist/index.html'),
    path.join(__dirname, '../frontend/dist/index.html'),
    path.join(__dirname, 'dist/index.html'),
    path.join(process.cwd(), 'frontend/dist/index.html'),
    path.join(process.cwd(), 'dist/index.html')
  ];

  for (const indexPath of possibleIndexPaths) {
    try {
      if (require('fs').existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    } catch (err) {
      continue;
    }
  }
  
  // If no index.html found, return simple response
  res.json({ 
    message: 'RummageBazaar API is running', 
    frontend: 'Frontend build not found. Please check deployment.' 
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});