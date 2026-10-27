import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, validateContainerTarget, validPat } from "../../scripts/live/provision-users.mjs";
import { readFile } from "node:fs/promises";

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
  const ports = JSON.stringify({ "8080/tcp": [{ HostIp: "0.0.0.0", HostPort: "8080" }] });
  const inspect = `polarion:2606|true|true|${ports}`;
  assert.equal(validateContainerTarget(inspect, "http://localhost:8080"), "2606");
  assert.throws(() => validateContainerTarget(`polarion:2606|true||${ports}`, "http://localhost:8080"), /not marked/);
  assert.throws(() => validateContainerTarget(`polarion:2606|true|false|${ports}`, "http://localhost:8080"), /not marked/);
  assert.throws(() => validateContainerTarget(inspect, "https://polarion.example:8080"), /localhost/);
  assert.throws(() => validateContainerTarget(inspect, "http://localhost:8081"), /not published/);
  assert.throws(() => validateContainerTarget(`polarion:2506|true|true|${ports}`, "http://localhost:8080"), /2512 or 2606/);
});

test("PAT capture accepts JWT shape only", () => {
  assert.equal(validPat("eyJhbGci.eyJzdWI.signature"), true);
  for (const value of ["", "error: secret", "eyJabc.def", "Bearer eyJabc.def.ghi"]) assert.equal(validPat(value), false);
});

test("provisioning source contains required safe SVN path and probe controls", async () => {
  const source = await readFile(new URL("../../scripts/live/provision-users.mjs", import.meta.url), "utf8");
  assert.match(source, /file:\/\/\$REPO\/\.polarion/);
  assert.match(source, /ACCESS="\$WC\/global\/access"/);
  assert.ok(source.includes("grep -q '^\\[groups\\]$'"));
  assert.match(source, /sed 's\/ \/%20\/g'/);
  assert.match(source, /com\.polarion\.rest\.get/);
  assert.match(source, /redirect: "manual"/);
  assert.match(source, /15 \* 60_000/);
  assert.match(source, /r\.status === 401/);
  assert.match(source, /safeError: true/);
});
