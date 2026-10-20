import test from "node:test"
import assert from "node:assert/strict"
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv"

import { lenientOutputSchema } from "../src/output-schema.js"
import { toolDefinitionMap } from "../src/tools.js"
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js"
import { createPolarionServer } from "../src/server.js"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"

// The validator the SDK client uses on structuredContent.
const validate = (schema: unknown, value: unknown) => new AjvJsonSchemaValidator().getValidator(schema as any)(value)

test("lenient output schema: null, wrong kinds and unlisted enum values no longer fail a successful call", () => {
  const strict = toolDefinitionMap.get("getWorkItem")!.outputSchema
  const lenient = lenientOutputSchema(strict)
  const body = {
    data: {
      type: "something-else",
      attributes: { resolution: null, priority: 90, dueDate: "2026-10-20T10:00:00Z", description: null, customField: { any: "thing" } },
      relationships: { assignee: { data: null } },
    },
    links: { next: null },
  }
  assert.equal(validate(strict, body).valid, false, "the generated schema rejects this body (this is why it is loosened)")
  assert.equal(validate(lenient, body).valid, true)
})

test("lenient output schema: an empty object and a typical Polarion body validate", () => {
  const lenient = lenientOutputSchema(toolDefinitionMap.get("getWorkItems")!.outputSchema)
  assert.equal(validate(lenient, {}).valid, true)
  assert.equal(validate(lenient, { data: [{ type: "workitems", id: "P/W-1", attributes: { title: "t" } }], meta: { totalCount: 1 } }).valid, true)
})

test("lenient output schema: structure is kept, only values are loosened", () => {
  const lenient = lenientOutputSchema({ type: "object", required: ["a"], additionalProperties: false, properties: { a: { type: "string", enum: ["x"], example: "x" }, list: { type: "array", items: { type: "object", properties: { n: { type: "integer" } } } } } }) as any
  assert.deepEqual(Object.keys(lenient.properties), ["a", "list"])
  assert.equal(lenient.type, "object")
  assert.deepEqual(lenient.properties.list.type, ["array", "null"])
  assert.equal("required" in lenient, false)
  assert.equal("additionalProperties" in lenient, false)
  assert.equal("enum" in lenient.properties.a, false)
  assert.ok(lenient.properties.list.items.properties.n.type.includes("null"))
})

test("every generated output schema still compiles after loosening", () => {
  let count = 0
  for (const def of toolDefinitionMap.values()) {
    if (!def.outputSchema) continue
    validate(lenientOutputSchema(def.outputSchema), {})
    count++
  }
  assert.ok(count >= 170)
})

test("tools/list with the loosened schemas still parses as an MCP ListToolsResult (root type must stay \"object\")", async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  const server = createPolarionServer()
  await server.connect(serverSide)
  const client = new Client({ name: "t", version: "1" })
  await client.connect(clientSide)
  try {
    const listed = await client.listTools()
    assert.ok(listed.tools.length > 200)
    assert.equal(ListToolsResultSchema.safeParse(listed).success, true)
    assert.ok(listed.tools.filter(t => t.outputSchema).every(t => (t.outputSchema as any).type === "object"))
  } finally {
    await client.close()
    await server.close()
  }
})
