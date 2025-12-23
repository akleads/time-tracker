// Cloudflare Pages Functions middleware
// Uses Node.js compatibility to run Express.js

export async function onRequest(context) {
  const { request, env } = context;
  
  // Set environment variables from Cloudflare env
  if (env.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
  if (env.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
  if (env.BASE_URL) process.env.BASE_URL = env.BASE_URL;
  if (env.SESSION_SECRET) process.env.SESSION_SECRET = env.SESSION_SECRET;
  
  // Dynamic import to handle CommonJS module
  const { createExpressApp } = await import('../server-cloudflare.js');
  
  // Create Express app
  const app = await createExpressApp(env);
  
  // Use Node.js compatibility handler from cloudflare:node
  try {
    const { httpServerHandler } = await import('cloudflare:node');
    return httpServerHandler({ port: 8788 }, app)(request);
  } catch (error) {
    // Fallback: manually handle the request
    console.error('Error with httpServerHandler:', error);
    return new Response('Server error', { status: 500 });
  }
}