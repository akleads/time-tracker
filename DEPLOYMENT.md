# Deployment Guide

## Cloudflare Pages Deployment

This guide will help you deploy the Time Tracker application to Cloudflare Pages.

### Prerequisites

1. GitHub account with the repository: `https://github.com/akleads/time-tracker`
2. Cloudflare account
3. Turso database credentials

### Step 1: Set Up Environment Variables Locally

Create a `.env` file in the project root:

```env
TURSO_DATABASE_URL=libsql://time-tracker-akleads.aws-us-west-2.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjY1Mjc0ODUsImlkIjoiMWMxMjAwMTItNWQ0Yi00NTVlLTk5MmMtOWYwZWZjZjA4OWY2IiwicmlkIjoiMjZkZGM3MWYtZmZmMy00MjBlLTgwM2ItN2E1YmQ4YWQyOWNlIn0.0lpZayzk-u179Y6nZFpzisoU-yLCLlOZmezJcz5ZMTdjQkd_7UnQMvaY_M-kZdIp-L_Z82aqF4qzS_pff78TDQ
BASE_URL=https://t.safeuinsurance.com
PORT=3000
SESSION_SECRET=your-session-secret-here-generate-with-openssl-rand-hex-32
```

**Important:** Generate a secure session secret:
```bash
openssl rand -hex 32
```

### Step 2: Initialize Database

Before deploying, initialize your Turso database:

```bash
npm install
npm run init-db
```

This will create all necessary tables in your Turso database.

### Step 3: Deploy to Cloudflare Pages

1. **Go to Cloudflare Dashboard**
   - Navigate to Workers & Pages → Create Application → Pages → Connect to Git

2. **Connect GitHub Repository**
   - Select your GitHub account
   - Choose the `akleads/time-tracker` repository
   - Click "Begin setup"

3. **Configure Build Settings**
   - **Project name:** `time-tracker` (or your preferred name)
   - **Production branch:** `main`
   - **Build command:** Leave empty (or `npm install` if needed)
   - **Build output directory:** Leave empty (we're serving from root)
   - **Root directory:** `/` (project root)
   - **Node version:** `18` or `20`

4. **Set Environment Variables**
   In the Environment variables section, add:
   - `TURSO_DATABASE_URL` = `libsql://time-tracker-akleads.aws-us-west-2.turso.io`
   - `TURSO_AUTH_TOKEN` = `[your-token-from-above]`
   - `BASE_URL` = `https://t.safeuinsurance.com`
   - `SESSION_SECRET` = `[generated-secret-from-step-1]`
   - `NODE_ENV` = `production`
   - `PORT` = `8788` (Cloudflare Pages default, or use environment variable)

5. **Deploy**
   - Click "Save and Deploy"
   - Wait for the build to complete

### Step 4: Configure Custom Domain

1. In Cloudflare Pages dashboard, go to your project
2. Click on "Custom domains"
3. Add your domain: `t.safeuinsurance.com`
4. Follow the DNS configuration instructions if needed

### Step 5: Verify Deployment

1. Visit your domain: `https://t.safeuinsurance.com`
2. You should be redirected to the login page
3. Create your first user account
4. Test creating a campaign and redirect

### Troubleshooting

**Issue: Database connection errors**
- Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are correctly set
- Ensure your Turso database is accessible from Cloudflare's network

**Issue: Session not working**
- Verify SESSION_SECRET is set and secure
- Ensure cookies are enabled in your browser
- Check that BASE_URL matches your actual domain

**Issue: Build fails**
- Check Node version compatibility (should be 18 or 20)
- Verify all dependencies in package.json are compatible

### Notes

- Cloudflare Pages uses a different port internally, so PORT may not need to be set
- Make sure your SESSION_SECRET is strong and unique
- Never commit `.env` file to Git (it's in .gitignore)
- The database initialization script (`npm run init-db`) should be run once before first deployment
