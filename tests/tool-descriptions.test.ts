import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { toolDefinitionMap } from "../src/tools.js"
import { COMPOSITE_TOOLS } from "../src/composite-tools.js"
import { enabledTools } from "../src/tool-filter.js"
import { executeApiTool } from "../src/executor.js"
import type { McpToolDefinition } from "../src/types.js"

// Generated OpenAPI summaries that don't tell an agent what the tool is for.
// scripts/lib/tool-guidance.mjs replaces them; a regeneration must not bring them back.
const GENERIC_LEADS = [
  /^See more in the/,
  /^Files are identified by order/,
  /^Returns fields for the specified resource\./,
  /^Returns (a list of|the specified) instances?\./,
  /^(Deletes|Creates) a list of instances\./,
  /^Returns a list of \w+( \w+)? Relationships\./,
  /^(Marks|Unmarks) the Project\./,
]

function schemaShape(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = schema.properties && typeof schema.properties === "object"
    ? Object.fromEntries(Object.entries(schema.properties as Record<string, Record<string, unknown>>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, property]) => [name, schemaShape(property)]))
    : {}
  return {
    ...(schema.type === undefined ? {} : { type: schema.type }),
    required: [...(Array.isArray(schema.required) ? schema.required : [])].sort(),
    properties,
    ...(schema.items && typeof schema.items === "object" ? { items: schemaShape(schema.items as Record<string, unknown>) } : {}),
  }
}

test("the full tool catalog keeps its baseline names and input schema shape", () => {
  const baseline = JSON.parse(readFileSync("tests/fixtures/tool-surface-baseline.json", "utf8")) as Record<string, unknown>
  const tools = [...toolDefinitionMap.values(), ...COMPOSITE_TOOLS]
  const current = Object.fromEntries(tools.map(tool => [tool.name, schemaShape(tool.inputSchema as Record<string, unknown>)]).sort(([a], [b]) => String(a).localeCompare(String(b))))
  assert.equal(tools.length, 293)
  assert.deepEqual(current, baseline)
})

test("every composite input property has an explanatory description", () => {
  const inspect = (name: string, schema: Record<string, unknown>, path = name): string[] => {
    const properties = schema.properties && typeof schema.properties === "object"
      ? schema.properties as Record<string, Record<string, unknown>>
      : {}
    return Object.entries(properties).flatMap(([key, property]) => [
      ...(typeof property.description === "string" && property.description.trim() ? [] : [`${path}.${key}`]),
      ...((property.items && typeof property.items === "object") ? inspect(name, property.items as Record<string, unknown>, `${path}.${key}[]`) : []),
      ...(property.properties && typeof property.properties === "object" ? inspect(name, property, `${path}.${key}`) : []),
    ])
  }
  const missing = COMPOSITE_TOOLS.flatMap(tool => inspect(tool.name, tool.inputSchema as Record<string, unknown>))
  assert.deepEqual(missing, [])
})

test("tool descriptions and serialized list stay within size budgets", () => {
  const tools = [...toolDefinitionMap.values(), ...COMPOSITE_TOOLS]
  for (const tool of tools) assert.ok(tool.description.length <= 1200, `${tool.name}: ${tool.description.length} characters`)
  const bytes = Buffer.byteLength(JSON.stringify(tools))
  assert.ok(bytes <= 1_200_000, `tools/list payload is ${bytes} bytes`)
})

test("no tool description leads with a generic generated summary", () => {
  const offenders = [...toolDefinitionMap.values()]
    .filter((tool) => GENERIC_LEADS.some((re) => re.test(tool.description)))
    .map((tool) => tool.name)
  assert.deepEqual(offenders, [])
})

test("no tool description contains raw HTML", () => {
  const offenders = [...toolDefinitionMap.values()].filter((tool) => /<a\s/.test(tool.description)).map((tool) => tool.name)
  assert.deepEqual(offenders, [])
})

test("curated leads keep the generated notes that follow them", () => {
  const patch = toolDefinitionMap.get("patchWorkItemAttachment")
  assert.ok(patch)
  assert.match(patch.description, /^Updates one existing Work Item attachment/)
  assert.match(patch.description, / Effect: idempotent/)
  assert.match(patch.description, / Tip: set `dry_run: true`/)

  const approvals = toolDefinitionMap.get("getWorkItemApprovals")
  assert.ok(approvals)
  assert.match(approvals.description, / Cardinality: targets the full collection/)
})

test("curated JSON argument examples use declared parameters", () => {
  const curated = [...toolDefinitionMap.values()].filter(tool => tool.description.includes("Examples:"))
  assert.equal(curated.length, 20, `expected examples for the top 20 tools, found ${curated.length}`)
  for (const tool of curated) {
    const section = tool.description.split("Examples:")[1]?.split(" Selection:")[0] ?? ""
    const exampleText = section.trim().replace(/\.$/, "")
    const examples = exampleText.split(" or ")
    assert.ok(examples.length > 0 && examples[0], `${tool.name} has an Examples marker without JSON arguments`)
    for (const json of examples) {
      const args = JSON.parse(json) as Record<string, unknown>
      for (const key of Object.keys(args)) assert.ok(key in (tool.inputSchema.properties ?? {}), `${tool.name} example uses undeclared parameter ${key}`)
    }
  }
})

