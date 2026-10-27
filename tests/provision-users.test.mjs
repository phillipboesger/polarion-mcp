import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, validateContainerTarget, validPat } from "../scripts/live/provision-users.mjs";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = ["--container", "polarion-disposable", "--url", "http://localhost:8080", "--project", "drivepilot", "--output", "/tmp/live.json"];

test("provisioner accepts the complete explicit target", () => {
  assert.deepEqual(parseArgs(args), { container: "polarion-disposable", url: "http://localhost:8080", project: "drivepilot", output: "/tmp/live.json" });
});

test("provisioner rejects missing, duplicate, unsafe and unrecognized arguments", () => {
  for (const value of [args.slice(0, -2), [...args, "--container", "other"], ["--container", "../other", ...args.slice(2)], ["--container", "bad;name", ...args.slice(2)], [...args, "--force", "yes"]]) {
    assert.throws(() => parseArgs(value));
  }
});

test("provisioner URL must be a credential-free HTTP(S) base URL", () => {
  for (const url of ["ftp://localhost", "http://user:pass@localhost", "http://localhost/path?token=secret", "http://localhost/#x"]) {
    const invalid = [...args];
    invalid[3] = url;
    assert.throws(() => parseArgs(invalid));
  }
  const valid = [...args]; valid[3] = "https://polarion.example/polarion/";
  assert.equal(parseArgs(valid).url, "https://polarion.example/polarion");
});

test("ownership and published-port guards reject before provisioning can start", () => {
  const ports = JSON.stringify({ "80/tcp": [{ HostIp: "0.0.0.0", HostPort: "8080" }] });
  const inspect = `polarion:2606|true|true|${ports}`;
  assert.equal(validateContainerTarget(inspect, "http://localhost:8080"), "2606");
  assert.throws(() => validateContainerTarget(`polarion:2606|true||${ports}`, "http://localhost:8080"), /not marked/);
  assert.throws(() => validateContainerTarget(`polarion:2606|true|false|${ports}`, "http://localhost:8080"), /not marked/);
  assert.throws(() => validateContainerTarget(inspect, "http://polarion.example:8080"), /localhost/);
  assert.throws(() => validateContainerTarget(inspect, "http://localhost:8081"), /not published/);
  assert.throws(() => validateContainerTarget(`polarion:2506|true|true|${ports}`, "http://localhost:8080"), /2512 or 2606/);
});

test("PAT capture accepts JWT shape only", () => {
  assert.equal(validPat("eyJhbGci.eyJzdWI.signature"), true);
  for (const value of ["", "error: secret", "eyJabc.def", "Bearer eyJabc.def.ghi"]) assert.equal(validPat(value), false);
});


test("CLI refuses unowned containers and incompatible schemas before mutation", async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), "provision-guard-"));
  const server = createServer((_req, res) => { res.writeHead(401); res.end(); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const log = path.join(scratch, "commands.jsonl");
  const output = path.join(scratch, "credentials.json");
  const cli = fileURLToPath(new URL("../scripts/live/provision-users.mjs", import.meta.url));
  try {
    await writeFile(path.join(scratch, "docker"), `#!${process.execPath}
import fs from 'node:fs';
const args = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify(args) + "\\n");
if (args[0] === 'inspect') console.log(process.env.MOCK_INSPECT);
else if (args.includes('psql')) console.log('userauthn|wrong_column|text|');
else process.exit(88);
`, {mode: 0o700});
    const run = inspect => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli, '--container', 'polarion', '--url', `http://127.0.0.1:${port}`, '--project', 'drivepilot', '--output', output], {
        env: {...process.env, PATH: `${scratch}:${process.env.PATH}`, MOCK_LOG: log, MOCK_INSPECT: inspect},
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let text = '';
      child.stdout.on('data', b => text += b);
      child.stderr.on('data', b => text += b);
      child.on('error', reject);
      child.on('close', code => resolve({code, text}));
    });
    const inspect = owned => `polarion:v2606|true|${owned}|${JSON.stringify({'80/tcp': [{HostPort: String(port)}]})}`;
    const unowned = await run(inspect('false'));
    assert.equal(unowned.code, 1);
    assert.match(unowned.text, /not marked/);
    assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 1);
    await writeFile(log, '');
    const badSchema = await run(inspect('true'));
    assert.equal(badSchema.code, 1);
    assert.match(badSchema.text, /schema mismatch/);
    const commands = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(commands.length, 2);
    assert.equal(commands[1][3], 'psql');
    await assert.rejects(readFile(output), {code: 'ENOENT'});
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(scratch, {recursive: true, force: true});
  }
});
