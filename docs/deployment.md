# Deployment

## Render Deployment

- render.yaml defines a web service using Node.
- The build command runs `npm ci && npm run build:http`.
- The service starts with node build/index.js (HTTP server).
- Configure environment variables in the Render dashboard.

Required environment variables on Render:

- API_BASE_URL
- BEARER_TOKEN
- HTTP_API_KEY

Optional environment variables:

- HTTP_PORT when the platform does not provide PORT-like routing automatically.
- NODE_TLS_REJECT_UNAUTHORIZED only for trusted internal deployments with self-signed certificates.

## Other Platforms

- HTTP deployments run node build/index.js.
- MCP deployments run node build/index.js under a stdio MCP client.
- Ensure HTTP_PORT is provided by the platform or set explicitly.

## Mode-Specific Deployment Notes

- MCP stdio mode is usually not deployed as a public service. It is launched by the assistant client on demand.
- HTTP mode is the network-facing deployment target in this repository.
- The HTTP wrapper still depends on Polarion credentials at runtime because it delegates all tool execution to the same execution core.

## read_when

- Use this guide when deploying to Render or another hosting platform.
