# syntax=docker/dockerfile:1
# Build context MUST be the monorepo root (not apps/api) — Turborepo'nun pnpm workspace'i
# ve packages/shared bağımlılığı yüzünden. Örn: docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

# ---- 1) prune: sadece @dogum-gunu/api'nin ihtiyaç duyduğu workspace paketlerini ayıkla ----
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune @dogum-gunu/api --docker

# ---- 2) installer: budanmış lockfile'la TÜM bağımlılıkları kur (dev dahil) ve derle ----
FROM base AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
# turbo prune yalnızca workspace paketlerinin dosyalarını taşıyor — kökteki paylaşılan
# tsconfig.base.json (apps/api ve packages/shared bunu extends ediyor) elle kopyalanmalı.
COPY tsconfig.base.json tsconfig.base.json

# prisma generate DB'ye bağlanmaz ama prisma.config.ts DATABASE_URL'in tanımlı olmasını
# bekliyor (env('DATABASE_URL')) — build zamanı için sahte bir değer yeterli, production'da
# gerçek bağlantı hiç kurulmaz.
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm --filter=@dogum-gunu/api exec prisma generate

RUN pnpm turbo run build --filter=@dogum-gunu/api...

# ---- 3) runner: yalnızca production bağımlılıkları + derlenmiş çıktı ----
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile --prod

COPY --from=installer /app/packages/shared/dist ./packages/shared/dist
COPY --from=installer /app/apps/api/dist ./apps/api/dist

# chown -R burada YOK: node_modules üzerinde çok yavaş (900+ paket). Root olarak kurulan
# dosyalar varsayılan umask ile zaten world-readable/execute — runtime kullanıcısının
# yazma izni gerekmiyor, sadece okuma yeterli.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs
USER nestjs

ENV NODE_ENV=production
EXPOSE 3000

CMD ["dumb-init", "node", "apps/api/dist/main.js"]
