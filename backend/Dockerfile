# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=development

COPY package*.json .npmrc ./
RUN npm ci

COPY . .
RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y python3 make g++ curl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json .npmrc ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001

CMD ["./docker-entrypoint.sh"]
