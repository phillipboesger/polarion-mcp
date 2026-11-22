import test from "node:test"
import assert from "node:assert/strict"

import { toolDefinitionMap } from "../src/tools.js"
import { toolsetsForDefinition } from "../src/toolsets.js"

// These tests exercise the full tool catalogue; the unset default resolves to Code Mode for catalogues this large.
process.env.MCP_MODE = 'full'

const DOMAINS = ["work-items", "documents", "test-management", "plans", "collections", "projects", "users", "admin", "jobs", "pages", "enumerations"]

test("every generated tool belongs to exactly one domain label", () => {
  const assignments = new Map<string, string[]>()
  for (const def of toolDefinitionMap.values()) {
    const sets = toolsetsForDefinition(def)
    assert.equal(sets.length, 1, `${def.name} should be assigned exactly once`)
    assert.ok(DOMAINS.includes(sets[0]), `${def.name} has unknown domain ${sets[0]}`)
    assignments.set(def.name, sets)
  }
  assert.equal(assignments.size, 304)
  assert.equal(new Set([...assignments.keys()]).size, toolDefinitionMap.size)
})

test("toolsets are derived from the generated path domain", () => {
  const expected = new Map([
    ["getWorkItems", "work-items"],
    ["getDocuments", "documents"],
    ["getTestRuns", "test-management"],
    ["getPlans", "plans"],
    ["getCollections", "collections"],
    ["getProjects", "projects"],
    ["getUsers", "users"],
    ["getLicense", "admin"],
    ["getJobs", "jobs"],
    ["getPages", "pages"],
    ["getGlobalEnumerations", "enumerations"],
  ])
  for (const [name, toolset] of expected) {
    const def = toolDefinitionMap.get(name)
    assert.ok(def, `missing generated tool ${name}`)
    assert.deepEqual(toolsetsForDefinition(def), [toolset])
  }
})

test("stdio server default exposes all deployment-enabled tools in full mode", async () => {
  const { spawnSync } = await import("node:child_process")
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { createPolarionServer } from './build-tests/src/server.js';
    import { Client } from '@modelcontextprotocol/sdk/client/index.js';
    import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createPolarionServer();
    const client = new Client({ name: 'test', version: '1' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    console.log((await client.listTools()).tools.length);
    await client.close(); await server.close();
  `], {
    cwd: process.cwd(),
    env: { ...process.env, MCP_MODE: "full", MCP_READ_ONLY: "" },
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(Number(result.stdout.trim()), 315)
})
