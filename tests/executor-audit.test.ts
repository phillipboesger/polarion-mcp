import test from "node:test"
import assert from "node:assert/strict"
import type { AxiosRequestConfig, AxiosResponse } from "axios"

import { executeApiTool } from "../src/executor.js"
import { toolDefinitionMap, securitySchemes } from "../src/tools.js"

const FAST = { minIntervalMs: 0, initialBackoffMs: 1, postMutationDelayMs: 0 }

/** Runs a real generated tool against a fake Polarion, returning the result and every request sent. */
async function run(toolName: string, args: Record<string, unknown>, respond?: (c: AxiosRequestConfig) => Partial<AxiosResponse>) {
  const requests: AxiosRequestConfig[] = []
  const httpClient = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    requests.push(config)
    const res = respond?.(config) ?? {}
    return { status: 200, statusText: "OK", headers: { "content-type": "application/json" }, data: { data: [] }, config: config as any, ...res } as AxiosResponse
  }
  const result = await executeApiTool(toolName, toolDefinitionMap.get(toolName)!, args, securitySchemes, { httpClient, ...FAST })
  return { result, requests }
}

test("pagination: the advertised page_size_/page_number_ names reach Polarion as page[size]/page[number]", async () => {
  const { requests } = await run("getWorkItems", { projectId: "P", page_size_: 5, page_number_: 2 })
  assert.equal(requests[0].params["page[size]"], 5)
  assert.equal(requests[0].params["page[number]"], 2)
})

test("pagination: the raw bracket names keep working (descriptions mention them)", async () => {
  const { requests } = await run("getWorkItems", { projectId: "P", "page[size]": 3 })
  assert.equal(requests[0].params["page[size]"], 3)
})

test("pagination: a wrong type for page_size_ is rejected, not silently ignored", async () => {
  const { result, requests } = await run("getWorkItems", { projectId: "P", page_size_: "abc" })
  assert.equal(result.isError, true)
  assert.equal(requests.length, 0)
})

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x80])
const octet = (data: Buffer, extra: Record<string, string> = {}) => () => ({ headers: { "content-type": "application/octet-stream", ...extra }, data })

test("binary download: requested as raw bytes with Accept */* (Polarion answers application/json with 406)", async () => {
  const { requests } = await run("getWorkItemAttachmentContent", { projectId: "P", workItemId: "W-1", attachmentId: "1-a.png" }, octet(PNG))
  assert.equal(requests[0].headers?.["Accept"] ?? requests[0].headers?.["accept"], "*/*")
  assert.equal(requests[0].responseType, "arraybuffer")
})

test("binary download: an image comes back as MCP image content with intact bytes", async () => {
  const { result } = await run("getWorkItemAttachmentContent", { projectId: "P", workItemId: "W-1", attachmentId: "1-a.png" }, octet(PNG))
  const image = result.content.find((c: any) => c.type === "image") as any
  assert.ok(image, JSON.stringify(result.content))
  assert.equal(image.mimeType, "image/png")
  assert.deepEqual(Buffer.from(image.data, "base64"), PNG)
  assert.notEqual(result.isError, true)
})

test("binary download: a UTF-8 text file comes back as text", async () => {
  const text = "Grüße\nline 2"
  const { result } = await run("getWorkItemAttachmentContent", { projectId: "P", workItemId: "W-1", attachmentId: "2-notes.txt" }, octet(Buffer.from(text, "utf8")))
  assert.ok(result.content.some((c: any) => c.type === "text" && c.text.includes(text)), JSON.stringify(result.content))
})

test("binary download: any other binary comes back as an embedded resource blob", async () => {
  const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x80, 0x01])
  const { result } = await run("getJobResultFileContent", { jobId: "j1", filename: "export.xlsx" }, octet(bytes))
  const resource = result.content.find((c: any) => c.type === "resource") as any
  assert.ok(resource, JSON.stringify(result.content))
  assert.equal(resource.resource.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  assert.deepEqual(Buffer.from(resource.resource.blob, "base64"), bytes)
})

test("binary download: the mime type from Polarion wins over the file name when it is specific", async () => {
  const { result } = await run("getAvatar", { userId: "admin" }, octet(PNG, { "content-type": "image/png" }))
  assert.equal((result.content.find((c: any) => c.type === "image") as any)?.mimeType, "image/png")
})

test("binary download: a file over the size cap is refused with a clear error", async () => {
  const { result } = await run("getWorkItemAttachmentContent", { projectId: "P", workItemId: "W-1", attachmentId: "big.bin" }, octet(Buffer.alloc(21 * 1024 * 1024)))
  assert.equal(result.isError, true)
  assert.match((result.content[0] as any).text, /too large/i)
})

