# Extension seams

The MCP server supports synthetic tools and per-call extension hooks through `createPolarionServer` and `createMcpHttpApp` options. All tools pass through the same call pipeline.

## Virtual tools

Register a `VirtualTool` with `registerVirtualTool()` from `src/virtual-tools.ts`. It has a name, title, description, JSON input schema, MCP annotations, one toolset, and a handler. The handler receives `VirtualToolContext`, including `callPolarionTool()` for generated operations. That helper runs the normal executor, write guards, and request token handling. The registry is empty by default.

Virtual tools use the generated-tool filters: `MCP_TOOLS`, `MCP_READ_ONLY`, `MCP_TOOLSETS`, and request toolset/read-only narrowing. A request can only narrow deployment settings. The `composites` toolset is reserved for synthetic tools that combine multiple Polarion operations.

## Per-call extensions

`extensions` accepts optional `policyHook`, `auditSink`, `authProvider`, and `instanceResolver` implementations. Defaults allow calls, discard audit events, derive an anonymous or token-scoped principal, and use the configured `API_BASE_URL`.

The policy hook runs before execution. It can allow, deny with a reason, or require confirmation. A denial returns an MCP error and skips execution. The audit sink receives one event after each tool call; arguments and principal identifiers are SHA-256 hashed, and bearer tokens are never included. The instance resolver selects the REST API base URL for the authenticated principal.

See the exported interfaces in `src/extensions.ts` and `src/virtual-tools.ts` for exact shapes.

## Telemetry hook

`createPolarionServer` accepts optional `telemetry` callbacks from `src/telemetry.ts`. `onSpanStart` receives the operation name, correlation ID, and tool name; `onSpanEnd` receives the span handle plus outcome and duration. The no-op default keeps the server dependency-free. Hook failures are isolated from tool execution.
