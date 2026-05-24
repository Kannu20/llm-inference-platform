# backend/Dockerfile
# Multi-stage build for minimal production image

# ── Stage 1: Dependencies ────────────────────────────────────
# FROM node:22-alpine AS deps
# WORKDIR /app

# # Install build tools for native addons
# RUN apk add --no-cache python3 make g++

# COPY package.json package-lock.json* ./
# RUN npm ci --only=production

# # ── Stage 2: Builder ─────────────────────────────────────────
# FROM node:22-alpine AS builder
# WORKDIR /app

# COPY package.json package-lock.json* ./
# RUN npm ci

# COPY . .
# RUN npm run db:generate
# RUN npm run build

# # ── Stage 3: Production runner ───────────────────────────────
# FROM node:22-alpine AS runner
# WORKDIR /app

# ENV NODE_ENV=production

# # Create non-root user for security
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nodeapp

# # Copy only what we need
# COPY --from=deps --chown=nodeapp:nodejs /app/node_modules ./node_modules
# COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
# COPY --from=builder --chown=nodeapp:nodejs /app/prisma ./prisma
# COPY --from=builder --chown=nodeapp:nodejs /app/package.json ./

# USER nodeapp

# EXPOSE 4000

# # Run migrations then start
# CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]

# backend/Dockerfile

# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl libc6-compat

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build


# ── Stage 2: Production runner ───────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeapp

# IMPORTANT: builder se copy karna
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodeapp:nodejs /app/package.json ./

USER nodeapp

EXPOSE 4000

CMD ["sh","-c","npx prisma migrate deploy && node dist/server.js"]