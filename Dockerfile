# syntax=docker/dockerfile:1

# onnxruntime-node 는 glibc 필요 → Alpine(musl) 대신 Debian slim 사용
FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# production 의존성만 (runner 크기 절감 참고용 — standalone 빌드 사용)
FROM deps AS prod-deps
RUN npm prune --omit=dev

FROM base AS builder
ARG BUILD_ID=dev
ENV BUILD_ID=$BUILD_ID
ENV NEXT_PUBLIC_BUILD_ID=$BUILD_ID
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ARG BUILD_ID=dev
ENV BUILD_ID=$BUILD_ID
ENV NEXT_PUBLIC_BUILD_ID=$BUILD_ID
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild

COPY --from=builder /app/public ./public
COPY --from=builder /app/USER_MANUAL.md ./USER_MANUAL.md
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# standalone 에 포함되지 않는 네이티브 패키지
COPY --from=builder /app/node_modules/@huggingface ./node_modules/@huggingface
COPY --from=builder /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=builder /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common
COPY --from=builder /app/node_modules/ioredis ./node_modules/ioredis
COPY --from=builder /app/node_modules/pino ./node_modules/pino
COPY --from=builder /app/node_modules/thread-stream ./node_modules/thread-stream
COPY --from=builder /app/node_modules/sonic-boom ./node_modules/sonic-boom
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp

RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

COPY docker/entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
