import test from "node:test"
import assert from "node:assert/strict"
import { AxiosError } from "axios"
import { compileZodSchema, extractJsonApiErrorDetail, formatApiError, getZodSchemaFromJsonSchema, paramToSafeInputKey, bearerCredential, logSafe, readArg, redact, sanitizeInputSchema } from "../src/utils.js"
import { toolDefinitionMap } from "../src/tools.js"

test("redact removes authorization credentials and query API keys", () => {
  const value = redact("Authorization: Bearer abc123 Basic dXNlcjpwYXNz ?api_key=key-1&token=tok-2")
  assert.doesNotMatch(value, /abc123|dXNlcjpwYXNz|key-1|tok-2/)
  assert.match(value, /Bearer \[REDACTED\]/)
  assert.match(value, /Basic \[REDACTED\]/)
})

test("sanitizeInputSchema rewrites invalid property names and records the mapping", () => {
  const nameMap: Record<string, string> = {}
  const sanitized = sanitizeInputSchema(
    {
      type: "object",
      properties: {
        "page[size]": { type: "number" },
        nested: {
          type: "object",
          properties: {
            "fields[workitems]": { type: "string" },
          },
        },
      },
    },
    nameMap,
  )

  assert.ok(sanitized.properties.page_size_)
  assert.ok(sanitized.properties.nested.properties.fields_workitems_)
  assert.equal(nameMap.page_size_, "page[size]")
  assert.equal(nameMap.fields_workitems_, "fields[workitems]")
})

test("paramToSafeInputKey and readArg support sanitized and original names", () => {
  const nameMap = { page_size_: "page[size]" }

  assert.equal(paramToSafeInputKey("page[size]"), "page_size_")
  assert.equal(readArg({ page_size_: 25 }, "page[size]", nameMap), 25)
  assert.equal(readArg({ "page[size]": 10 }, "page[size]", nameMap), 10)
})

test("formatApiError renders response, network, and setup failures", () => {
  const responseError = {
    response: {
      status: 404,
      statusText: "Not Found",
      data: { error: "missing" },
    },
    message: "request failed",
  } as any
  const networkError = {
    request: {},
    code: "ECONNRESET",
    message: "socket closed",
  } as any
  const setupError = {
    message: "bad config",
  } as any

  assert.match(formatApiError(responseError), /Status 404/)
  assert.match(formatApiError(responseError), /missing/)
  assert.equal(formatApiError(networkError), "API Network Error: No response received from server. (Code: ECONNRESET)")
  assert.equal(formatApiError(setupError), "API request failed.API Request Setup Error: bad config")
})

test("extractJsonApiErrorDetail joins Polarion's real {errors:[{detail}]} shape", () => {
  assert.equal(
    extractJsonApiErrorDetail({ errors: [{ status: "404", title: "Not Found", detail: "Work item 'X-1' not found" }] }),
    "Work item 'X-1' not found",
  )
  assert.equal(
    extractJsonApiErrorDetail({ errors: [{ status: "400", title: "Bad Request" }] }),
    "Bad Request",
    "falls back to title when detail is absent",
  )
  assert.equal(extractJsonApiErrorDetail({ data: [] }), undefined, "non-error-shaped bodies return undefined")
  assert.equal(extractJsonApiErrorDetail(null), undefined)
  assert.equal(extractJsonApiErrorDetail("plain string"), undefined)
})

test("formatApiError prefers the JSON:API error detail over a raw JSON dump", () => {
  const responseError = {
    response: {
      status: 404,
      statusText: "Not Found",
      data: { errors: [{ status: "404", title: "Not Found", detail: "Work item 'X-1' not found" }] },
    },
    message: "request failed",
  } as any

  const message = formatApiError(responseError)
  assert.match(message, /Detail: Work item 'X-1' not found/)
  assert.doesNotMatch(message, /"errors":/, "should not fall back to the raw JSON dump when a JSON:API detail was found")
})

test("getZodSchemaFromJsonSchema returns a working schema for valid JSON schema", () => {
  const schema = getZodSchemaFromJsonSchema(
    {
      type: "object",
      properties: {
        count: { type: "number" },
      },
      required: ["count"],
    },
    "count-tool",
  )

  const parsed = schema.parse({ count: 3 }) as Record<string, unknown>
  assert.equal(parsed.count, 3)
  assert.throws(() => schema.parse({ count: "three" }))
})

