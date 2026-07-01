# syntax=docker/dockerfile:1

# ---- Base with pnpm-free npm workspace ----
FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# libc for onnxruntime (transformers.js / bge-small) native bindings
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Builder (Next.js standalone) ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runner: the web app ----
FROM base AS web
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

# ---- Runner: the background worker (BullMQ + bge-small) ----
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Warm the bge-small model into the image so the first job is not slow.
RUN node -e "require('@xenova/transformers').env.cacheDir='/app/.models'" || true
CMD ["npx", "tsx", "src/worker.ts"]
