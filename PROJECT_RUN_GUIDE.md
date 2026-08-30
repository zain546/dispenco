# Dispenco — Developer & Project Execution Guide

See full detailed documentation in [`doc/Project_Run_Guide.md`](./doc/Project_Run_Guide.md).

## Quick Reference Commands

### Development
- **Run Full App**: `pnpm dev`
- **Run Backend API Only**: `pnpm --filter @dispenco/api dev`
- **Run Frontend Web Only**: `pnpm --filter @dispenco/web dev`

### Database & Migrations
- **Create & Apply Migration**: `pnpm --filter @dispenco/api exec prisma migrate dev --name <change_name>`
- **Apply Existing Migrations**: `pnpm --filter @dispenco/api exec prisma migrate deploy`
- **Launch Prisma Studio (GUI)**: `pnpm --filter @dispenco/api exec prisma studio`
- **Regenerate Prisma Client**: `pnpm --filter @dispenco/api exec prisma generate`
- **check migration status**: `pnpm --filter @dispenco/api exec prisma migrate status`
- **reset database**: `pnpm --filter @dispenco/api exec prisma migrate reset`

### Verification
- **Typecheck Monorepo**: `pnpm run typecheck`
- **Build Monorepo**: `pnpm run build`
