# 🚀 Dispenco — Complete Production Deployment Guide

This guide covers everything required to deploy Dispenco to production with high availability, security, and performance.

---

## 🏗️ Architecture Overview

| Component | Technology | Default Port | Production Role |
|---|---|---|---|
| **Web Frontend** | Next.js 16 (App Router) | `3000` | Pharmacy POS, Inventory, Analytics, Settings UI |
| **Backend API** | NestJS 11 + Prisma ORM | `4000` | Core REST APIs, Authentication, Business Logic |
| **Database** | PostgreSQL 16 | `5432` | Multi-tenant relational storage & ledger |
| **In-Memory Cache & Queue** | Redis 7 + BullMQ | `6379` | Background jobs, rate-limiting, session caching |
| **Search Engine** | Meilisearch v1.10 | `7700` | Sub-millisecond medicine catalog & barcode search |

---

## 📋 Pre-Deployment Readiness Checklist

Before pushing to production, verify all packages build without errors:

```bash
# 1. Typecheck the entire monorepo
pnpm run typecheck

# 2. Build all packages (types, utils, api, web)
pnpm run build
```

---

## 🌐 Deployment Option 1: Managed Cloud (Vercel + Railway/Render)

This is the recommended setup for scalability and low maintenance.

### Part A: Database & Services (Railway, Supabase, Neon, Upstash)
1. **PostgreSQL**: Provision a PostgreSQL database (e.g. Supabase, Neon, or Railway Postgres).
2. **Redis**: Provision Redis (e.g. Upstash or Railway Redis).
3. **Run Prisma Migrations**:
   ```bash
   DATABASE_URL="<your_production_postgres_url>" pnpm --filter @dispenco/api exec prisma migrate deploy
   ```

### Part B: Deploy Backend API (Railway / Render / Fly.io / AWS ECS)
1. Connect your GitHub repository.
2. Set **Root Directory**: `.` (repo root) or configure monorepo build:
   - **Build Command**: `pnpm --filter @dispenco/types build && pnpm --filter @dispenco/utils build && pnpm --filter @dispenco/api build`
   - **Start Command**: `pnpm --filter @dispenco/api start` (or `node apps/api/dist/main`)
3. Add the following **Environment Variables**:
   ```ini
   PORT=4000
   NODE_ENV=production
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
   JWT_SECRET="<generate-64-char-random-string>"
   REFRESH_TOKEN_SECRET="<generate-64-char-random-string>"
   JWT_EXPIRATION="15m"
   REFRESH_TOKEN_EXPIRATION="7d"
   CLIENT_URL="https://your-frontend-domain.com"
   CORS_ORIGIN="https://your-frontend-domain.com"
   REDIS_URL="redis://default:password@host:port"
   MEILISEARCH_HOST="https://your-meilisearch-host"
   MEILISEARCH_API_KEY="your-meilisearch-master-key"
   GEMINI_API_KEY="your-gemini-key"
   ```

### Part C: Deploy Frontend Web (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory**: `apps/web`.
3. Set **Build Command**: `pnpm --filter @dispenco/types build && pnpm --filter @dispenco/utils build && pnpm --filter @dispenco/web build` (or set Root to `.` and Framework to `Next.js`).
4. Set **Output Directory**: `.next`.
5. Add **Environment Variables**:
   ```ini
   NEXT_PUBLIC_API_URL="https://your-api-domain.com/api/v1"
   ```
6. Click **Deploy**.

---

## 🐳 Deployment Option 2: Full Docker Stack (VPS / Single Server)

Deploy the entire stack (Database, Redis, Search, API, Web) on an Ubuntu/Debian VPS (DigitalOcean, AWS EC2, Hetzner, Linode) using Docker Compose:

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/your-org/dispenco.git
cd dispenco
```

### 2. Configure `.env` for Docker Compose
Create a `.env` file in the root directory:
```ini
POSTGRES_USER=dispenco_user
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=dispenco_db
MEILI_MASTER_KEY=your_secure_meili_key_at_least_16_bytes

JWT_SECRET=your_super_secret_jwt_key
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key
CLIENT_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
GEMINI_API_KEY=your_gemini_key

NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
```

### 3. Build & Start All Services
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Run Production Migrations Inside the API Container
```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

*(Optional: seed master medicine products)*
```bash
docker compose -f docker-compose.prod.yml exec api npx ts-node prisma/seed.ts
```

---

## 🔒 Nginx Reverse Proxy with SSL (Let's Encrypt)

If hosting on a VPS, use Nginx to route traffic and provide HTTPS:

```nginx
server {
    server_name your-domain.com;

    # Frontend Web
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25M;
    }
}
```

Enable SSL certificate with Certbot:
```bash
sudo certbot --nginx -d your-domain.com
```

---

## 🔍 Verification & Health Checks

After deployment, verify the production endpoints:

| Endpoint | Expected Result |
|---|---|
| `GET /api/v1/public/v1/ping` | `200 OK` — confirms API & Tenant Routing |
| `GET /api/v1/health` | `200 OK` — confirms Database & Redis connectivity |
| `GET /` | `200 OK` — Next.js production homepage / login |
| `GET /login` | `200 OK` — Auth form rendered with responsive styling |
