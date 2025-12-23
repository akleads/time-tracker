// Cloudflare Pages Functions middleware
// Uses Node.js compatibility to run Express.js

let appInstance = null;
let appInitPromise = null;

async function getApp(env) {
  if (appInstance) return appInstance;
  
  if (!appInitPromise) {
    appInitPromise = (async () => {
      try {
        // Import ES module version
        const { createExpressApp } = await import('../server-cloudflare.mjs');
        appInstance = await createExpressApp(env);
        return appInstance;
      } catch (error) {
        console.error('App initialization error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
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
    
    // Handle API routes, redirects, and main pages through Express
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/c') || 
        url.pathname === '/' || url.pathname === '/admin' || url.pathname === '/login') {
      
      // Get Express app
      const app = await getApp(env);
      
      // Use Node.js compatibility handler
      const { httpServerHandler } = await import('cloudflare:node');
      const handler = httpServerHandler({ port: 8788 }, app);
      
      return await handler(request);
    }
    
    // For static files, let Cloudflare Pages handle them
    return context.next();
    
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