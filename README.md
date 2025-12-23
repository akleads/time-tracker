# Time-Based URL Redirector

A Node.js/Express application for managing time-based URL redirects with multi-user support, campaign management, and click statistics.

## Features

- **Multi-User Authentication**: Secure login system with password hashing
- **Time-Based Redirects**: Redirect traffic based on time ranges or specific times
- **Campaign Management**: Create and manage campaigns with multiple offers
- **Statistics Tracking**: Track clicks, redirects, and performance metrics
- **Timezone Support**: Configure timezones per campaign or time rule
- **UTM Parameter Preservation**: Automatically forward UTM parameters to destination URLs
- **Fallback Offers**: Default redirect URLs when no time rule matches

## Prerequisites

- Node.js 18+ 
- Turso database account (or local libSQL/SQLite for development)
- Cloudflare account (for deployment)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/akleads/time-tracker.git
cd time-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- `TURSO_DATABASE_URL`: Your Turso database URL
- `TURSO_AUTH_TOKEN`: Your Turso authentication token
- `BASE_URL`: Your application base URL (e.g., https://t.safeuinsurance.com)
- `SESSION_SECRET`: A random string for session encryption (generate with `openssl rand -hex 32`)
- `PORT`: Server port (default: 3000)

4. Initialize the database:
```bash
npm run init-db
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

### Accessing the Admin Interface

1. Navigate to `https://yourdomain.com/login`
2. Register a new account or login
3. Create campaigns and configure time-based redirect rules

### Creating a Campaign

1. Go to the admin dashboard
2. Click "Create Campaign"
3. Set campaign name, timezone, and fallback URL
4. Add offers with time rules
5. Copy the generated campaign link (e.g., `https://yourdomain.com/c/abc123`)

### Time Rules

- **Time Range**: Redirect during a specific time range (e.g., 9am-5pm)
- **Specific Time**: Redirect at a specific time (e.g., 2:00pm)
- **Day of Week**: Optionally restrict to specific days
- **Timezone**: Use campaign default or override per rule

## Deployment to Cloudflare

### Using Cloudflare Pages

1. Push your code to GitHub: `https://github.com/akleads/time-tracker`

2. In Cloudflare Dashboard:
   - Go to Pages → Create a project
   - Connect your GitHub repository
   - Configure build settings:
     - Build command: (leave empty or `npm install`)
     - Root directory: `/`
     - Node version: 18 or 20

3. Set environment variables in Cloudflare Pages:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `BASE_URL`
   - `SESSION_SECRET`
   - `PORT` (if needed)

4. Deploy and configure your custom domain

## Project Structure

```
time-tracker/
├── config/
│   └── database.js       # Turso database connection
├── models/               # Database models
├── routes/               # Express routes
├── controllers/          # Request handlers
├── middleware/           # Express middleware
├── public/               # Static files (HTML, CSS, JS)
├── scripts/              # Utility scripts
├── server.js             # Main entry point
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Campaigns
- `GET /api/campaigns` - List user's campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `GET /api/campaigns/:id/stats` - Get campaign statistics

### Redirects
- `GET /c/:slug` - Public redirect endpoint

## License

MIT
