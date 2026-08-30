# Dispenco — Developer & Project Execution Guide

See full detailed documentation in [`doc/Project_Run_Guide.md`](./doc/Project_Run_Guide.md).

---

## 🚀 Standard First-Time & Daily Project Startup Flow

To run Dispenco locally, follow these 3 steps in order:

### 1️⃣ Start Database & Cache Infrastructure (Required)
First, start PostgreSQL, Redis, and Meilisearch local containers via Docker:
```bash
docker compose up -d
```
*(Or start PostgreSQL only: `docker compose up -d postgres`)*

### 2️⃣ Verify / Apply Database Migrations
Ensure database tables are synced with the Prisma schema:
```bash
pnpm --filter @dispenco/api exec prisma migrate deploy
```

### 3️⃣ Run Application (Web + API)
Start NestJS backend (`http://localhost:4000/api/v1`) and Next.js frontend (`http://localhost:3000`):
```bash
pnpm dev
```

---

## 💡 Database Changes & Hot Reloading (FAQ)

### Do I need to restart Docker after database schema changes?
* **NO**: Docker runs the live PostgreSQL engine. Running `prisma migrate dev` applies SQL changes directly to the running database in real-time. You **never** need to restart Docker containers after schema changes.

### Do I need to restart the Backend API after database schema changes?
* **NO**: When you run `pnpm --filter @dispenco/api exec prisma migrate dev --name <name>`, Prisma automatically regenerates `@prisma/client`.
* The NestJS dev server running in watch mode (`pnpm dev`) automatically detects changes in `@prisma/client` and **hot-reloads** the API instantly.
* *Note:* If you pull new git code with migrations, simply run `pnpm --filter @dispenco/api exec prisma generate`.

---

## 🛠️ Quick Reference Commands

### Development
- **Run Full App**: `pnpm dev`
- **Run Backend API Only**: `pnpm --filter @dispenco/api dev`
- **Run Frontend Web Only**: `pnpm --filter @dispenco/web dev`

### Docker Infrastructure
- **Start All DB Services**: `docker compose up -d`
- **Stop All DB Services**: `docker compose down`
- **View DB Container Logs**: `docker compose logs -f`

### Database & Migrations
- **Create & Apply Migration**: `pnpm --filter @dispenco/api exec prisma migrate dev --name <change_name>`
- **Apply Existing Migrations**: `pnpm --filter @dispenco/api exec prisma migrate deploy`
- **Launch Prisma Studio (GUI)**: `pnpm --filter @dispenco/api exec prisma studio`
- **Regenerate Prisma Client**: `pnpm --filter @dispenco/api exec prisma generate`
- **Check Migration Status**: `pnpm --filter @dispenco/api exec prisma migrate status`
- **Reset Database**: `pnpm --filter @dispenco/api exec prisma migrate reset`

### Verification
- **Typecheck Monorepo**: `pnpm run typecheck`
- **Build Monorepo**: `pnpm run build`
