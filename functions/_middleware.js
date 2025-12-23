// Cloudflare Pages Functions middleware
// Uses Node.js compatibility to run Express.js

import { createExpressApp } from '../server-cloudflare.js';

let app = null;

export async function onRequest(context) {
  // Initialize app on first request
  if (!app) {
    app = await createExpressApp(context.env);
  }
  
  // Use Node.js compatibility handler
  const { httpServerHandler } = await import('cloudflare:node');
  return httpServerHandler({ port: 8788 }, app)(context.request);
}