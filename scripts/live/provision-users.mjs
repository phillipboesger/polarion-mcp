#!/usr/bin/env node
// Provision a project-only live-test user in an explicitly named disposable Polarion container.
// Requires Docker, svn, htpasswd, curl and the optional Playwright/Chromium dependency used by create-pat.mjs.
import { spawn } from "node:child_process";
import { mkdtemp, chmod, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const name = key?.slice(2);
    if (!["--container", "--url", "--project", "--output"].includes(key) || !argv[i + 1] || argv[i + 1].startsWith("--") || name in out) throw new Error("Usage: provision-users.mjs --container NAME --url URL --project ID --output PRIVATE_JSON");
    out[name] = argv[i + 1];
  }
  if (Object.keys(out).length !== 4) throw new Error("Usage: provision-users.mjs --container NAME --url URL --project ID --output PRIVATE_JSON");
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(out.container) || out.container === "..") throw new Error("Invalid container name");
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(out.project) || out.project === "..") throw new Error("Invalid project id");
  const u = new URL(out.url);
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error("URL must be an HTTP(S) Polarion base URL without credentials, query, or fragment");
  out.url = out.url.replace(/\/+$/, "");
  return out;
};

const run = (cmd, args, { input, env, timeout = 60_000, allow = false, safeError = false } = {}) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: env ?? process.env });
  let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), settled = false;
  const timer = setTimeout(() => { child.kill("SIGKILL"); finish(new Error(`${cmd} timed out`)); }, timeout);
  const finish = (err) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (err) reject(err);
    else resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
  };
  child.stdout.on("data", b => { stdout = Buffer.concat([stdout, b]); });
  child.stderr.on("data", b => { stderr = Buffer.concat([stderr, b]); });
  child.once("error", e => finish(new Error(`${cmd} could not start: ${e.message}`)));
  child.once("close", code => code === 0 || allow ? finish() : finish(new Error(safeError ? `${cmd} failed (${code}); sensitive input was suppressed` : `${cmd} failed (${code}): ${stderr.toString().slice(-500)}`)));
  child.stdin.end(input);
});

