import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../scripts/live/provision-users.mjs";

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
