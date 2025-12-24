#!/usr/bin/env node

/**
 * Keep-Alive Script
 * 
 * This script pings the health check endpoint to prevent the Render service
 * from going to sleep. Run this every 14 minutes using a cron service.
 * 
 * Usage:
 *   node scripts/keep-alive.js
 * 
 * Or set up a cron job:
 *   */14 * * * * /usr/bin/node /path/to/time-tracker/scripts/keep-alive.js
 * 
 * Or use an external service like:
 *   - cron-job.org (free)
 *   - EasyCron (free tier available)
 *   - UptimeRobot (free tier available)
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || process.env.RENDER_URL || 'https://time-tracker-rbsh.onrender.com';

async function pingServer() {
  const url = new URL(`${BASE_URL}/health`);
  const client = url.protocol === 'https:' ? https : http;
  
  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`✓ Server is alive - ${response.status} (uptime: ${Math.floor(response.uptime)}s)`);
            resolve(response);
          } catch (e) {
            console.log(`✓ Server responded with status ${res.statusCode}`);
            resolve({ status: res.statusCode });
          }
        } else {
          reject(new Error(`Server returned status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  try {
    await pingServer();
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to ping server:', error.message);
    process.exit(1);
  }
}

main();

