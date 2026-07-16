import test from "node:test"
import assert from "node:assert/strict"
import { extractJsonApiErrorDetail, formatApiError, getZodSchemaFromJsonSchema, paramToSafeInputKey, readArg, sanitizeInputSchema } from "../src/utils.js"

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
