# polarion-mcp — Multi-stage build
#
# Default transport: HTTP on port 7332 (set PORT env var to override).
# For stdio mode (VS Code, Claude Desktop): set TRANSPORT_TYPE=stdio
#
# Required env vars at runtime:
#   POLARION_BASE_URL  — e.g. https://polarion.example.com/polarion/rest/v1
#   POLARION_PAT       — Personal Access Token
#
# Optional:
#   PORT                     (default 7332)
#   TRANSPORT_TYPE           stdio | http  (default http)
#   ENABLE_HEALTH_ENDPOINT   true | false  (exposes GET /healthz)
#   AUTH_SCHEME              Bearer | Basic (default Bearer)
#   HTTP_TIMEOUT_MS          (default 15000)
#   LOG_LEVEL                silent | error | warn | info | debug

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 7332
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:7332/healthz || exit 1

CMD ["node", "dist/server.js"]
