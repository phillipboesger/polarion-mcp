# Polarion MCP Server
#
# Multi-stage build: compile TypeScript in a builder stage, then ship a slim
# runtime image. The default command starts the HTTP wrapper (useful for hosted
# deployments and Custom GPTs). For stdio MCP mode, override the command:
#   docker run --rm -i -e API_BASE_URL=... -e BEARER_TOKEN=... polarion-mcp node build/index.js

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including dev deps needed to compile TypeScript)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build (produces both build/index.js for stdio and build/http-server.js for HTTP)
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies in the final image
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Compiled output and runtime assets
COPY --from=builder /app/build ./build
COPY sdk ./sdk

# Run as the unprivileged node user
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Default to HTTP mode; override with `node build/index.js` for stdio MCP mode
CMD ["node", "build/http-server.js"]
