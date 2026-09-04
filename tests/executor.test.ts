import test from "node:test"
import assert from "node:assert/strict"
import { AxiosError } from "axios"
import type { AxiosRequestConfig, AxiosResponse } from "axios"
import type FormData from "form-data"
import type { McpToolDefinition } from "../src/types.js"
import { executeApiTool, sendWithRetry, CUSTOM_FIELD_TOOL_SPECS } from "../src/executor.js"
import { _optionsCache, _fieldKeyCache } from "../src/guards.js"
import { toolDefinitionMap } from "../src/tools.js"

const patchWorkItemDefinition: McpToolDefinition = {
  name: "patchWorkItem",
  description: "Updates the specified Work Item.",
  method: "patch",
  pathTemplate: "/projects/{projectId}/workitems/{workItemId}",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "workItemId", in: "path" }],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      workItemId: { type: "string" },
      requestBody: { type: "object" },
    },
    required: ["projectId", "workItemId", "requestBody"],
  },
}

const postWorkItemsDefinition: McpToolDefinition = {
  name: "postWorkItems",
  description: "Creates a list of Work Items.",
  method: "post",
  pathTemplate: "/projects/{projectId}/workitems",
  executionParameters: [{ name: "projectId", in: "path" }],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: { projectId: { type: "string" }, requestBody: { type: "object" } },
    required: ["projectId", "requestBody"],
  },
}

const patchWorkItemsDefinition: McpToolDefinition = {
  name: "patchWorkItems",
  description: "Updates a list of Work Items.",
  method: "patch",
  pathTemplate: "/projects/{projectId}/workitems",
  executionParameters: [{ name: "projectId", in: "path" }],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: { projectId: { type: "string" }, requestBody: { type: "object" } },
    required: ["projectId", "requestBody"],
  },
}

const patchAllWorkItemsDefinition: McpToolDefinition = {
  name: "patchAllWorkItems",
  description: "Updates a list of Work Items in the Global context.",
  method: "patch",
  pathTemplate: "/all/workitems",
  executionParameters: [],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: { requestBody: { type: "object" } },
    required: ["requestBody"],
  },
}

const postDocumentsDefinition: McpToolDefinition = {
  name: "postDocuments",
  description: "Creates a list of Documents.",
  method: "post",
  pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "spaceId", in: "path" }],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: { projectId: { type: "string" }, spaceId: { type: "string" }, requestBody: { type: "object" } },
    required: ["projectId", "spaceId", "requestBody"],
  },
}

const patchPlanDefinition: McpToolDefinition = {
  name: "patchPlan",
  description: "Updates the specified Plan.",
  method: "patch",
  pathTemplate: "/projects/{projectId}/plans/{planId}",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "planId", in: "path" }],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: { projectId: { type: "string" }, planId: { type: "string" }, requestBody: { type: "object" } },
    required: ["projectId", "planId", "requestBody"],
  },
}

const patchDocumentDefinition: McpToolDefinition = {
  name: "patchDocument",
  description: "Updates the specified Document.",
  method: "patch",
  pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/{documentName}",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "spaceId", in: "path" }, { name: "documentName", in: "path" }],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: { projectId: { type: "string" }, spaceId: { type: "string" }, documentName: { type: "string" }, requestBody: { type: "object" } },
    required: ["projectId", "spaceId", "documentName", "requestBody"],
  },
}

const patchTestRecordsDefinition: McpToolDefinition = {
  name: "patchTestRecords",
  description: "Updates a list of Test Records.",
  method: "patch",
  pathTemplate: "/projects/{projectId}/testruns/{testRunId}/testrecords",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "testRunId", in: "path" }],
  requestBodyContentType: "application/json",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: { projectId: { type: "string" }, testRunId: { type: "string" }, requestBody: { type: "object" } },
    required: ["projectId", "testRunId", "requestBody"],
  },
}

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

const postWorkItemAttachmentsDefinition: McpToolDefinition = {
  name: "postWorkItemAttachments",
  description: "Creates one or more Work Item Attachments.",
  method: "post",
  pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "workItemId", in: "path" }],
  requestBodyContentType: "multipart/form-data",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      workItemId: { type: "string" },
      requestBody: { type: "string" },
    },
    required: ["projectId", "workItemId", "requestBody"],
  },
}