test("getZodSchemaFromJsonSchema falls back to a passthrough object for invalid schema input", () => {
  const schema = getZodSchemaFromJsonSchema(null, "broken-tool")
  const parsed = schema.parse({ anything: "goes" }) as Record<string, string>

  assert.equal(parsed.anything, "goes")
})

test("getZodSchemaFromJsonSchema keeps unknown nested keys like a Work Item custom field (GH feedback: custom fields never reach Polarion)", () => {
  // Polarion represents a Work Item custom field as a flat extra key directly
  // on `attributes`, alongside the OOTB ones (see guards.ts's
  // STANDARD_WORK_ITEM_ATTRIBUTE_KEYS / checkWorkItemCustomFieldKeys) -- there
  // is no separate "customFields" wrapper in the real REST schema.
  const schema = getZodSchemaFromJsonSchema(
    {
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
                attributes: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      required: ["projectId", "workItemId", "requestBody"],
    },
    "patchWorkItem",
  )

  const parsed = schema.parse({
    projectId: "myproject",
    workItemId: "WI-1",
    requestBody: {
      data: {
        type: "workitems",
        attributes: {
          title: "Updated title",
          myCustomField: "some value",
        },
      },
    },
  }) as any

  assert.equal(parsed.requestBody.data.attributes.title, "Updated title")
  assert.equal(parsed.requestBody.data.attributes.myCustomField, "some value")
})

test("getZodSchemaFromJsonSchema still silently drops an unknown top-level (tool) argument, same as before the nested-passthrough fix", () => {
  const schema = getZodSchemaFromJsonSchema(
    {
      type: "object",
      properties: {
        projectId: { type: "string" },
      },
      required: ["projectId"],
    },
    "someTool",
  )

  const parsed = schema.parse({ projectId: "p1", typoedParam: "oops" }) as Record<string, unknown>
  assert.equal("typoedParam" in parsed, false, "top-level unknown keys are dropped, not forwarded as if validated -- unlike nested ones")
})

test("getZodSchemaFromJsonSchema keeps a custom field through the real generated patchWorkItem/postWorkItems/patchWorkItems/patchAllWorkItems schemas (data[] array included)", () => {
  for (const toolName of ["patchWorkItem", "postWorkItems", "patchWorkItems", "patchAllWorkItems"]) {
    const definition = toolDefinitionMap.get(toolName)
    assert.ok(definition, `tools.ts must still define ${toolName}`)
    const schema = getZodSchemaFromJsonSchema(definition!.inputSchema, toolName)

    // postWorkItems requires attributes.type (the Work Item type, e.g. "task") in addition
    // to data.type ("workitems", the JSON:API resource type) -- harmless on the other tools.
    const oneItem = { type: "workitems", attributes: { type: "task", title: "Doc update", myCustomField: "released" } }
    const args =
      toolName === "patchWorkItem"
        ? { projectId: "DEMO", workItemId: "DEMO-1", requestBody: { data: oneItem } }
        : { projectId: "DEMO", requestBody: { data: [oneItem] } }

    const parsed = schema.parse(args) as any
    const parsedAttributes = toolName === "patchWorkItem" ? parsed.requestBody.data.attributes : parsed.requestBody.data[0].attributes
    assert.equal(parsedAttributes.title, "Doc update", `${toolName}: OOTB field must still go through`)
    assert.equal(parsedAttributes.myCustomField, "released", `${toolName}: custom field must survive validation`)
  }
})

test("getZodSchemaFromJsonSchema keeps unknown keys on a nullable-object node (type: ['object','null']), e.g. executeJob's requestBody.params", () => {
  const definition = toolDefinitionMap.get("executeJob")
  assert.ok(definition, "tools.ts must still define executeJob")
  const schema = getZodSchemaFromJsonSchema(definition!.inputSchema, "executeJob")

  const parsed = schema.parse({
    requestBody: { jobId: "jobs.cleanup", params: { myJobParam: "x" } },
  }) as any

  assert.equal(parsed.requestBody.params.myJobParam, "x", "a custom job param must survive on a type:['object','null'] node")
})

