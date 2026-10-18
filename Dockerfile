# ==============================================================================
# Mutabaah App - Production Multi-Stage Dockerfile
# Stack: Node 20 (Alpine) + Prisma Client + Express Backend + Vite React SPA
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# ------------------------------------------------------------------------------
# 2. Build Stage (Vite build + Prisma client generation)
# ------------------------------------------------------------------------------
FROM base AS builder
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------------------------
# 3. Production Runner Stage
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and runtime dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 3000

# Apply pending database migrations and launch Express application
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && exec npx tsx server/index.ts"]
