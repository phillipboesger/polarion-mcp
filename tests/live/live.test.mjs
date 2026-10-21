// Runs the built server against a real Polarion. Everything here is something a
// stubbed test cannot settle: what Polarion actually answers (204 without body,
// `null` clearing a field, paging parameters) and how the MCP client treats it.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { PAT, PROJECT, call, connectStdio, json, startHttpServer } from "./helpers.mjs";

const created = [];

async function createItem(client, attributes) {
  const r = await call(client, "postWorkItems", {
    projectId: PROJECT,
    requestBody: { data: [{ type: "workitems", attributes: { type: "task", ...attributes } }] },
  });
  assert.equal(r.isError, false, r.thrown ?? r.text);
  const id = json(r.text).data[0].id.split("/")[1];
  created.push(id);
  return id;
}

const getAttributes = async (client, id, fields) => {
  const r = await call(client, "getWorkItem", { projectId: PROJECT, workItemId: id, fields: { workitems: fields } });
  assert.equal(r.isError, false, r.thrown ?? r.text);
  return json(r.text).data.attributes;
};

describe("stdio server against Polarion", () => {
  let client;

  before(async () => {
    client = await connectStdio();
  });

  after(async () => {
    for (const id of created) {
      await call(client, "deleteWorkItems", { projectId: PROJECT, requestBody: { data: [{ type: "workitems", id: `${PROJECT}/${id}` }] } });
    }
    await client.close();
  });

  test("lists the generated tools", async () => {
    const { tools } = await client.listTools();
    assert.ok(tools.length > 250, `only ${tools.length} tools`);
    assert.ok(tools.every((t) => t.inputSchema?.type === "object"));
  });

  test("read-only tools run without client-side rejections", async () => {
    const { tools } = await client.listTools();
    const itemId = await createItem(client, { title: "live sweep item" });
    const ctx = { projectId: PROJECT, workItemId: itemId, userId: "admin", roleId: "project_admin" };
    const docs = await call(client, "getDocuments", { projectId: PROJECT, page_size_: 1 });
    const doc = docs.isError ? undefined : json(docs.text).data?.[0];
    if (doc) [, ctx.spaceId, ctx.documentName] = doc.id.split("/");

    const thrown = [];
    let ok = 0;
    for (const tool of tools.filter((t) => t.annotations?.readOnlyHint)) {
      const required = tool.inputSchema.required ?? [];
      if (!required.every((name) => ctx[name] !== undefined)) continue;
      const args = Object.fromEntries(required.map((name) => [name, ctx[name]]));
      if ("page_size_" in (tool.inputSchema.properties ?? {})) args.page_size_ = 2;
      const r = await call(client, tool.name, args);
      if (r.thrown) thrown.push(`${tool.name}: ${r.thrown}`);
      else if (!r.isError) ok++;
    }
    assert.deepEqual(thrown, [], "the MCP client rejected results the server returned");
    assert.ok(ok >= 25, `only ${ok} read tools succeeded`);
  });

  test("page_size_ and page_number_ reach Polarion", async () => {
    for (const title of ["live page 1", "live page 2", "live page 3"]) await createItem(client, { title });
    const page = async (n) => {
      const r = await call(client, "getWorkItems", { projectId: PROJECT, page_size_: 2, page_number_: n, fields: { workitems: "title" } });
      assert.equal(r.isError, false, r.thrown ?? r.text);
      return json(r.text).data.map((d) => d.id);
    };
    const [first, second] = [await page(1), await page(2)];
    assert.equal(first.length, 2);
    assert.ok(second.length > 0);
    assert.equal(first.filter((id) => second.includes(id)).length, 0, "page 2 repeats page 1: paging parameters were dropped");
  });

  test("an unknown argument and a dot path segment are refused", async () => {
    const unknown = await call(client, "getWorkItem", { projectId: PROJECT, workItemId: "WI-1", fileds: { workitems: "title" } });
    assert.equal(unknown.isError, true);
    assert.match(unknown.text, /unknown argument/i);

    const dot = await call(client, "getProject", { projectId: ".." });
    assert.equal(dot.isError, true);
    assert.match(dot.text, /not a valid path segment/);
  });

  test("work item lifecycle: create, update (204), null clears a field, delete", async () => {
    const id = await createItem(client, {
      title: "live lifecycle",
      dueDate: "2026-12-01",
      description: { type: "text/html", value: "<p>to be cleared</p>" },
    });
    const patch = (attributes, extra = {}) =>
      call(client, "patchWorkItem", {
        projectId: PROJECT,
        workItemId: id,
        requestBody: { data: { type: "workitems", id: `${PROJECT}/${id}`, attributes } },
        ...extra,
      });

    let attrs = await getAttributes(client, id, "title,dueDate,description");
    assert.equal(attrs.dueDate, "2026-12-01");
    assert.ok(attrs.description);

    const renamed = await patch({ title: "live lifecycle renamed" });
    assert.equal(renamed.isError, false, renamed.thrown ?? renamed.text);
    assert.equal((await getAttributes(client, id, "title")).title, "live lifecycle renamed");

    const dry = await patch({ title: "must not be written" }, { dry_run: true });
    assert.equal(dry.isError, false, dry.thrown ?? dry.text);
    assert.equal((await getAttributes(client, id, "title")).title, "live lifecycle renamed");

    const cleared = await patch({ dueDate: null, description: null });
    assert.equal(cleared.isError, false, cleared.thrown ?? cleared.text);
    attrs = await getAttributes(client, id, "title,dueDate,description");
    assert.equal(attrs.dueDate, undefined, "dueDate was not cleared");
    assert.equal(attrs.description?.value ?? "", "", "description was not cleared");

    const wrongType = await patch({ dueDate: 5 });
    assert.equal(wrongType.isError, true, "a number for dueDate must still be refused");

    const removed = await call(client, "deleteWorkItems", { projectId: PROJECT, requestBody: { data: [{ type: "workitems", id: `${PROJECT}/${id}` }] } });
    assert.equal(removed.isError, false, removed.thrown ?? removed.text);
    const gone = await call(client, "getWorkItem", { projectId: PROJECT, workItemId: id });
    assert.equal(gone.isError, true);
  });

  test("updating a work item that does not exist is an error", async () => {
    const r = await call(client, "patchWorkItem", {
      projectId: PROJECT,
      workItemId: "WI-99999999",
      requestBody: { data: { type: "workitems", id: `${PROJECT}/WI-99999999`, attributes: { title: "x" } } },
    });
    assert.equal(r.isError, true);
    assert.equal(r.thrown, undefined);
  });

  test("a server without BEARER_TOKEN refuses the call and names what to set", async () => {
    const bare = await connectStdio({ BEARER_TOKEN: "" });
    try {
      const r = await call(bare, "getProjects", {});
      assert.equal(r.isError, true);
      assert.match(r.text, /BEARER_TOKEN/);
    } finally {
      await bare.close();
    }
  });
});

