# ───────────────────────────────────────────────────────────────────────
# Stage 1: build
# ───────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
# TODO: revert to 'npm ci --ignore-scripts' once real package-lock.json is committed
RUN npm install --ignore-scripts

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ───────────────────────────────────────────────────────────────────────
# Stage 2: production image
# ───────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Non-root user for security
RUN addgroup -S mcq && adduser -S mcq -G mcq

COPY package*.json ./
# TODO: revert to 'npm ci --omit=dev --ignore-scripts' once real package-lock.json is committed
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY src/db/schema.sql ./src/db/schema.sql

USER mcq

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/api/server.js"]
