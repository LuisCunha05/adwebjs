FROM node:26.13-alpine AS base

FROM base as pnpm

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat
RUN npm install -g corepack && corepack enable

COPY package.json ./
RUN corepack install && pnpm -v

FROM pnpm AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM pnpm AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --exclude=public . .
COPY --from=deps /app/node_modules ./node_modules

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm exec prisma generate --schema src/infrastructure/prisma/schema.prisma

RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "-e", "process.on('SIGTERM', () => process.exit(0)); process.on('SIGINT', () => process.exit(0)); require('./server.js');"]