test("confusable tool guidance cross-references both members of each pair", () => {
  const pairs = [
    ["getWorkItems", "getAllWorkItems"], ["getDocuments", "getAllDocuments"], ["getDocument", "getAllDocuments"],
    ["patchWorkItem", "patchWorkItems"], ["patchWorkItems", "patchAllWorkItems"],
    ["getComments", "getDocumentComments"], ["getGlobalEnumeration", "getProjectEnumeration"],
  ]
  for (const [leftName, rightName] of pairs) {
    const left = toolDefinitionMap.get(leftName)
    const right = toolDefinitionMap.get(rightName)
    assert.ok(left && right, `${leftName}/${rightName} must exist`)
    assert.ok(left.description.includes(rightName), `${leftName} must refer to ${rightName}`)
    assert.ok(right.description.includes(leftName), `${rightName} must refer to ${leftName}`)
  }
})

test("relationshipId is described as a relationship name on every relationship tool", () => {
  const relationshipTools = [...toolDefinitionMap.values()].filter((tool) => tool.pathTemplate.endsWith("/relationships/{relationshipId}"))
  assert.ok(relationshipTools.length > 0)
  for (const tool of relationshipTools) {
    const property = (tool.inputSchema.properties as Record<string, { description?: string }>).relationshipId
    assert.match(property.description ?? "", /relationship's name/, tool.name)
  }
})

test("effect wording never contradicts corrected tool annotations", () => {
  const conflicts = [...enabledTools.values()].flatMap(tool => {
    const text = tool.description.toLowerCase()
    const a = tool.annotations
    const bad: string[] = []
    if (a?.destructiveHint && !text.includes("irreversible")) bad.push("missing destructive warning")
    if (!a?.destructiveHint && text.includes("irreversible")) bad.push("claims destructive while annotation is false")
    if (a?.idempotentHint && (text.includes("not guaranteed idempotent") || text.includes("not idempotent"))) bad.push("claims non-idempotent")
    if (a?.idempotentHint === false && text.includes("effect: idempotent")) bad.push("claims idempotent")
    return bad.map(reason => `${tool.name}: ${reason}`)
  })
  assert.deepEqual(conflicts, [])
})

test("dry_run tip matches a real executor preview", async () => {
  const definition: McpToolDefinition = {
    name: "create_fixture", description: "Create fixture", method: "post", pathTemplate: "/things",
    executionParameters: [], requestBodyContentType: "application/json", securityRequirements: [],
    inputSchema: { type: "object", properties: { requestBody: { type: "object" } }, required: ["requestBody"] },
    outputSchema: { type: "object", properties: {} },
  }
  const result = await executeApiTool("create_fixture", definition, { requestBody: { title: "preview" }, dry_run: true }, {}, { httpClient: async () => { throw new Error("dry run must not send") }, minIntervalMs: 0 })
  assert.equal(result.isError, undefined)
  assert.equal((result.structuredContent as { dry_run: boolean }).dry_run, true)
  const tips = [...toolDefinitionMap.values()].filter(tool => tool.inputSchema.properties?.dry_run).map(tool => tool.description)
  assert.ok(tips.length > 0)
  for (const tip of tips) {
    assert.match(tip, /preview/i)
    assert.doesNotMatch(tip, /error-flagged|isError/i)
  }
})

test("targetType and attachment descriptions match the executor's request shapes", () => {
  const targetType = [...toolDefinitionMap.values()].find(tool => tool.inputSchema.properties?.targetType)?.inputSchema.properties?.targetType as { description?: string }
  assert.match(targetType.description ?? "", /requirement/)
  assert.doesNotMatch(targetType.description ?? "", /workitem/)
  const upload = toolDefinitionMap.get("postWorkItemAttachments")
  assert.ok(upload)
  assert.match(upload.description, /same array index/)
  assert.doesNotMatch(upload.description, /via each entry's `lid`|same order/)
  assert.doesNotMatch([...toolDefinitionMap.values()].map(tool => tool.description).join("\n"), /creates a duplicate/i)
})

test("the Custom GPT spec stays within GPT Action limits: at most 30 operations, descriptions of at most 300 characters", async () => {
  const express = (await import("express")).default
  const { createRestToolsRouter } = await import("../src/rest-api.js")
  const app = express()
  app.use(createRestToolsRouter({ authenticate: (_req, _res, next) => next(), serverUrl: () => "http://x", securityScheme: {}, unauthorizedDescription: "" }))
  const server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  try {
    const port = (server.address() as import("node:net").AddressInfo).port
    const spec = (await (await fetch(`http://127.0.0.1:${port}/openapi-gpt.json`)).json()) as { paths: Record<string, Record<string, { description: string; summary: string }>> }
    const operations = Object.values(spec.paths).flatMap((p) => Object.values(p))
    assert.ok(operations.length > 0 && operations.length <= 30, `${operations.length} operations`)
    for (const op of operations) assert.ok(op.description.length <= 300, `${op.description.length}: ${op.description.slice(0, 60)}`)
  } finally {
    server.close()
  }
})
