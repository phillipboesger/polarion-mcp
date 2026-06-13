import test from "node:test"
import assert from "node:assert/strict"
import type { McpToolDefinition } from "../src/types.js"
import { executeApiTool } from "../src/executor.js"

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
