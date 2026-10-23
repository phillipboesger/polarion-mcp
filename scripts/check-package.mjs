import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'polarion-mcp-package-'));
const packDir = path.join(tempRoot, 'pack');
const installDir = path.join(tempRoot, 'install');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.bin?.['polarion-mcp'], 'build/index.js', 'package.json must expose the polarion-mcp bin');

  mkdirSync(packDir, { recursive: true });
  mkdirSync(installDir, { recursive: true });
  const packOutput = execFileSync(npm, ['pack', '--json', '--pack-destination', packDir], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const [{ filename }] = JSON.parse(packOutput);
  const tarball = path.join(packDir, filename);
  execFileSync(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], {
    cwd: installDir,
    stdio: 'inherit',
  });

  const installedPackagePath = path.join(installDir, 'node_modules', pkg.name);
  const installedPackage = JSON.parse(readFileSync(path.join(installedPackagePath, 'package.json'), 'utf8'));
  assert.equal(installedPackage.bin?.['polarion-mcp'], 'build/index.js');
  const entryPoint = path.join(installedPackagePath, installedPackage.bin['polarion-mcp']);
  const source = readFileSync(entryPoint, 'utf8');
  assert.match(source, /^#!\/usr\/bin\/env node\r?\n/, 'published entry point must have a Node shebang');

  const executable = path.join(installDir, 'node_modules', '.bin', 'polarion-mcp');
  const initialize = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'package-smoke-test', version: '1.0.0' },
    },
  };
  const result = spawnSync(executable, [], {
    input: `${JSON.stringify(initialize)}\n`,
    encoding: 'utf8',
    env: {
      ...process.env,
      API_BASE_URL: 'https://polarion.example.test/polarion/rest/v1',
      BEARER_TOKEN: 'package-smoke-test-token',
    },
    timeout: 20_000,
    maxBuffer: 2 * 1024 * 1024,
  });

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `bin exit ${result.status}; stderr: ${result.stderr}`);
  const response = result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((message) => message.id === initialize.id);
  assert.ok(response?.result?.serverInfo, `missing initialize response; stdout: ${result.stdout}`);
  console.log(`npm pack smoke test passed: ${pkg.name}@${pkg.version}, MCP initialize succeeded.`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
