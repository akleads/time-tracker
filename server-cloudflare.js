// Express app for Cloudflare Pages Functions
// Uses CommonJS for compatibility with existing code

const express = require('express');
const session = require('express-session');

async function createExpressApp(env = {}) {
  // Set environment variables from Cloudflare env
  if (env.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
  if (env.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
  if (env.BASE_URL) process.env.BASE_URL = env.BASE_URL;
  if (env.SESSION_SECRET) process.env.SESSION_SECRET = env.SESSION_SECRET;
  
  const errorHandler = require('./middleware/errorHandler');
  const authRoutes = require('./routes/auth');
  const apiRoutes = require('./routes/api');
  const redirectRoutes = require('./routes/redirect');
  
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

module.exports = { createExpressApp };