// Cloudflare Pages Functions middleware
// Uses Node.js compatibility to run Express.js

let appInstance = null;

async function initializeApp(env) {
  if (appInstance) return appInstance;
  
  try {
    // Set environment variables
    if (env.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    if (env.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
    if (env.BASE_URL) process.env.BASE_URL = env.BASE_URL;
    if (env.SESSION_SECRET) process.env.SESSION_SECRET = env.SESSION_SECRET;
    
    // Use require for CommonJS module (works with nodejs_compat)
    const { createExpressApp } = require('../server-cloudflare.js');
    
    // Create Express app
    appInstance = await createExpressApp(env);
    return appInstance;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    throw error;
  }
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    
    // Initialize app
    const app = await initializeApp(env);
    
    // Use Node.js compatibility handler
    const { httpServerHandler } = await import('cloudflare:node');
    const handler = httpServerHandler({ port: 8788 }, app);
    
    return await handler(request);
  } catch (error) {
    console.error('Worker error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}