const importWordDocumentDefinition: McpToolDefinition = {
  name: "importWordDocument",
  description: "Imports a Word document to create a new Polarion Document.",
  method: "post",
  pathTemplate: "/projects/{projectId}/spaces/{spaceId}/documents/actions/importWordDocument",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "spaceId", in: "path" }],
  requestBodyContentType: "multipart/form-data",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      spaceId: { type: "string" },
      requestBody: { type: "string" },
    },
    required: ["projectId", "spaceId", "requestBody"],
  },
}

const patchWorkItemAttachmentDefinition: McpToolDefinition = {
  name: "patchWorkItemAttachment",
  description: "Updates the specified Work Item Attachment.",
  method: "patch",
  pathTemplate: "/projects/{projectId}/workitems/{workItemId}/attachments/{attachmentId}",
  executionParameters: [{ name: "projectId", in: "path" }, { name: "workItemId", in: "path" }, { name: "attachmentId", in: "path" }],
  requestBodyContentType: "multipart/form-data",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      workItemId: { type: "string" },
      attachmentId: { type: "string" },
      requestBody: { type: "string" },
    },
    required: ["projectId", "workItemId", "attachmentId", "requestBody"],
  },
}

const updateAvatarDefinition: McpToolDefinition = {
  name: "updateAvatar",
  description: "Updates the specified User Avatar.",
  method: "post",
  pathTemplate: "/users/{userId}/actions/updateAvatar",
  executionParameters: [{ name: "userId", in: "path" }],
  requestBodyContentType: "multipart/form-data",
  securityRequirements: [],
  inputSchema: {
    type: "object",
    properties: {
      userId: { type: "string" },
      requestBody: { type: "string" },
    },
    required: ["userId"],
  },
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

test("executeApiTool renders text/html rich-text fields as Markdown alongside the raw HTML in the response", async () => {
  const definition: McpToolDefinition = { ...emptyDefinition, name: "get_thing", method: "get", pathTemplate: "/things/1" }
  const httpClient = async (): Promise<AxiosResponse> => ({
    data: { data: { type: "workitems", id: "A-1", attributes: { description: { type: "text/html", value: "<p>Hello <strong>world</strong></p>" } } } },
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config: {} as any,
  })

  const result = await executeApiTool("get_thing", definition, {}, {}, { httpClient, minIntervalMs: 0 })
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /"value": "<p>Hello <strong>world<\/strong><\/p>"/, "original HTML value must still be present, byte-identical")
    assert.match(message.text, /"value_markdown": "Hello \*\*world\*\*"/)
  }
})

test("executeApiTool refuses a patchWorkItem write with an invalid enum value, never sending the PATCH", async () => {
  _optionsCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") {
      return { data: { data: [{ id: "open" }, { id: "closed" }] }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    patchCalled = true
    throw new Error("the actual write should never be reached when the guard refuses")
  }

  const result = await executeApiTool(
    "patchWorkItem",
    patchWorkItemDefinition,
    { projectId: "DEMO", workItemId: "DEMO-1", requestBody: { data: { type: "workitems", id: "DEMO/DEMO-1", attributes: { status: "bogus" } } } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!patchCalled, "PATCH must not be sent once the guard refuses the write")
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /'status' value 'bogus'/)
    assert.match(message.text, /open/)
  }
})

