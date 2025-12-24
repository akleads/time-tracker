# Render Deployment Guide

This guide will help you deploy the Time Tracker application to Render.

## Prerequisites

1. GitHub account with repository: `https://github.com/akleads/time-tracker`
2. Render account (free tier available)
3. Turso database credentials

## Step 1: Initialize Database (One-Time Setup)

Before deploying, initialize your Turso database locally:

```bash
npm install
npm run init-db
```

This creates all necessary tables in your Turso database and only needs to be run once.

## Step 2: Deploy to Render

### Option A: Using Render Dashboard (Recommended)

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Sign in or create an account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select repository: `akleads/time-tracker`
   - Click "Connect"

3. **Configure Service Settings**
   - **Name:** `time-tracker` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or choose a paid plan for better performance)

4. **Set Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:
   
   ```
   NODE_ENV=production
   TURSO_DATABASE_URL=libsql://time-tracker-akleads.aws-us-west-2.turso.io
   TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjY1Mjc0ODUsImlkIjoiMWMxMjAwMTItNWQ0Yi00NTVlLTk5MmMtOWYwZWZjZjA4OWY2IiwicmlkIjoiMjZkZGM3MWYtZmZmMy00MjBlLTgwM2ItN2E1YmQ4YWQyOWNlIn0.0lpZayzk-u179Y6nZFpzisoU-yLCLlOZmezJcz5ZMTdjQkd_7UnQMvaY_M-kZdIp-L_Z82aqF4qzS_pff78TDQ
   BASE_URL=https://t.safeuinsurance.com
   SESSION_SECRET=2e21151746844cdfe7639469761e8645a94c3c3062b2e0598ae9ab721f265092
   ```

5. **Create Service**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

### Option B: Using render.yaml (Infrastructure as Code)

1. **The `render.yaml` file is already in your repository**
2. **In Render Dashboard:**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` and use it for configuration
   - Set the environment variables manually (they're marked as `sync: false` for security)

## Step 3: Configure Custom Domain

1. In your Render service dashboard, go to "Settings"
2. Scroll to "Custom Domains"
3. Add your domain: `t.safeuinsurance.com`
4. Follow Render's instructions to configure DNS:
   - Add a CNAME record pointing to your Render service URL
   - Or use Render's nameservers if you prefer

## Step 4: Verify Deployment

1. Visit your Render service URL (e.g., `https://time-tracker.onrender.com`)
2. You should see the login page
3. Register a new user account
4. Test creating a campaign and redirect

## Environment Variables Reference

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `TURSO_DATABASE_URL` | `libsql://...` | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | `eyJ...` | Your Turso auth token |
| `BASE_URL` | `https://t.safeuinsurance.com` | Your application base URL |
| `SESSION_SECRET` | `2e21...` | Session encryption secret |
| `PORT` | (auto-set by Render) | Server port (Render sets this automatically) |

## Troubleshooting

### Database Connection Issues

- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correctly set
- Ensure your Turso database allows connections from Render's IPs
- Check Render logs for connection errors

### Sessions Not Working

- Verify `SESSION_SECRET` is set and secure
- Ensure `BASE_URL` matches your actual domain
- Check that cookies are enabled in your browser

### Build Failures

- Check Render build logs for specific errors
- Verify all dependencies in `package.json` are compatible
- Ensure Node.js version is 18+ (specified in `package.json`)

### Application Crashes

- Check Render logs for runtime errors
- Verify all environment variables are set
- Ensure database is initialized (`npm run init-db`)

## Render Free Tier Limitations

- Services may spin down after 15 minutes of inactivity (first request will be slow)
- Limited resources (512MB RAM, 0.1 CPU)
- For production use, consider upgrading to a paid plan

## Keep-Alive Setup (Prevent Service Sleep)

Render's free tier services spin down after 15 minutes of inactivity. To prevent this, set up a keep-alive job that pings your server every 14 minutes.

### Option 1: Using cron-job.org (Recommended - Free)

1. **Sign up for cron-job.org** (free account): https://cron-job.org
2. **Create a new cron job:**
   - URL: `https://your-render-service.onrender.com/health`
   - Schedule: Every 14 minutes (`*/14 * * * *`)
   - Method: GET
   - Click "Create cronjob"

### Option 2: Using UptimeRobot (Free)

1. **Sign up for UptimeRobot** (free tier): https://uptimerobot.com
2. **Add a new monitor:**
   - Monitor Type: HTTP(s)
   - Friendly Name: "Time Tracker Keep-Alive"
   - URL: `https://your-render-service.onrender.com/health`
   - Monitoring Interval: 5 minutes (free tier minimum)
   - Click "Create Monitor"

### Option 3: Using EasyCron (Free Tier)

1. **Sign up for EasyCron**: https://www.easycron.com
2. **Create a new cron job:**
   - URL: `https://your-render-service.onrender.com/health`
   - Cron Expression: `*/14 * * * *` (every 14 minutes)
   - Click "Save"

### Option 4: Using Render Cron Jobs (Paid Plan Only)

If you have a Render paid plan, you can use Render's built-in cron jobs:

1. In Render Dashboard, go to "New +" → "Cron Job"
2. Configure:
   - **Name:** `keep-alive`
   - **Schedule:** `*/14 * * * *` (every 14 minutes)
   - **Command:** `curl -f https://your-service.onrender.com/health || exit 1`
   - **Service:** Select your web service

**Note:** Cron jobs are only available on paid Render plans. For free tier, use one of the external services above.

### Option 5: Using Your Own Server/VPS

If you have a server with cron access:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path to your project):
*/14 * * * * cd /path/to/time-tracker && npm run keep-alive
```

Or use the script directly:

```bash
*/14 * * * * /usr/bin/node /path/to/time-tracker/scripts/keep-alive.js
```

### Testing the Keep-Alive

Test the health endpoint manually:

```bash
curl https://your-render-service.onrender.com/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-01-24T12:00:00.000Z",
  "uptime": 3600
}
```

### Health Endpoint

The application includes a `/health` endpoint that:
- Returns a 200 status code
- Shows server status and uptime
- Requires no authentication
- Lightweight and fast

## Monitoring

- View logs in real-time: Render Dashboard → Your Service → "Logs"
- Set up alerts: Settings → "Alerts"
- Monitor metrics: Dashboard shows CPU, Memory, and Request metrics

## Auto-Deploy

Render automatically deploys when you push to your main branch. To disable:
- Settings → "Auto-Deploy" → Disable

## SSL/HTTPS

Render provides free SSL certificates automatically for all services. Your custom domain will automatically get HTTPS enabled.
