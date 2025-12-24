# Quick Setup Guide

## Local Setup

1. **Create `.env` file** in the project root:
```env
TURSO_DATABASE_URL=libsql://time-tracker-akleads.aws-us-west-2.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjY1Mjc0ODUsImlkIjoiMWMxMjAwMTItNWQ0Yi00NTVlLTk5MmMtOWYwZWZjZjA4OWY2IiwicmlkIjoiMjZkZGM3MWYtZmZmMy00MjBlLTgwM2ItN2E1YmQ4YWQyOWNlIn0.0lpZayzk-u179Y6nZFpzisoU-yLCLlOZmezJcz5ZMTdjQkd_7UnQMvaY_M-kZdIp-L_Z82aqF4qzS_pff78TDQ
BASE_URL=https://t.safeuinsurance.com
PORT=3000
SESSION_SECRET=generate-a-random-string-here-use-openssl-rand-hex-32
```

2. **Generate a secure session secret:**
```bash
openssl rand -hex 32
```
Replace `SESSION_SECRET` in `.env` with the generated value.

3. **Initialize the database:**
```bash
npm run init-db
```

4. **Start the server:**
```bash
npm start
```

5. **Access the application:**
- Open http://localhost:3000
- Register a new account
- Start creating campaigns!

## Next Steps

1. Follow the `DEPLOYMENT-RENDER.md` guide to deploy to Render
2. Configure your custom domain (t.safeuinsurance.com) in Render
3. Set environment variables in Render dashboard

## Important Notes

- The `.env` file is gitignored and will NOT be committed to Git
- Always keep your TURSO_AUTH_TOKEN and SESSION_SECRET secure
- Run `npm run init-db` only once to set up database tables
