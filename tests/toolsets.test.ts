import test from "node:test"
import assert from "node:assert/strict"

import { toolDefinitionMap } from "../src/tools.js"
import { TOOLSET_NAMES, toolsetsForDefinition } from "../src/toolsets.js"

test("every generated tool belongs to exactly one domain toolset", () => {
  const assignments = new Map<string, string[]>()
  for (const def of toolDefinitionMap.values()) {
    const sets = toolsetsForDefinition(def)
    assert.equal(sets.length, 1, `${def.name} should be assigned exactly once`)
    assert.ok(TOOLSET_NAMES.includes(sets[0] as typeof TOOLSET_NAMES[number]), `${def.name} has unknown toolset ${sets[0]}`)
    assignments.set(def.name, sets)
  }
  assert.equal(assignments.size, 284)
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

test("stdio server default exposes all deployment-enabled tools when MCP_TOOLSETS is unset", async () => {
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
    env: { ...process.env, MCP_TOOLSETS: "", MCP_TOOLS: "", MCP_READ_ONLY: "", MCP_OMIT_OUTPUT_SCHEMA: "" },
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(Number(result.stdout.trim()), 293)
})
