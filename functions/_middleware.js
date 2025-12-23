// Cloudflare Pages Functions middleware
// Uses Node.js compatibility to run Express.js

let appInstance = null;
let appInitPromise = null;

async function getApp(env) {
  if (appInstance) return appInstance;
  
  if (!appInitPromise) {
    appInitPromise = (async () => {
      try {
        // Set environment variables
        if (env?.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
        if (env?.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
        if (env?.BASE_URL) process.env.BASE_URL = env.BASE_URL;
        if (env?.SESSION_SECRET) process.env.SESSION_SECRET = env.SESSION_SECRET;
        
        // Import CommonJS module using createRequire
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const serverModule = require('../server-cloudflare.js');
        
        // Create Express app
        appInstance = await serverModule.createExpressApp(env);
        return appInstance;
      } catch (error) {
        console.error('App initialization error:', error);
        appInitPromise = null; // Reset on error
        throw error;
      }
    })();
  }
  
  return await appInitPromise;
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // Handle static files - let Cloudflare Pages serve them
    // Only handle API routes and redirects through Express
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/c') || 
        url.pathname === '/' || url.pathname === '/admin' || url.pathname === '/login') {
      
      // Get Express app
      const app = await getApp(env);
      
      // Use Node.js compatibility handler
      const { httpServerHandler } = await import('cloudflare:node');
      const handler = httpServerHandler({ port: 8788 }, app);
      
      return await handler(request);
    }
    
    // For other paths, return 404 or let Pages handle it
    return new Response('Not found', { status: 404 });
    
  } catch (error) {
    console.error('Worker error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        type: error.name
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}