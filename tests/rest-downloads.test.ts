import test from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import express from "express"

// Own process: point API_BASE_URL at a stub Polarion before the executor reads it.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff])
const polarion = createServer((req, res) => {
  if (req.url?.includes("/attachments/1-a.png/content")) {
    res.writeHead(200, { "content-type": "application/octet-stream" })
    res.end(PNG)
    return
  }
  res.writeHead(404, { "content-type": "application/json" })
  res.end(JSON.stringify({ errors: [{ status: "404", detail: "Work item not found" }] }))
})
polarion.listen(0, "127.0.0.1")
await new Promise<void>((resolve) => polarion.once("listening", () => resolve()))
process.env.API_BASE_URL = `http://127.0.0.1:${(polarion.address() as AddressInfo).port}/polarion/rest/v1`
process.env.BEARER_TOKEN = "stub"
const { createRestToolsRouter } = await import("../src/rest-api.js")

test.after(() => polarion.close())

async function call(tool: string, args: Record<string, unknown>) {
  const app = express()
  app.use(createRestToolsRouter({ authenticate: (_req, _res, next) => next(), serverUrl: () => "http://x", securityScheme: {}, unauthorizedDescription: "" }))
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  try {
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/tools/${tool}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ arguments: args }),
    })
    return (await res.json()) as { success: boolean; result: string; files?: { mimeType: string; base64: string }[] }
  } finally {
    server.close()
  }
}

test("REST wrapper: a downloaded file comes back as base64 with its mime type", async () => {
  const body = await call("getWorkItemAttachmentContent", { projectId: "P", workItemId: "W-1", attachmentId: "1-a.png" })
  assert.equal(body.success, true)
  assert.equal(body.files?.[0].mimeType, "image/png")
  assert.deepEqual(Buffer.from(body.files![0].base64, "base64"), PNG)
})

test("REST wrapper: a tool error is reported as success: false", async () => {
  const body = await call("getWorkItem", { projectId: "P", workItemId: "missing" })
  assert.equal(body.success, false)
  assert.match(body.result, /Work item not found/)
})
