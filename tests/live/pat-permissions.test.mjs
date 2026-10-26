import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { API_BASE_URL, PROJECT, call, startHttpServer } from "./helpers.mjs";

// Opt in with a PAT that has project GET permission but no global GET permission.
const projectPat = process.env.LIVE_PROJECT_PAT;
test("a project-only PAT can initialize and use its project without global GET permission", {
  skip: !projectPat && "Set LIVE_PROJECT_PAT to exercise project-only REST permissions",
}, async () => {
  const headers = { authorization: `Bearer ${projectPat}` };
  const probe = await fetch(`${API_BASE_URL}/metadata`, { headers, redirect: "manual" });
  assert.equal(probe.status, 200, "metadata must work without global GET permission (Polarion 2512+)");
  assert.match(probe.headers.get("content-type") ?? "", /application\/(?:json|vnd\.api\+json)/i);
  assert.equal((await probe.json()).data.type, "metadata");

  const server = await startHttpServer();
  const client = new Client({ name: "project-permissions", version: "1" }, { capabilities: {} });
  try {
    const transport = new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers } });
    await client.connect(transport);
    const project = await call(client, "getProject", { projectId: PROJECT });
    assert.equal(project.isError, false, project.thrown ?? project.text);
    const global = await call(client, "getProjects");
    assert.equal(global.isError, true);
    assert.match(global.text, /403/);
  } finally {
    await client.close();
    await server.stop();
  }
});
