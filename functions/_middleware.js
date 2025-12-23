// Cloudflare Pages Functions middleware
// Uses Node.js compatibility to run Express.js

let appPromise = null;

function getApp(env) {
  if (!appPromise) {
    appPromise = (async () => {
      // Set environment variables from Cloudflare env
      if (env.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
      if (env.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
      if (env.BASE_URL) process.env.BASE_URL = env.BASE_URL;
      if (env.SESSION_SECRET) process.env.SESSION_SECRET = env.SESSION_SECRET;
      
      // Dynamic import to handle CommonJS module
      const serverModule = await import('../server-cloudflare.js');
      const { createExpressApp } = serverModule.default || serverModule;
      
      // Create Express app
      return await createExpressApp(env);
    })();
  }
  return appPromise;
}

export async function onRequest(context) {
  try {
    const { request, env } = context;
    
    // Get or create Express app (singleton)
    const app = await getApp(env);
    
    // Use Node.js compatibility handler from cloudflare:node
    const { httpServerHandler } = await import('cloudflare:node');
    const handler = httpServerHandler({ port: 8788 }, app);
    
    return await handler(request);
  } catch (error) {
    // Better error handling
    console.error('Worker error:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}