# Features

## Core Capabilities

- Generated Polarion REST tool surface based on the OpenAPI definition.
- MCP stdio server for assistants that support Model Context Protocol.
- Optional HTTP wrapper for HTTP-only assistant clients.
- Input validation through JSON Schema to Zod conversion.
- Security handling for bearer, API key, basic auth, OAuth2, and OpenID-based OpenAPI schemes.

## Polarion-Specific Additions

- Server instructions and offline guide resources (query syntax, write bodies, paging and fields).
- Prompt templates for common work-item tasks.
- Custom GPT OpenAPI subset limited to the most important operations.

## Operational Features

- Environment-based configuration through .env or runtime variables.
- Support for multiple Polarion environments through separate MCP client entries.
- Optional local PDF extraction from sdk/ for offline documentation access.
- TLS override support for trusted internal instances with self-signed certificates.

## Non-Goals

- This repository is not a full Polarion UI.
- It does not replace Polarion permission management.
- It does not provide durable storage for project configuration beyond in-memory runtime caching.
- It does not maintain manually curated endpoint definitions; generated tool definitions come from Polarion OpenAPI.

## read_when

- Use this guide when you need a concise view of what the application supports.