test("extractJsonApiErrorDetail names the failing part of the request", () => {
  assert.equal(
    extractJsonApiErrorDetail({ errors: [
      { detail: "Unknown field 'foo'", source: { pointer: "/data/1/attributes/foo" } },
      { title: "Bad value", source: { parameter: "page[size]" } },
    ] }),
    "Unknown field 'foo' (at /data/1/attributes/foo); Bad value (at page[size])",
  )
})

test("formatApiError decodes an error body that arrived as bytes (file downloads)", () => {
  const body = Buffer.from(JSON.stringify({ errors: [{ status: "404", detail: "Attachment not found" }] }))
  const error = new AxiosError("fail", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 404, statusText: "Not Found", headers: {}, config: {} as any, data: body,
  })
  assert.match(formatApiError(error), /Detail: Attachment not found/)
})

test("formatApiError keeps up to 2000 characters of JSON:API detail", () => {
  const detail = "x".repeat(1500)
  const error = new AxiosError("fail", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400, statusText: "Bad Request", headers: {}, config: {} as any, data: { errors: [{ detail }] },
  })
  assert.ok(formatApiError(error).includes(detail))
})

test("formatApiError reports a download over the size cap as too large, not as a network error", () => {
  const error = new AxiosError("maxContentLength size of 20971521 exceeded", "ERR_BAD_RESPONSE", { url: "https://p/polarion/rest/v1/x/content" } as any, {})
  const message = formatApiError(error)
  assert.match(message, /too large/)
  assert.match(message, /x\/content/)
  assert.doesNotMatch(message, /Network Error/)
})

test("getZodSchemaFromJsonSchema lets null clear a field on a JSON:API update (verified against Polarion 2606: PATCH with null empties dueDate and description)", () => {
  const schema = getZodSchemaFromJsonSchema(
    {
      type: "object",
      properties: {
        page_size_: { type: "integer" },
        requestBody: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                type: { type: "string" },
                attributes: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    dueDate: { type: "string", format: "date" },
                    description: { type: "object", properties: { type: { type: "string" }, value: { type: "string" } } },
                    hyperlinks: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "patchWorkItem",
  )
  const body = (attributes: unknown) => ({ requestBody: { data: { type: "workitems", attributes } } })

  for (const attrs of [{ dueDate: null }, { description: null }, { hyperlinks: null }, { title: null }, { custom: null }]) {
    assert.doesNotThrow(() => schema.parse(body(attrs)), JSON.stringify(attrs))
  }
  // Wrong types stay rejected: null is the only addition.
  assert.throws(() => schema.parse(body({ dueDate: 5 })))
  assert.throws(() => schema.parse(body({ description: "text" })))
  // Only attributes are widened: a null path/query argument is still refused.
  assert.throws(() => schema.parse({ page_size_: null }))
  assert.throws(() => schema.parse({ requestBody: { data: { type: null } } }))
})

test("compiled constrained arrays reject oversized input before accumulating item errors", () => {
  const schema = compileZodSchema({ type: "array", maxItems: 8, items: { type: "string" } })
  const oversizedInput = Array.from({ length: 250_000 }, () => 0)

  assert.throws(() => schema.parse(oversizedInput))
})

test("logSafe turns line breaks and control characters into spaces so input cannot forge log lines", () => {
  assert.equal(logSafe("a\n[ERROR] forged\r\nb\u0000c"), "a [ERROR] forged b c")
  assert.equal(logSafe(42), "42")
})

test("bearerCredential reads the token and stays linear on long whitespace runs", () => {
  assert.equal(bearerCredential("Bearer \t abc "), "abc")
  assert.equal(bearerCredential("bearer abc"), "abc")
  assert.equal(bearerCredential("Basic abc"), undefined)
  assert.equal(bearerCredential("Bearer   "), undefined)
  const started = Date.now()
  assert.equal(bearerCredential(`bearer\t${"\t".repeat(200000)}`), undefined)
  assert.ok(Date.now() - started < 1000)
})
