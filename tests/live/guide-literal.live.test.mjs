// T8.3 / T8.4: the documented local setups against a real Polarion.
// Reuses the stub-mode parsing in tests/lib/guide-literal.mjs, so docs and tests cannot drift.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { API_BASE_URL, PAT } from "./helpers.mjs";
import { manifest, parseLocal, run } from "../lib/guide-literal.mjs";

const build = path.resolve("build/index.js");

// getCurrentUser reads GET /user, which Polarion 2506 does not have.
const userProbe = await fetch(`${API_BASE_URL}/user`, { headers: { authorization: `Bearer ${PAT}` }, redirect: "manual" });
await userProbe.text();

test("every documented local snippet starts the server and returns the live user", {
  skip: userProbe.status === 404 && "this Polarion release has no GET /user (2506)",
}, async t => {
  for (const client of manifest.clients.filter(entry => !entry.local.reason)) {
    await t.test(client.id, async () => {
      const { result, text } = await run(parseLocal(client), API_BASE_URL, PAT, build);
      assert.notEqual(result.isError, true, text);
      assert.ok(text.length > 0);
    });
  }
});

/** Runs the documented `<tool> mcp add ...` line in a temp HOME, with the build instead of npx. */
function documentedAdd(clientId, home) {
  const snippet = manifest.clients.find(entry => entry.id === clientId).local.snippet;
  const line = snippet.split("\n").find(candidate => /\bmcp add\b/.test(candidate))
    .replaceAll("https://YOUR-POLARION/polarion/rest/v1", API_BASE_URL).replaceAll("YOUR_POLARION_PAT", PAT)
    .replace("-- npx -y polarion-mcp", `-- ${process.execPath} ${build}`);
  const words = line.split(/\s+/);
  const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, ".config") };
  return { words, env };
}

for (const [clientId, tool] of [["claude-code", "claude"], ["codex-cli", "codex"]]) {
  test(`${tool}: the documented mcp add command registers polarion`, () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), `guide-cli-${tool}-`));
    try {
      const { words, env } = documentedAdd(clientId, home);
      execFileSync(words[0], words.slice(1), { env, stdio: "pipe", cwd: home });
      const listed = execFileSync(tool, ["mcp", "list"], { env, cwd: home, encoding: "utf8", timeout: 60_000 });
      assert.match(listed, /polarion/);
      if (tool === "claude") assert.match(listed, /Connected|✓/);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
}
