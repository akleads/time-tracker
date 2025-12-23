# Cloudflare Pages Deployment Guide

## Configuration Required

### 1. Cloudflare Pages Build Settings

When setting up your project in Cloudflare Pages:

- **Framework preset:** None (or Other)
- **Build command:** Leave empty (or `npm install`)
- **Build output directory:** Leave empty
- **Root directory:** `/`
- **Node version:** 18 or 20

### 2. Compatibility Flags

Make sure to enable Node.js compatibility in your Cloudflare Pages settings:

- Go to your Pages project settings
- Under "Compatibility flags", enable: `nodejs_compat`

Alternatively, the `wrangler.toml` file includes this flag.

### 3. Environment Variables

Set these in Cloudflare Pages dashboard (Settings → Environment variables):

```
TURSO_DATABASE_URL=libsql://time-tracker-akleads.aws-us-west-2.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjY1Mjc0ODUsImlkIjoiMWMxMjAwMTItNWQ0Yi00NTVlLTk5MmMtOWYwZWZjZjA4OWY2IiwicmlkIjoiMjZkZGM3MWYtZmZmMy00MjBlLTgwM2ItN2E1YmQ4YWQyOWNlIn0.0lpZayzk-u179Y6nZFpzisoU-yLCLlOZmezJcz5ZMTdjQkd_7UnQMvaY_M-kZdIp-L_Z82aqF4qzS_pff78TDQ
BASE_URL=https://t.safeuinsurance.com
SESSION_SECRET=2e21151746844cdfe7639469761e8645a94c3c3062b2e0598ae9ab721f265092
NODE_ENV=production
```

### 4. How It Works

The app uses Cloudflare's Node.js compatibility feature:

- `functions/_middleware.js` - Entry point for Cloudflare Pages Functions
- Uses `cloudflare:node` module's `httpServerHandler` to run Express.js
- All your existing Express routes and controllers work without modification
- Static files (HTML, CSS, JS) are served automatically by Cloudflare Pages

### 5. Deploy

1. Connect your GitHub repository
2. Configure build settings as above
3. Set environment variables
4. Enable `nodejs_compat` compatibility flag
5. Deploy!

### 6. Initialize Database

Before using the app, initialize your Turso database:

```bash
npm install
npm run init-db
```

This only needs to be done once.

### Troubleshooting

**If you get "module not found" errors:**
- Make sure `nodejs_compat` flag is enabled
- Check that all dependencies are in `package.json`

**If sessions don't work:**
- Verify `SESSION_SECRET` is set
- Check that cookies are enabled in browser
- Ensure `BASE_URL` matches your domain

**If database connections fail:**
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correct
- Check that Turso database is accessible from Cloudflare's network