/** A fake Polarion where only user "alice" exists and status has the options draft/open. */
function polarion(c: AxiosRequestConfig): Partial<AxiosResponse> {
  const url = String(c.url)
  if (/\/users\/alice$/.test(url)) return { data: { data: { type: "users", id: "alice" } } }
  if (/\/users\//.test(url)) throw Object.assign(new Error("404"), { isAxiosError: true, response: { status: 404, statusText: "Not Found", headers: {}, data: {} } })
  if (/availableoptions|getAvailableOptions|actions\/getAvailable/i.test(url)) return { data: { data: [{ id: "draft" }, { id: "open" }] } }
  return { status: 204, headers: {}, data: "" }
}

test("guards: a relationships-only patch still has its assignee checked", async () => {
  const { result, requests } = await run("patchWorkItem", {
    projectId: "P", workItemId: "W-1",
    requestBody: { data: { type: "workitems", id: "P/W-1", relationships: { assignee: { data: [{ type: "users", id: "ghostuser" }] } } } },
  }, polarion)
  assert.equal(result.isError, true, JSON.stringify(result.content))
  assert.match((result.content[0] as any).text, /ghostuser/)
  assert.ok(!requests.some((r) => String(r.method).toUpperCase() === "PATCH"), "the write must not be sent")
})

test("guards: dry_run runs the guards too, so a preview never shows a write the real call refuses", async () => {
  const { result, requests } = await run("patchWorkItem", {
    projectId: "P", workItemId: "W-1", dry_run: true,
    requestBody: { data: { type: "workitems", id: "P/W-1", relationships: { assignee: { data: [{ type: "users", id: "ghostuser" }] } } } },
  }, polarion)
  assert.match((result.content[0] as any).text, /Write refused/)
  assert.ok(!requests.some((r) => String(r.method).toUpperCase() === "PATCH"))
})

test("guards: dry_run of a valid write still returns the preview without writing", async () => {
  const { result, requests } = await run("patchWorkItem", {
    projectId: "P", workItemId: "W-1", dry_run: true,
    requestBody: { data: { type: "workitems", id: "P/W-1", relationships: { assignee: { data: [{ type: "users", id: "alice" }] } } } },
  }, polarion)
  assert.match((result.content[0] as any).text, /Dry run/)
  assert.ok(!requests.some((r) => String(r.method).toUpperCase() === "PATCH"))
})

test("an empty path parameter is refused instead of silently hitting the list or bulk endpoint", async () => {
  for (const [tool, args] of [
    ["getWorkItem", { projectId: "P", workItemId: "" }],
    ["deleteWorkItemAttachment", { projectId: "P", workItemId: "W-1", attachmentId: " " }],
  ] as const) {
    const { result, requests } = await run(tool, args)
    assert.equal(result.isError, true, tool)
    assert.match((result.content[0] as any).text, /must not be empty/, tool)
    assert.equal(requests.length, 0, tool)
  }
})

test("uploads: text that is not base64 is refused instead of uploaded as garbage bytes", async () => {
  for (const bad of ["hello world, plain text!", "", "%%%"]) {
    const requestBody = JSON.stringify({ resource: { data: [{ type: "workitem_attachments", attributes: { fileName: "a.txt" } }] }, files: [bad] })
    const { result, requests } = await run("postWorkItemAttachments", { projectId: "P", workItemId: "W-1", requestBody })
    assert.equal(result.isError, true, JSON.stringify(bad))
    assert.match((result.content[0] as any).text, /base64/)
    assert.equal(requests.length, 0)
  }
})

test("uploads: standard and URL-safe base64 both arrive as the original bytes", async () => {
  const bytes = Buffer.from([0xfb, 0xff, 0xbf, 0x00, 0x41])
  for (const encoded of [bytes.toString("base64"), bytes.toString("base64url")]) {
    const requestBody = JSON.stringify({ resource: { data: [{ type: "workitem_attachments", attributes: { fileName: "a.bin" } }] }, files: [encoded] })
    const { requests } = await run("postWorkItemAttachments", { projectId: "P", workItemId: "W-1", requestBody }, () => ({ status: 201 }))
    assert.ok((requests[0].data as Buffer).includes(bytes), encoded)
  }
})

test("a JSON:API response labelled application/vnd.api+json is read as JSON", async () => {
  const { result } = await run("getWorkItem", { projectId: "P", workItemId: "W-1" }, () => ({
    headers: { "content-type": "application/vnd.api+json" }, data: { data: { type: "workitems", id: "P/W-1" } },
  }))
  assert.notEqual(result.isError, true)
  assert.equal((result.structuredContent as any)?.data?.id, "P/W-1")
})

test("regeneration guard: output schemas and curated descriptions are still in place", () => {
  const withOutput = [...toolDefinitionMap.values()].filter((d) => d.outputSchema).length
  assert.ok(withOutput >= 170, `only ${withOutput} tools have an outputSchema; did enrich-output-schemas run without openapi.json?`)
})

test("every generated tool gets a real validation schema (none falls back to accept-anything)", async () => {
  const { compileZodSchema } = await import("../src/utils.js")
  for (const def of toolDefinitionMap.values()) {
    assert.doesNotThrow(() => compileZodSchema(def.inputSchema), def.name)
  }
})

test("relationship tools validate their body: missing or junk bodies are refused", async () => {
  for (const args of [
    { projectId: "P", workItemId: "W-1", relationshipId: "assignee" },
    { projectId: "P", workItemId: "W-1", relationshipId: "assignee", requestBody: { foo: 1 } },
    { projectId: "P", workItemId: "W-1", relationshipId: "assignee", requestBody: "hello" },
  ]) {
    const { result, requests } = await run("postWorkItemRelationships", args)
    assert.equal(result.isError, true, JSON.stringify(args))
    assert.equal(requests.length, 0, JSON.stringify(args))
  }
  const { result, requests } = await run("postWorkItemRelationships", {
    projectId: "P", workItemId: "W-1", relationshipId: "assignee", requestBody: { data: [{ type: "users", id: "alice" }] },
  }, () => ({ status: 204, headers: {}, data: "" }))
  assert.notEqual(result.isError, true, JSON.stringify(result.content))
  assert.equal(requests.length, 1)
})

const DELETE_ARGS = { projectId: "P", requestBody: { data: [{ type: "workitems", id: "P/X" }] } }

test("dry_run: the string \"true\" previews instead of deleting", async () => {
  const { result, requests } = await run("deleteWorkItems", { ...DELETE_ARGS, dry_run: "true" })
  assert.match((result.content[0] as any).text, /Dry run/)
  assert.ok(!requests.some((r) => String(r.method).toUpperCase() === "DELETE"))
})

test("dry_run: an unrecognisable value is refused, never treated as a real write", async () => {
  const { result, requests } = await run("deleteWorkItems", { ...DELETE_ARGS, dry_run: "maybe" })
  assert.equal(result.isError, true)
  assert.match((result.content[0] as any).text, /dry_run/)
  assert.equal(requests.length, 0)
})

test("dry_run: the preview URL shows the query, e.g. the workflow action", async () => {
  const { result } = await run("patchWorkItem", {
    projectId: "P", workItemId: "W-1", workflowAction: "start", dry_run: true,
    requestBody: { data: { type: "workitems", id: "P/W-1", attributes: {} } },
  })
  assert.match((result.content[0] as any).text, /workflowAction=start/)
})

test("uploads: files as a single string and content as a one-element array are sent as real file parts", async () => {
  const b64 = Buffer.from("hello").toString("base64")
  const files = JSON.stringify({ resource: { data: [{ type: "workitem_attachments", attributes: { fileName: "notes.txt" } }] }, files: b64 })
  const a = await run("postWorkItemAttachments", { projectId: "P", workItemId: "W-1", requestBody: files }, () => ({ status: 201 }))
  const rawA = (a.requests[0].data as Buffer).toString("latin1")
  assert.match(rawA, /name="files"; filename="notes\.txt"/, "the part is named after the attachment's fileName")
  assert.ok(rawA.includes("hello") && !rawA.includes(b64))
  const content = JSON.stringify({ content: [b64] })
  const b = await run("patchWorkItemAttachment", { projectId: "P", workItemId: "W-1", attachmentId: "1-a.txt", requestBody: content }, () => ({ status: 204, headers: {}, data: "" }))
  const rawB = (b.requests[0].data as Buffer).toString("latin1")
  assert.ok(rawB.includes("hello") && !rawB.includes(b64))
})

test("uploads: a multipart tool called without a body is refused instead of sending an empty form-urlencoded request", async () => {
  const { result, requests } = await run("patchWorkItemAttachment", { projectId: "P", workItemId: "W-1", attachmentId: "1-a.txt" })
  assert.equal(result.isError, true)
  assert.equal(requests.length, 0)
})

test("a write answered with an HTML page (login or proxy) is an error, not a success", async () => {
  const { result } = await run("patchWorkItem", {
    projectId: "P", workItemId: "W-1", requestBody: { data: { type: "workitems", id: "P/W-1", attributes: { title: "x" } } },
  }, () => ({ status: 200, headers: { "content-type": "text/html" }, data: "<html>login</html>" }))
  assert.equal(result.isError, true)
  assert.match((result.content[0] as any).text, /HTML/)
})

test("a JSON body without a JSON content type is still read as JSON, not [object Object]", async () => {
  const { result } = await run("getWorkItem", { projectId: "P", workItemId: "W-1" }, () => ({ headers: {}, data: { data: { id: "P/W-1" } } }))
  assert.doesNotMatch((result.content[0] as any).text, /object Object/)
  assert.equal((result.structuredContent as any)?.data?.id, "P/W-1")
})