test("executeApiTool sends a patchWorkItem write once the guard confirms a valid enum value", async () => {
  _optionsCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") {
      return { data: { data: [{ id: "open" }, { id: "closed" }] }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    patchCalled = true
    return { data: {}, status: 204, statusText: "No Content", headers: {}, config: {} as any }
  }

  const result = await executeApiTool(
    "patchWorkItem",
    patchWorkItemDefinition,
    { projectId: "DEMO", workItemId: "DEMO-2", requestBody: { data: { type: "workitems", id: "DEMO/DEMO-2", attributes: { status: "closed" } } } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(patchCalled, "PATCH should be sent once the guard confirms the value is valid")
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /API Response/)
})

test("executeApiTool preserves a Work Item custom field through validation (GH feedback: custom fields never reach Polarion)", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  // Mirrors the real generated patchWorkItem schema in src/tools.ts, where
  // `attributes` only lists the OOTB fields (title/status/severity/...) --
  // Polarion custom fields are additional, undeclared keys on the same
  // object. Before the getZodSchemaFromJsonSchema passthrough fix, Zod's
  // default "strip unknown keys" behavior silently dropped them here.
  const patchWorkItemWithRestrictiveAttributesSchema: McpToolDefinition = {
    ...patchWorkItemDefinition,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        workItemId: { type: "string" },
        requestBody: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                type: { type: "string" },
                id: { type: "string" },
                attributes: {
                  type: "object",
                  properties: { title: { type: "string" }, status: { type: "string" } },
                },
              },
            },
          },
        },
      },
      required: ["projectId", "workItemId", "requestBody"],
    },
  }

  let sentBody: any
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    // The update-mode custom-field-key guard issues an instance-scoped
    // getFieldsMetadata GET before the real PATCH -- must resolve
    // myCustomField as a real field or the guard refuses the write and
    // the PATCH below is never reached.
    if (String(config.url).includes("/actions/getFieldsMetadata")) {
      return {
        data: { data: { attributes: { title: { label: "Title" }, myCustomField: { label: "My Custom Field", type: { kind: "string" } } } } },
        status: 200, statusText: "OK", headers: {}, config: {} as any,
      }
    }
    sentBody = config.data
    return { data: {}, status: 204, statusText: "No Content", headers: {}, config: {} as any }
  }

  await executeApiTool(
    "patchWorkItem",
    patchWorkItemWithRestrictiveAttributesSchema,
    {
      projectId: "DEMO",
      workItemId: "DEMO-4",
      requestBody: {
        data: { type: "workitems", id: "DEMO/DEMO-4", attributes: { title: "Doc update", myCustomField: "released" } },
      },
    },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.equal(sentBody.data.attributes.title, "Doc update", "the OOTB field still goes through")
  assert.equal(sentBody.data.attributes.myCustomField, "released", "the custom field must reach the actual PATCH body")
})

test("executeApiTool fails closed (refuses the write) when the guard's own lookup errors", async () => {
  _optionsCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") throw new Error("Polarion unreachable")
    patchCalled = true
    throw new Error("the actual write should never be reached when the guard's lookup fails")
  }

  const result = await executeApiTool(
    "patchWorkItem",
    patchWorkItemDefinition,
    { projectId: "DEMO", workItemId: "DEMO-3", requestBody: { data: { type: "workitems", id: "DEMO/DEMO-3", attributes: { severity: "critical" } } } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!patchCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /Polarion unreachable/)
  }
})

test("executeApiTool skips the guard entirely for a patchWorkItem write with no enum fields", async () => {
  _optionsCache.clear()
  let getCalled = false
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") {
      getCalled = true
      return { data: { data: [] }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    patchCalled = true
    return { data: {}, status: 204, statusText: "No Content", headers: {}, config: {} as any }
  }

  await executeApiTool(
    "patchWorkItem",
    patchWorkItemDefinition,
    { projectId: "DEMO", workItemId: "DEMO-4", requestBody: { data: { type: "workitems", id: "DEMO/DEMO-4", attributes: { title: "Renamed" } } } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!getCalled, "no enum fields present -- the guard should not make any lookup call")
  assert.ok(patchCalled)
})

test("executeApiTool refuses a postWorkItems bulk create when one new item has an invalid enum value", async () => {
  _optionsCache.clear()
  let postCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") {
      assert.equal((config.params as any)?.type, "defect", "should resolve options by the new item's type, not an existing instance")
      return { data: { data: [{ id: "new" }, { id: "open" }] }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    postCalled = true
    throw new Error("the actual create must never be reached when the guard refuses")
  }

  const result = await executeApiTool(
    "postWorkItems",
    postWorkItemsDefinition,
    {
      projectId: "DEMO",
      requestBody: {
        data: [
          { type: "workitems", attributes: { type: "defect", title: "One", status: "new" } },
          { type: "workitems", attributes: { type: "defect", title: "Two", status: "bogus" } },
        ],
      },
    },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!postCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /'status' value 'bogus'/)
    assert.match(message.text, /new 'defect' Work Item in DEMO/)
  }
})

