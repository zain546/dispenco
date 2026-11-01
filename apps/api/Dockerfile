FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN npm install -g pnpm@11.22.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages ./packages

RUN pnpm --filter @dispenco/types build
RUN pnpm --filter @dispenco/utils build
RUN pnpm --filter @dispenco/api exec prisma generate
RUN pnpm --filter @dispenco/api build

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app ./

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