const waitReady = async (url) => {
  const end = Date.now() + 180_000;
  while (Date.now() < end) {
    try { const r = await fetch(`${url}/polarion/`, { signal: AbortSignal.timeout(4000), redirect: "manual" }); if (r.status < 500) return; } catch { /* Retry until the readiness deadline. */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error("Polarion did not become ready within 180 seconds");
};

const sh = `set -eu
USER_ID="$1"; PROJECT="$2"
REPO=/opt/polarion/data/svn/repo
LIC=/opt/polarion/polarion/license/users
test -f "$LIC" || { echo 'Polarion license file missing' >&2; exit 31; }
PRODUCTS=$(sed -n -E 's/^(named[A-Za-z]+User)[0-9]+=.*/\\1/p' "$LIC" | sort -u)
test -n "$PRODUCTS" || { echo 'No named-user license slots found' >&2; exit 32; }
for product in $PRODUCTS; do
  grep -q -E "^\${product}[0-9]+=\${USER_ID}$" "$LIC" || { grep -q -E "^\${product}[0-9]+=$" "$LIC" || { echo "No free named license slot for $product" >&2; exit 33; }; sed -i -E "0,/^(\${product}[0-9]+)=$/s//\\1=\${USER_ID}/" "$LIC"; }
done
WC=$(mktemp -d)
trap 'rm -rf "$WC"' EXIT
svn --username polarion --non-interactive -q co file://$REPO/.polarion "$WC/global" --depth empty
svn --username polarion --non-interactive -q up "$WC/global/user-management" --set-depth empty
svn --username polarion --non-interactive -q up "$WC/global/user-management/users" --set-depth immediates
svn --username polarion --non-interactive -q up "$WC/global/security" --set-depth files
mkdir -p "$WC/global/user-management/users/$USER_ID"
cat > "$WC/global/user-management/users/$USER_ID/user.xml" <<EOF
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<user><field id="description" text-type="text/plain"/><field id="email"/><field id="name">Project Viewer $USER_ID</field></user>
EOF
svn --username polarion --non-interactive -q add "$WC/global/user-management/users/$USER_ID"
ROLES="$WC/global/security/user-roles.xml"
grep -q "$USER_ID" "$ROLES" || sed -i "s#</user-roles>#    <user name='$USER_ID'><role name='user'/></user>\\n</user-roles>#" "$ROLES"
svn --username polarion --non-interactive -q ci -m 'Seed project-only live test user' "$WC/global"
PROJECT_FILE=$(svnlook tree "$REPO" --full-paths / | grep -F "/$PROJECT/.polarion/security/user-roles.xml" | head -1)
test -n "$PROJECT_FILE" || { echo 'Requested project security roles not found in repository' >&2; exit 34; }
DIR=$(dirname "$PROJECT_FILE")
svn --username polarion --non-interactive -q co "file://$REPO$DIR" "$WC/project" --depth files
PROLES="$WC/project/user-roles.xml"
grep -q "$USER_ID" "$PROLES" || sed -i "s#</user-roles>#    <user name='$USER_ID'><role name='project_user'/></user>\\n</user-roles>#" "$PROLES"
svn --username polarion --non-interactive -q ci -m 'Grant project user role to live test account' "$PROLES"
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const scratch = await mkdtemp(path.join(tmpdir(), "polarion-provision-"));
  const user = `projectviewer${randomBytes(3).toString("hex")}`;
  const password = randomBytes(24).toString("base64url");
  const adminName = `live-admin-${Date.now()}`, projectName = `live-project-${Date.now()}`;
  const output = path.resolve(opts.output);
  try {
    try { await access(output); throw new Error("Output path already exists; choose a new private output path"); } catch (e) { if (e.message.includes("already exists")) throw e; }
    const inspect = await run("docker", ["inspect", "--format", "{{.Config.Image}} {{.State.Running}}", opts.container]);
    const version = /(?:2512|2606)/.exec(inspect.stdout)?.[0];
    if (!version || !/true/.test(inspect.stdout)) throw new Error("Container must be a running explicitly named Polarion 2512 or 2606 container");
    // Verify the live server URL is the same target by checking its version endpoint.
    await waitReady(opts.url);
    const dbSchema = `SELECT table_name,column_name,data_type,character_maximum_length FROM information_schema.columns WHERE table_schema='polarion_internal' AND table_name='userauthn' ORDER BY ordinal_position;`;
    const query = await run("docker", ["exec", "-i", opts.container, "psql", "-p5433", "-U", "polarion", "-d", "polarion_system", "-At", "-F", "|"], { input: `${dbSchema}\n` });
    const got = query.stdout.trim().split("\n").map(x => x.split("|"));
    const expected = [["userauthn","username","character varying","128"],["userauthn","password","character varying","128"]];
    if (JSON.stringify(got) !== JSON.stringify(expected)) throw new Error(`Polarion database schema mismatch: expected polarion_internal.userauthn(username,password varchar(128)); observed ${got.length} column row(s)`);

    const pwHash = await run("htpasswd", ["-nim", user], { input: `${password}\n${password}\n`, safeError: true });
    const hash = pwHash.stdout.trim().split(":").slice(1).join(":");
    if (!/^\$apr1\$/.test(hash)) throw new Error("htpasswd did not produce an apr1 hash");
    await run("docker", ["exec", "-i", opts.container, "sh", "-s", user, opts.project], { input: sh });
    await run("docker", ["exec", "-i", opts.container, "psql", "-p5433", "-U", "polarion", "-d", "polarion_system", "-v", "ON_ERROR_STOP=1"], {
      input: `INSERT INTO polarion_internal.userauthn(username,password) VALUES ('${user}','${hash}') ON CONFLICT(username) DO UPDATE SET password=EXCLUDED.password;\n`,
      safeError: true,
    });
    await waitReady(opts.url);

    // Add the user to Polarion's global and project authorization groups and grant only project REST GET.
    const accessScript = `set -eu
USER_ID="$1"; PROJECT="$2"; REPO=/opt/polarion/data/svn/repo; WC=$(mktemp -d); trap 'rm -rf "$WC"' EXIT
svn --username polarion --non-interactive -q co file://$REPO/.polarion "$WC/global" --depth files
svn --username polarion --non-interactive -q up "$WC/global/security" --set-depth files
ACCESS="$WC/global/security/access"
if grep -q '^user = ' "$ACCESS"; then sed -i "/^user = /s/$/, $USER_ID/" "$ACCESS"; fi
if grep -q '^everyone = ' "$ACCESS"; then sed -i "/^everyone = /s/$/, $USER_ID/" "$ACCESS"; fi
svn --username polarion --non-interactive -q ci -m 'Add live viewer to access groups' "$ACCESS"
PROJECT_FILE=$(svnlook tree "$REPO" --full-paths / | grep -F "/$PROJECT/.polarion/security/user-roles.xml" | head -1); test -n "$PROJECT_FILE"
DIR=$(dirname "$PROJECT_FILE"); svn --username polarion --non-interactive -q co "file://$REPO$DIR" "$WC/project" --depth files
P="$WC/project/permissions.xml"
test -f "$P" || { echo 'Project permissions.xml missing from user-roles directory' >&2; exit 35; }
sed -i 's#</permissions>#    <role name="project_user"><grant permission="com.polarion.rest.get"/></role>\\n</permissions>#' "$P"
svn --username polarion --non-interactive -q ci -m 'Grant project REST GET for live viewer' "$P"
chown -R www-data:www-data /opt/polarion/data/svn/repo
`;
    await run("docker", ["exec", "-i", opts.container, "sh", "-s", user, opts.project], { input: accessScript });
    await run("docker", ["restart", opts.container], { timeout: 180_000 });
    await waitReady(opts.url);
    const makePat = async (name, username, pass) => {
      const r = await run(process.execPath, [path.join(ROOT, "scripts/live/create-pat.mjs")], { env: { ...process.env, POLARION_URL: opts.url, POLARION_USER: username, POLARION_PASS: pass, PAT_NAME: name }, timeout: 180_000 });
      return r.stdout.trim();
    };
    const adminPat = await makePat(adminName, process.env.POLARION_ADMIN_USER || "admin", process.env.POLARION_ADMIN_PASS || "admin");
    const projectPat = await makePat(projectName, user, password);
    const matrix = {};
    for (const [key, token, endpoint] of [["adminMetadata",adminPat,"/metadata"],["adminProject",adminPat,`/projects/${encodeURIComponent(opts.project)}`],["projectMetadata",projectPat,"/metadata"],["projectProject",projectPat,`/projects/${encodeURIComponent(opts.project)}`],["projectProjects",projectPat,"/projects?page[size]=1"],["projectUser",projectPat,"/user"],["invalidToken",`${projectPat}x`,"/metadata"]]) {
      const res = await fetch(`${opts.url}/polarion/rest/v1${endpoint}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
      matrix[key] = res.status; await res.body?.cancel();
    }
    const expectedStatus = { adminMetadata:200, adminProject:200, projectMetadata:200, projectProject:200, projectProjects:403, projectUser:403, invalidToken:401 };
    for (const [k, v] of Object.entries(expectedStatus)) if (matrix[k] !== v) throw new Error(`PAT endpoint matrix mismatch for ${k}: expected ${v}, observed ${matrix[k]}`);
    await writeFile(output, `${JSON.stringify({ adminPat, projectPat, projectId: opts.project, version, matrix }, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await chmod(output, 0o600);
    process.stdout.write(`Provisioned ${user} for ${opts.project}; credentials saved to ${output} (mode 0600).\n`);
  } finally { await rm(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