describe("Streamable HTTP server with OAuth against Polarion", () => {
  let server;

  before(async () => {
    server = await startHttpServer();
  });

  after(() => server?.stop());

  const initialize = (bearer) =>
    fetch(`${server.base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "live", version: "1" } } }),
    });

  test("only a token Polarion accepts opens a session", async () => {
    assert.equal((await initialize()).status, 401);
    assert.equal((await initialize("x".repeat(40))).status, 401);
    assert.equal((await initialize("eyJhbGciOi.eyJzdWIiOiJ4In0.sig")).status, 401);
    assert.equal((await initialize(PAT)).status, 200);
  });

  test("an SDK client lists tools and calls Polarion through it", async () => {
    const transport = new StreamableHTTPClientTransport(new URL(`${server.base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${PAT}` } } });
    const client = new Client({ name: "live-http", version: "1" }, { capabilities: {} });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      assert.ok(tools.length > 250);
      const r = await client.callTool({ name: "getProjects", arguments: { page_size_: 2 } });
      assert.notEqual(r.isError, true);
    } finally {
      await client.close();
    }
  });

  test("an unknown session id answers 404 so clients re-initialize", async () => {
    const res = await fetch(`${server.base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${PAT}`, "mcp-session-id": "00000000-0000-4000-8000-000000000000" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    });
    assert.equal(res.status, 404);
  });

  test("OAuth login: Polarion PAT in, working access token out, replay and bad PKCE refused", async () => {
    const redirect = "http://localhost:9999/cb";
    const form = (body) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), redirect: "manual" });
    const reg = await fetch(`${server.base}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "live", redirect_uris: [redirect], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }),
    }).then((r) => r.json());
    assert.ok(reg.client_id);

    const verifier = randomBytes(32).toString("base64url");
    const authorizeQuery = () =>
      new URLSearchParams({
        response_type: "code",
        client_id: reg.client_id,
        redirect_uri: redirect,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
        state: "st",
        scope: "",
      });
    const login = async (token) => {
      const page = await (await fetch(`${server.base}/authorize?${authorizeQuery()}`, { redirect: "manual" })).text();
      const loginId = /name="login_id" value="([^"]+)"/.exec(page)?.[1];
      assert.ok(loginId, "the authorize page has no login form");
      return fetch(`${server.base}/polarion-login`, form({ login_id: loginId, token }));
    };
    const exchange = (params) => fetch(`${server.base}/token`, form(params));

    const rejected = await login("not-a-real-pat");
    assert.notEqual(rejected.status, 302, "a wrong PAT must not produce an authorization code");

    const accepted = await login(PAT);
    assert.equal(accepted.status, 302);
    const code = new URL(accepted.headers.get("location")).searchParams.get("code");
    const first = await exchange({ grant_type: "authorization_code", code, redirect_uri: redirect, client_id: reg.client_id, code_verifier: verifier });
    assert.equal(first.status, 200);
    const tokens = await first.json();
    assert.equal((await initialize(tokens.access_token)).status, 200);
    assert.equal((await exchange({ grant_type: "authorization_code", code, redirect_uri: redirect, client_id: reg.client_id, code_verifier: verifier })).status, 400, "an authorization code must work once");
    assert.equal((await exchange({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: reg.client_id })).status, 200);

    const burned = (await login(PAT)).headers.get("location");
    const burnedCode = new URL(burned).searchParams.get("code");
    const wrong = await exchange({ grant_type: "authorization_code", code: burnedCode, redirect_uri: redirect, client_id: reg.client_id, code_verifier: "wrong".repeat(12) });
    assert.equal(wrong.status, 400);
    const retry = await exchange({ grant_type: "authorization_code", code: burnedCode, redirect_uri: redirect, client_id: reg.client_id, code_verifier: verifier });
    assert.equal(retry.status, 400, "a code stays usable after a wrong PKCE verifier");
  });
});
