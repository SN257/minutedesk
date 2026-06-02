# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config as a TEMPLATE (envsubst will fill in variables)
COPY nginx.conf /etc/nginx/templates/app.conf.template

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Default backend URL (override via environment variable in Coolify)
ENV BACKEND_URL=http://backend:3001

EXPOSE 80

# Use envsubst to substitute BACKEND_URL into the nginx config at startup
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/templates/app.conf.template > /etc/nginx/conf.d/app.conf && nginx -g 'daemon off;'"]
