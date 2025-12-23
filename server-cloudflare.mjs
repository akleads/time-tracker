// Express app for Cloudflare Pages Functions
// Using ES modules but importing CommonJS modules

import express from 'express';
import session from 'express-session';
import { createRequire } from 'module';

// Create require function for current directory
const require = createRequire(import.meta.url);

export async function createExpressApp(env = {}) {
  // Set environment variables from Cloudflare env
  if (env?.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
  if (env?.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
  if (env?.BASE_URL) process.env.BASE_URL = env.BASE_URL;
  if (env?.SESSION_SECRET) process.env.SESSION_SECRET = env.SESSION_SECRET;
  
  // Use require for CommonJS modules
  const errorHandler = require('./middleware/errorHandler.js');
  const authRoutes = require('./routes/auth.js');
  const apiRoutes = require('./routes/api.js');
  const redirectRoutes = require('./routes/redirect.js');
  
  const app = express();
  
  // Trust proxy (important for Cloudflare)
  app.set('trust proxy', 1);
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Session configuration - using in-memory store
  const MemoryStore = session.MemoryStore;
  app.use(session({
    store: new MemoryStore(),
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Always secure on Cloudflare
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);
  app.use('/c', redirectRoutes);
  
  // Serve HTML pages - redirect to static files
  app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
  });
  
  app.get('/login', (req, res) => {
    res.redirect('/login.html');
  });
  
  // Root redirect
  app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
      res.redirect('/admin.html');
    } else {
      res.redirect('/login.html');
    }
  });
  
  // Error handler (must be last)
  app.use(errorHandler);
  
  return app;
}