test("executeApiTool sends a postWorkItems bulk create once all new items validate", async () => {
  _optionsCache.clear()
  let postCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") {
      return { data: { data: [{ id: "new" }] }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    postCalled = true
    return { data: {}, status: 201, statusText: "Created", headers: {}, config: {} as any }
  }

  await executeApiTool(
    "postWorkItems",
    postWorkItemsDefinition,
    { projectId: "DEMO", requestBody: { data: [{ type: "workitems", attributes: { type: "defect", status: "new" } }] } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(postCalled)
})

test("executeApiTool refuses a postWorkItems create with an unknown custom field key", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  let postCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      assert.equal((config.params as any)?.targetType, "task")
      // Real shape (confirmed live against a stock Polarion 2606 instance):
      // {data: {attributes: {fieldId: {...}}}}, not a JSON:API {data:[{id}]} list.
      return { data: { data: { attributes: { realCustomField: { label: "Real Custom Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    postCalled = true
    throw new Error("create must never be reached once the field-key guard refuses")
  }

  const result = await executeApiTool(
    "postWorkItems",
    postWorkItemsDefinition,
    { projectId: "DEMO", requestBody: { data: [{ type: "workitems", attributes: { type: "task", title: "x", bogusCustomField: "y" } }] } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!postCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /Unknown field key\(s\) bogusCustomField/)
  }
})

test("executeApiTool refuses a patchWorkItem UPDATE with an unknown custom field key, via the instance-scoped lookup -- this session's new coverage (previously updates were never checked at all)", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      assert.equal(url, "https://polarion.example.com/polarion/rest/v1/projects/DEMO/workitems/DEMO-1/actions/getFieldsMetadata")
      assert.equal(config.params, undefined, "instance-scoped lookup takes no resourceType/targetType params")
      return { data: { data: { attributes: { realCustomField: { label: "Real Custom Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    patchCalled = true
    throw new Error("patch must never be reached once the field-key guard refuses")
  }

  const result = await executeApiTool(
    "patchWorkItem",
    patchWorkItemDefinition,
    { projectId: "DEMO", workItemId: "DEMO-1", requestBody: { data: { type: "workitems", id: "DEMO/DEMO-1", attributes: { bogusCustomField: "y" } } } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!patchCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /Unknown field key\(s\) bogusCustomField/)
  }
})

test("executeApiTool accepts a postDocuments create with a real registered custom field, refuses a bogus one -- new resource-type coverage (Document, typed)", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  const httpClientAccept = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      assert.equal((config.params as any)?.resourceType, "documents")
      assert.equal((config.params as any)?.targetType, "generic")
      return { data: { data: { attributes: { docCustomField: { label: "Doc Custom Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    return { data: {}, status: 201, statusText: "Created", headers: {}, config: {} as any }
  }
  const acceptResult = await executeApiTool(
    "postDocuments",
    postDocumentsDefinition,
    { projectId: "DEMO", spaceId: "_default", requestBody: { data: [{ type: "documents", attributes: { type: "generic", title: "x", docCustomField: "y" } }] } },
    {},
    { httpClient: httpClientAccept, minIntervalMs: 0, postMutationDelayMs: 0 }
  )
  const acceptMessage = acceptResult.content[0]
  assert.equal(acceptMessage.type, "text")
  if (acceptMessage.type === "text") assert.match(acceptMessage.text, /API Response \(Status: 201\)/)

  _optionsCache.clear()
  let postCalled = false
  const httpClientRefuse = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      return { data: { data: { attributes: {} } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    postCalled = true
    throw new Error("create must never be reached once the field-key guard refuses")
  }
  const refuseResult = await executeApiTool(
    "postDocuments",
    postDocumentsDefinition,
    { projectId: "DEMO", spaceId: "_default", requestBody: { data: [{ type: "documents", attributes: { type: "generic", title: "x", bogusDocField: "y" } }] } },
    {},
    { httpClient: httpClientRefuse, minIntervalMs: 0, postMutationDelayMs: 0 }
  )
  assert.ok(!postCalled)
  const refuseMessage = refuseResult.content[0]
  assert.equal(refuseMessage.type, "text")
  if (refuseMessage.type === "text") {
    assert.match(refuseMessage.text, /Write refused/)
    assert.match(refuseMessage.text, /Unknown field key\(s\) bogusDocField/)
  }
})

test("executeApiTool accepts a patchPlan UPDATE with a real registered custom field -- new resource-type coverage (Plan, typeless)", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      assert.equal(url, "https://polarion.example.com/polarion/rest/v1/projects/DEMO/plans/MyPlan/actions/getFieldsMetadata")
      return { data: { data: { attributes: { planCustomField: { label: "Plan Custom Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    return { data: {}, status: 204, statusText: "No Content", headers: {}, config: {} as any }
  }
  const result = await executeApiTool(
    "patchPlan",
    patchPlanDefinition,
    { projectId: "DEMO", planId: "MyPlan", requestBody: { data: { type: "plans", attributes: { name: "x", planCustomField: "y" } } } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /API Response \(Status: 204\)/)
})

test("executeApiTool refuses a patchWorkItems BULK update when one item has an unknown custom field key, resolving each item's own instance-scoped lookup from its composite id", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      if (url.includes("/workitems/DEMO-1/")) {
        return { data: { data: { attributes: { realField: { label: "Real Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
      }
      if (url.includes("/workitems/DEMO-2/")) {
        return { data: { data: { attributes: { someOtherField: { label: "Some Other Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
      }
      throw new Error(`unexpected getFieldsMetadata lookup: ${url}`)
    }
    patchCalled = true
    throw new Error("bulk patch must never be reached once the field-key guard refuses")
  }

  const result = await executeApiTool(
    "patchWorkItems",
    patchWorkItemsDefinition,
    {
      projectId: "DEMO",
      requestBody: {
        data: [
          { type: "workitems", id: "DEMO/DEMO-1", attributes: { realField: "ok" } },
          { type: "workitems", id: "DEMO/DEMO-2", attributes: { bogusField: "y" } },
        ],
      },
    },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!patchCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /Unknown field key\(s\) bogusField/)
    assert.match(message.text, /DEMO\/DEMO-2/)
  }
})

test("executeApiTool refuses a patchWorkItems BULK update item whose composite id can't be resolved at all, rather than silently skipping validation for it", async () => {
  // Regression for a review finding: a bare id with no fallback projectId
  // (patchAllWorkItems has none in its own path) used to be silently
  // skipped by the custom-field-key guard, even though it still got full
  // enum + user-reference validation -- an inconsistency between guards on
  // the exact same item. Now it must refuse instead.
  _optionsCache.clear()
  _fieldKeyCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.url).includes("/actions/getFieldsMetadata")) {
      throw new Error("must never look up field metadata for an unresolvable id -- it should fail closed before any network call")
    }
    patchCalled = true
    throw new Error("bulk patch must never be reached once the field-key guard refuses")
  }

  const result = await executeApiTool(
    "patchAllWorkItems",
    patchAllWorkItemsDefinition,
    { requestBody: { data: [{ type: "workitems", id: "no-slash-and-no-fallback-projectid", attributes: { someCustomField: "y" } }] } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!patchCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /Cannot resolve/)
  }
})

test("executeApiTool accepts a patchWorkItems BULK update item with a bare id (no slash), falling back to the tool's own projectId -- same fallback the enum guard already uses", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      assert.equal(url, "https://polarion.example.com/polarion/rest/v1/projects/DEMO/workitems/DEMO-1/actions/getFieldsMetadata")
      return { data: { data: { attributes: { realField: { label: "Real Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    return { data: {}, status: 204, statusText: "No Content", headers: {}, config: {} as any }
  }

  const result = await executeApiTool(
    "patchWorkItems",
    patchWorkItemsDefinition,
    { projectId: "DEMO", requestBody: { data: [{ type: "workitems", id: "DEMO-1", attributes: { realField: "ok" } }] } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /API Response \(Status: 204\)/)
})

test("executeApiTool accepts a patchDocument UPDATE with a real registered custom field -- new resource-type coverage (Document update, 3-segment instance path)", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      assert.equal(url, "https://polarion.example.com/polarion/rest/v1/projects/DEMO/spaces/_default/documents/MyDoc/actions/getFieldsMetadata")
      return { data: { data: { attributes: { docCustomField: { label: "Doc Custom Field", type: { kind: "string" } } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    return { data: {}, status: 204, statusText: "No Content", headers: {}, config: {} as any }
  }
  const result = await executeApiTool(
    "patchDocument",
    patchDocumentDefinition,
    { projectId: "DEMO", spaceId: "_default", documentName: "MyDoc", requestBody: { data: { type: "documents", attributes: { title: "x", docCustomField: "y" } } } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /API Response \(Status: 204\)/)
})

test("executeApiTool refuses a patchTestRecords BULK update with an unknown custom field key, resolving the 5-segment composite id (project/testRun/testCaseProject/testCase/iteration) -- the single most error-prone table entry", async () => {
  _optionsCache.clear()
  _fieldKeyCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/actions/getFieldsMetadata")) {
      assert.equal(url, "https://polarion.example.com/polarion/rest/v1/projects/A/testruns/B/testrecords/C/D/0/actions/getFieldsMetadata")
      return { data: { data: { attributes: { comment: { label: "Comment" } } } }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    patchCalled = true
    throw new Error("bulk patch must never be reached once the field-key guard refuses")
  }

  const result = await executeApiTool(
    "patchTestRecords",
    patchTestRecordsDefinition,
    {
      projectId: "A",
      testRunId: "B",
      requestBody: { data: [{ type: "testrecords", id: "A/B/C/D/0", attributes: { bogusTestRecordField: "y" } }] },
    },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!patchCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /Unknown field key\(s\) bogusTestRecordField/)
  }
})

test("CUSTOM_FIELD_TOOL_SPECS: every entry resolves to a real generated tool with a matching method and pathTemplate -- guards against src/tools.ts regeneration silently disabling custom-field-key protection for a tool", () => {
  for (const spec of CUSTOM_FIELD_TOOL_SPECS) {
    const matches = [...toolDefinitionMap.values()].filter(
      (def) => def.method.toLowerCase() === spec.method && def.pathTemplate === spec.pathTemplate
    )
    assert.equal(
      matches.length,
      1,
      `expected exactly one generated tool for ${spec.method.toUpperCase()} ${spec.pathTemplate} (resourceType=${spec.resourceType}, mode=${spec.mode}), found ${matches.length}`
    )
  }
})

test("executeApiTool refuses a postWorkItems create when the assignee does not exist", async () => {
  _optionsCache.clear()
  let postCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = String(config.url)
    if (url.includes("/users/")) {
      const cfg = { headers: {} } as any
      throw new AxiosError("Not Found", "404", cfg, undefined, { data: {}, status: 404, statusText: "Not Found", headers: {}, config: cfg })
    }
    postCalled = true
    throw new Error("create must never be reached once the user-reference guard refuses")
  }

  const result = await executeApiTool(
    "postWorkItems",
    postWorkItemsDefinition,
    {
      projectId: "DEMO",
      requestBody: {
        data: [
          {
            type: "workitems",
            attributes: { type: "task", title: "x" },
            relationships: { assignee: { data: [{ type: "users", id: "ghost" }] } },
          },
        ],
      },
    },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!postCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /Write refused/)
    assert.match(message.text, /User 'ghost' does not exist/)
  }
})

test("executeApiTool refuses a patchWorkItems bulk update using the composite PROJECT/WORKITEMID id", async () => {
  _optionsCache.clear()
  let patchCalled = false
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") {
      assert.match(String(config.url), /\/workitems\/DEMO-2\//, "should resolve options for the specific item parsed out of the composite id")
      return { data: { data: [{ id: "open" }, { id: "closed" }] }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    patchCalled = true
    throw new Error("must never be reached")
  }

  const result = await executeApiTool(
    "patchWorkItems",
    patchWorkItemsDefinition,
    { projectId: "DEMO", requestBody: { data: [{ type: "workitems", id: "DEMO/DEMO-2", attributes: { status: "bogus" } }] } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(!patchCalled)
  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /Write refused/)
})

test("executeApiTool refuses a patchAllWorkItems (global) update, parsing project from the composite id", async () => {
  _optionsCache.clear()
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    if (String(config.method).toLowerCase() === "get") {
      assert.match(String(config.url), /\/projects\/OTHERPROJ\/workitems\/OTHERPROJ-9\//)
      return { data: { data: [{ id: "open" }] }, status: 200, statusText: "OK", headers: {}, config: {} as any }
    }
    throw new Error("must never be reached")
  }

  const result = await executeApiTool(
    "patchAllWorkItems",
    patchAllWorkItemsDefinition,
    { requestBody: { data: [{ type: "workitems", id: "OTHERPROJ/OTHERPROJ-9", attributes: { status: "bogus" } }] } },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /Write refused/)
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


test("executeApiTool sends a real multipart/form-data body (with boundary) for postWorkItemAttachments, not a raw JSON string", async () => {
  let capturedConfig: AxiosRequestConfig | undefined
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    capturedConfig = config
    return { data: {}, status: 201, statusText: "Created", headers: {}, config: {} as any }
  }

  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  const requestBody = JSON.stringify({
    resource: { data: [{ type: "workitem_attachments", attributes: { fileName: "test.png", title: "Test attachment" } }] },
    files: [pngBase64],
  })

  const result = await executeApiTool(
    "postWorkItemAttachments",
    postWorkItemAttachmentsDefinition,
    { projectId: "DEMO", workItemId: "DEMO-1", requestBody },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(capturedConfig, "expected the HTTP client to be invoked")
  const contentType = String((capturedConfig!.headers as Record<string, string>)["content-type"])
  assert.match(contentType, /^multipart\/form-data; boundary=/, "Content-Type must include a real boundary")

  const form = capturedConfig!.data as FormData
  assert.equal(typeof (form as any).getBuffer, "function", "the body must be a real FormData instance, not a JSON string")
  const buffer = form.getBuffer()
  const raw = buffer.toString("latin1")
  assert.match(raw, /name="resource"/)
  assert.match(raw, /Content-Type: application\/json/)
  assert.match(raw, /workitem_attachments/)
  assert.match(raw, /name="files"/)
  assert.match(raw, /filename="file-0"/)

  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /API Response \(Status: 201\)/)
})

test("executeApiTool builds multipart parts for the 'file' + 'parameters' shape used by importWordDocument", async () => {
  let capturedConfig: AxiosRequestConfig | undefined
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    capturedConfig = config
    return { data: {}, status: 200, statusText: "OK", headers: {}, config: {} as any }
  }

  const docxBase64 = Buffer.from("fake docx bytes").toString("base64")
  const requestBody = JSON.stringify({
    file: docxBase64,
    parameters: { documentName: "MyDoc", title: "My Doc", documentType: "generic" },
  })

  await executeApiTool(
    "importWordDocument",
    importWordDocumentDefinition,
    { projectId: "DEMO", spaceId: "_default", requestBody },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(capturedConfig, "expected the HTTP client to be invoked")
  const form = capturedConfig!.data as FormData
  const raw = form.getBuffer().toString("latin1")
  assert.match(raw, /name="file"/)
  assert.match(raw, /filename="file"/)
  assert.match(raw, /name="parameters"/)
  assert.match(raw, /documentName/)
  assert.match(raw, /MyDoc/)
})

test("executeApiTool rejects a non-JSON requestBody for a multipart tool without calling the network", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("network should never be called for an unparseable multipart requestBody")
  }

  const result = await executeApiTool(
    "postWorkItemAttachments",
    postWorkItemAttachmentsDefinition,
    { projectId: "DEMO", workItemId: "DEMO-1", requestBody: "not json" },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /requestBody for a multipart\/form-data tool must be a JSON string/)
})

test("executeApiTool dry_run on a multipart tool previews field names and byte lengths, never the raw base64 or a live call", async () => {
  const httpClient = async (): Promise<AxiosResponse> => {
    throw new Error("network should never be called during a dry run")
  }

  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  const requestBody = JSON.stringify({
    resource: { data: [{ type: "workitem_attachments", attributes: { fileName: "test.png" } }] },
    files: [pngBase64],
  })

  const result = await executeApiTool(
    "postWorkItemAttachments",
    postWorkItemAttachmentsDefinition,
    { projectId: "DEMO", workItemId: "DEMO-1", requestBody, dry_run: true },
    {},
    { httpClient, minIntervalMs: 0 }
  )

  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") {
    assert.match(message.text, /binary, \d+ bytes/)
    assert.doesNotMatch(message.text, new RegExp(pngBase64.replace(/[+/=]/g, "\\$&")))
  }
})


test("executeApiTool decodes the 'content' field (patch*Attachment replace-content shape) as binary, not raw base64 text", async () => {
  let capturedConfig: AxiosRequestConfig | undefined
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    capturedConfig = config
    return { data: {}, status: 200, statusText: "OK", headers: {}, config: {} as any }
  }

  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  const requestBody = JSON.stringify({
    resource: { data: { type: "workitem_attachments", id: "att-1", attributes: { fileName: "test.png" } } },
    content: pngBase64,
  })

  await executeApiTool(
    "patchWorkItemAttachment",
    patchWorkItemAttachmentDefinition,
    { projectId: "DEMO", workItemId: "DEMO-1", attachmentId: "att-1", requestBody },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(capturedConfig, "expected the HTTP client to be invoked")
  const form = capturedConfig!.data as FormData
  const raw = form.getBuffer().toString("latin1")
  assert.match(raw, /name="content"/)
  assert.match(raw, /filename="content"/)
  // The decoded PNG signature bytes must appear as raw binary, not as the base64 text.
  assert.ok(raw.includes(Buffer.from(pngBase64, "base64").toString("latin1")), "expected decoded binary bytes in the body")
  assert.ok(!raw.includes(pngBase64), "the raw base64 string must not appear verbatim -- it must be decoded")
})

test("executeApiTool decodes a bare 'content' field (updateAvatar shape, no resource part) as binary", async () => {
  let capturedConfig: AxiosRequestConfig | undefined
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    capturedConfig = config
    return { data: {}, status: 200, statusText: "OK", headers: {}, config: {} as any }
  }

  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  const requestBody = JSON.stringify({ content: pngBase64 })

  await executeApiTool(
    "updateAvatar",
    updateAvatarDefinition,
    { userId: "jdoe", requestBody },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  assert.ok(capturedConfig, "expected the HTTP client to be invoked")
  const form = capturedConfig!.data as FormData
  const raw = form.getBuffer().toString("latin1")
  assert.match(raw, /name="content"/)
  assert.ok(!raw.includes(pngBase64), "the raw base64 string must not appear verbatim -- it must be decoded")
})

test("executeApiTool rejects a non-string entry inside requestBody.files instead of silently dropping it", async () => {
  const httpClient = async () => {
    throw new Error("network should never be called when a files[] entry is malformed")
  }

  const requestBody = JSON.stringify({
    resource: { data: [{ type: "workitem_attachments", attributes: { fileName: "test.png" } }] },
    files: [12345],
  })

  const result = await executeApiTool(
    "postWorkItemAttachments",
    postWorkItemAttachmentsDefinition,
    { projectId: "DEMO", workItemId: "DEMO-1", requestBody },
    {},
    { httpClient, minIntervalMs: 0, postMutationDelayMs: 0 }
  )

  const message = result.content[0]
  assert.equal(message.type, "text")
  if (message.type === "text") assert.match(message.text, /requestBody\.files\[0\] must be a base64-encoded string/)
})
