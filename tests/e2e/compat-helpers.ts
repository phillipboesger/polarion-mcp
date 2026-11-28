/**
 * Shared fixtures for the MCP client compatibility matrix (`compat-matrix.test.ts`).
 *
 * Everything here talks to local servers only: a stub Polarion REST API that
 * records every request it receives, a stdio spawner for the built entry point,
 * and small client/HTTP helpers. No real Polarion, no network beyond 127.0.0.1.
 */

import { createServer, request as httpRequest, type IncomingMessage } from "node:http"
import type { AddressInfo } from "node:net"
import { once } from "node:events"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js"

export const PAT = "e2e-stub-pat"
export const PAT_B = "e2e-stub-pat-user-b"
export const SECRET = "e2e-sealing-secret-that-is-long-enough-123"
export const GUIDE_URI = "polarion://guide/query-syntax"

export interface RecordedRequest { method: string; path: string; body: string; authorization?: string }

export interface FakePolarion {
  base: string
  requests: RecordedRequest[]
  /** Number of recorded requests whose method and URL fragment both match. */
  calls: (method: string, pathFragment?: string) => number
  close: () => Promise<void>
}

/**
 * A stub of the Polarion REST API (JSON:API shaped) that records every request.
 *
 * Handlers are keyed by what the executor sends today: collections return one
 * `demo` project, `POST /jobs/actions/execute` returns an immediately finished
 * job, a Work Item read-back echoes the last Work Item write so write
 * verification sees its own values, DELETE gets Polarion's 204, and the job log
 * is plain text.
 */
export async function createFakePolarion(): Promise<FakePolarion> {
  const requests: RecordedRequest[] = []
  let lastWorkItemWrite: { attributes?: unknown } | undefined
  const json = (res: IncomingMessage extends never ? never : import("node:http").ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" })
    res.end(JSON.stringify(body))
  }
  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on("data", chunk => chunks.push(chunk))
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString()
      const path = (req.url ?? "").split("?")[0]!
      requests.push({ method: req.method ?? "", path, body, authorization: req.headers.authorization })
      if (req.headers.authorization !== `Bearer ${PAT}`) { res.writeHead(401).end(); return }
      if (req.method === "DELETE") { res.writeHead(204).end(); return }
      if (req.method === "PATCH" || req.method === "POST") {
        try { lastWorkItemWrite = JSON.parse(body) as { attributes?: unknown } } catch { lastWorkItemWrite = undefined }
      }
      if (path.endsWith("/log/content")) { res.writeHead(200, { "content-type": "text/plain" }); res.end("compat job log tail"); return }
      if (path.endsWith("/jobs/actions/execute")) {
        json(res, 200, { data: [{ type: "jobs", id: "compat-job", attributes: { state: "finished" }, status: { type: "OK" } }] })
        return
      }
      if (req.method === "GET" && /\/workitems\/[^/]+$/.test(path) && lastWorkItemWrite) {
        json(res, 200, { data: { type: "workitems", id: "WI-1", attributes: (lastWorkItemWrite as { attributes?: unknown }).attributes ?? {} } })
        return
      }
      json(res, 200, { data: [{ type: "projects", id: "demo", attributes: { name: "Demo" } }] })
    })
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/polarion/rest/v1`,
    requests,
    calls: (method, pathFragment = "") => requests.filter(request => request.method === method && request.path.includes(pathFragment)).length,
    close: () => new Promise(resolve => server.close(() => resolve())),
  }
}

/** Environment for the stdio entry point. Only listed names pass through so the parent's flags never leak in. */
export function stdioEnv(fakeBase: string, extra: Record<string, string> = {}): Record<string, string> {
  return { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", API_BASE_URL: fakeBase, BEARER_TOKEN: PAT, ...extra } as Record<string, string>
}

/** Spawns `build/index.js` over stdio and connects a v1 SDK client to it. */
export async function connectStdio(env: Record<string, string>, capabilities?: Record<string, unknown>): Promise<{ client: Client; close: () => Promise<void> }> {
  const transport = new StdioClientTransport({ command: process.execPath, args: ["build/index.js"], env })
  const client = new Client({ name: "compat-matrix", version: "0" }, { capabilities: capabilities as never })
  await client.connect(transport)
  return { client, close: () => client.close() }
}

/** Tracks elicitation/create requests the server sends, answering with the given action. */
export function trackElicitations(client: Client, elicitations: string[], action: "accept" | "decline" | "cancel"): void {
  client.setRequestHandler(ElicitRequestSchema, async request => {
    elicitations.push(String(request.params.message ?? ""))
    return { action, ...(action === "accept" ? { content: { confirm: true } } : {}) } as never
  })
}

/** One raw JSON-RPC POST to /mcp; parses either a JSON body or an SSE data frame. */
export async function rawRpc(base: string, token: string, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; contentType: string; sessionId?: string; json?: { result?: unknown; error?: { code: number; message: string } } }> {
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}`, ...headers },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  const contentType = response.headers.get("content-type") ?? ""
  const sessionId = response.headers.get("mcp-session-id") ?? undefined
  let json: { result?: unknown; error?: { code: number; message: string } } | undefined
  try {
    json = contentType.includes("text/event-stream")
      ? JSON.parse(text.split("\n").filter(line => line.startsWith("data:")).at(-1)!.slice(5).trim())
      : JSON.parse(text)
  } catch { json = undefined }
  return { status: response.status, contentType, sessionId, json }
}

/** Raw HTTP request with an explicit Host header (undici's fetch forbids setting Host). */
export function rawHttp(method: string, url: string, headers: Record<string, string>, body?: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const req = httpRequest({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, method, headers }, res => {
      const chunks: Buffer[] = []
      res.on("data", chunk => chunks.push(chunk))
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }))
    })
    req.on("error", reject)
    if (body !== undefined) req.write(body)
    req.end()
  })
}
