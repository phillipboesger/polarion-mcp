import test from "node:test"
import assert from "node:assert/strict"
import { AxiosError } from "axios"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import type { McpToolDefinition } from "../src/types.js"
import { executeApiTool, sendWithRetry } from "../src/executor.js"

function makeAxiosError(status: number): AxiosError {
  const config = { headers: {} } as any
  const response: AxiosResponse = {
    data: {},
    status,
    statusText: String(status),
    headers: {},
    config,
  }
  const error = new AxiosError("request failed", String(status), config, undefined, response)
  return error
}

const emptyDefinition: McpToolDefinition = {
  name: "placeholder",
  description: "placeholder",
  inputSchema: { type: "object", properties: {} },
  method: "get",
  pathTemplate: "/placeholder",
  executionParameters: [],
  securityRequirements: [],
}

test("executeApiTool reports missing bearer token for refresh_polarion_config", async () => {
  const previous = process.env.BEARER_TOKEN
  delete process.env.BEARER_TOKEN

  try {
    const result = await executeApiTool("refresh_polarion_config", emptyDefinition, { projectId: "DEMO" }, {})

    const message = result.content[0]
    assert.equal(message.type, "text")
    if (message.type === "text") {
      assert.match(message.text, /BEARER_TOKEN not configured/)
    }
  } finally {
    if (typeof previous === "undefined") {
      delete process.env.BEARER_TOKEN
    } else {
      process.env.BEARER_TOKEN = previous
    }
  }
})

test("executeApiTool delegates unknown SDK document requests without touching the filesystem", async () => {
  const result = await executeApiTool("get_sdk_documentation", emptyDefinition, { documentId: "unknown-doc" }, {})

  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Unknown document ID: unknown-doc/)
    assert.match(message.text, /rest-api-guide/)
  }
})

test("executeApiTool returns validation errors before making an API request", async () => {
  const definition: McpToolDefinition = {
    ...emptyDefinition,
    name: "count_tool",
    inputSchema: {
      type: "object",
      properties: {
        count: { type: "number" },
      },
      required: ["count"],
    },
  }

  const result = await executeApiTool("count_tool", definition, { count: "three" }, {})
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Invalid arguments for tool 'count_tool'/)
  }
})

test("executeApiTool reports unresolved path parameters before any network request", async () => {
  const definition: McpToolDefinition = {
    ...emptyDefinition,
    name: "project_lookup",
    pathTemplate: "/projects/{projectId}",
    executionParameters: [{ name: "projectId", in: "path" }],
  }

  const result = await executeApiTool("project_lookup", definition, {}, {})
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Failed to resolve path parameters/)
  }
})

test("sendWithRetry retries once on a 503-then-200 sequence and returns the successful response", async () => {
  let calls = 0
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => {
    calls++
    if (calls === 1) throw makeAxiosError(503)
    return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config: {} as any }
  }

  const response = await sendWithRetry({}, { httpClient, minIntervalMs: 0, initialBackoffMs: 10 })
  assert.equal(calls, 2)
  assert.equal(response.status, 200)
})

test("sendWithRetry gives up after maxRetries and rethrows the last error", async () => {
  let calls = 0
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => {
    calls++
    throw makeAxiosError(503)
  }

  await assert.rejects(() =>
    sendWithRetry({}, { httpClient, minIntervalMs: 0, initialBackoffMs: 10, maxRetries: 2 })
  )
  assert.equal(calls, 3) // initial attempt + 2 retries
})

test("sendWithRetry does not retry on a non-retryable 400 error", async () => {
  let calls = 0
  const httpClient = async (_config: AxiosRequestConfig): Promise<AxiosResponse> => {
    calls++
    throw makeAxiosError(400)
  }

  await assert.rejects(() =>
    sendWithRetry({}, { httpClient, minIntervalMs: 0, initialBackoffMs: 10 })
  )
  assert.equal(calls, 1)
})

test("executeApiTool with dry_run true on a mutating tool returns a preview without calling the network", async () => {
  const definition: McpToolDefinition = {
    ...emptyDefinition,
    name: "create_thing",
    method: "post",
    pathTemplate: "/things",
    inputSchema: {
      type: "object",
      properties: { requestBody: { type: "object" } },
    },
    requestBodyContentType: "application/json",
    securityRequirements: [{ bearerAuth: [] }],
  }
  const securitySchemes = { bearerAuth: { type: "http", scheme: "bearer" } }

  const previous = process.env.BEARER_TOKEN
  process.env.BEARER_TOKEN = "super-secret-token"

  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("network should never be called during a dry run")
  }

  try {
    const result = await executeApiTool(
      "create_thing",
      definition,
      { requestBody: { title: "hello" }, dry_run: true },
      securitySchemes,
      { httpClient }
    )
    const message = result.content[0]
    assert.equal(message.type, "text")
    if (message.type === "text") {
      assert.match(message.text, /\/things/)
      assert.match(message.text, /POST/i)
      assert.doesNotMatch(message.text, /super-secret-token/)
    }
  } finally {
    if (typeof previous === "undefined") delete process.env.BEARER_TOKEN
    else process.env.BEARER_TOKEN = previous
  }
})

test("executeApiTool ignores dry_run on GET tools and executes the request live", async () => {
  const definition: McpToolDefinition = {
    ...emptyDefinition,
    name: "get_thing",
    method: "get",
    pathTemplate: "/things/1",
  }

  let called = false
  const httpClient = async (): Promise<AxiosResponse> => {
    called = true
    return { data: { ok: true }, status: 200, statusText: "OK", headers: { "content-type": "application/json" }, config: {} as any }
  }

  const result = await executeApiTool("get_thing", definition, { dry_run: true }, {}, { httpClient, minIntervalMs: 0 })
  assert.ok(called, "expected the GET request to actually be executed")
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /API Response/)
  }
})

test("regenerated tools.ts advertises dry_run on every mutating tool and no GET tool", async () => {
  const { toolDefinitionMap } = await import("../src/tools.js")
  const entries = Array.from(toolDefinitionMap.values())
  const mutating = entries.filter((t) => ["post", "put", "patch", "delete"].includes(t.method.toLowerCase()))
  const gets = entries.filter((t) => t.method.toLowerCase() === "get")

  assert.ok(mutating.length > 0, "expected at least one mutating tool in the generated tool set")
  assert.ok(gets.length > 0, "expected at least one GET tool in the generated tool set")

  for (const tool of mutating) {
    assert.ok(tool.inputSchema?.properties?.dry_run, `expected ${tool.name} (mutating) to advertise dry_run`)
  }

  const getWithDryRun = gets.find((t) => t.inputSchema?.properties?.dry_run)
  assert.equal(getWithDryRun, undefined, `GET tools should not advertise dry_run (found on ${getWithDryRun && (getWithDryRun as any).name})`)
})
