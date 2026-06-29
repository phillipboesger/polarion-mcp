# polarion-mcp — Multi-stage build
#
# Runs the MCP Streamable HTTP server on port 3000 (MCP_HTTP_PORT overrides).
#
# Required env vars at runtime:
#   API_BASE_URL    — e.g. https://your-polarion.com/polarion/rest/v1
#   BEARER_TOKEN    — Polarion Personal Access Token
#   MCP_HTTP_TOKEN  — Bearer token clients must send to /mcp
#
# Optional:
#   MCP_HTTP_PORT               (default 3000)
#   MCP_ALLOWED_HOSTS           comma-separated allow-list for DNS-rebinding protection
#   NODE_TLS_REJECT_UNAUTHORIZED=0  disable SSL verification for self-signed certs

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/build ./build

USER node

EXPOSE 3000

CMD ["node", "build/mcp-http-server.js"]
