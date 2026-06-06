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

# Run migrations then start the app
CMD ["sh", "-c", "npm run migration:run:prod && node dist/main.js"]

EXPOSE 3001
