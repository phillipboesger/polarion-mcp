// Shared helpers for the live suite. It talks to a real Polarion, so it is not
// part of `npm test`: run it with `npm run test:live` (see docs/live-tests.md).
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// LIVE_BUILD_DIR points the suite at another build, e.g. an older release to prove the tests can fail.
const root = process.env.LIVE_BUILD_DIR
  ? path.resolve(process.env.LIVE_BUILD_DIR)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const API_BASE_URL = process.env.LIVE_API_BASE_URL;
export const PAT = process.env.LIVE_PAT;
export const PROJECT = process.env.LIVE_PROJECT || "elibrary";

if (!API_BASE_URL || !PAT) {
  throw new Error("Set LIVE_API_BASE_URL (e.g. http://localhost/polarion/rest/v1) and LIVE_PAT (a Polarion personal access token)");
}

/** Starts the stdio server against the live Polarion and returns a connected MCP client. */
export async function connectStdio(env = {}) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, "build", "index.js")],
    env: { PATH: process.env.PATH ?? "", API_BASE_URL, BEARER_TOKEN: PAT, ...env },
    stderr: "pipe",
  });
  const client = new Client({ name: "live-suite", version: "1" }, { capabilities: {} });
  await client.connect(transport);
  return client;
}

/**
 * Calls a tool and normalises the outcome. A rejection (`thrown`) means the MCP
 * client itself refused the result, for example an outputSchema violation, which
 * is the failure class mocks cannot show.
 */
export async function call(client, name, args = {}) {
  try {
    const r = await client.callTool({ name, arguments: args });
    return { isError: !!r.isError, text: r.content?.[0]?.text ?? "", structured: r.structuredContent };
  } catch (e) {
    return { thrown: String(e?.message ?? e).slice(0, 600), isError: true, text: "" };
  }
}

/** Tool results carry a status prefix ("API Response (Status: 200):") before the JSON body. */
export function json(text) {
  return JSON.parse(text.slice(text.indexOf("{")));
}

export async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** Starts the Streamable HTTP server with OAuth enabled and waits until it answers. */
export async function startHttpServer() {
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const child = spawn(process.execPath, [path.join(root, "build", "mcp-http-server.js")], {
    env: {
      PATH: process.env.PATH ?? "",
      API_BASE_URL,
      MCP_HTTP_PORT: String(port),
      MCP_PUBLIC_URL: base,
      MCP_TOKEN_SECRET: randomBytes(32).toString("hex"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) throw new Error(`mcp-http-server exited early:\n${log}`);
    try {
      await fetch(`${base}/.well-known/oauth-authorization-server`);
      return { base, stop: () => child.kill(), log: () => log };
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  child.kill();
  throw new Error(`mcp-http-server did not come up:\n${log}`);
}
