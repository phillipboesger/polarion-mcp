import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const root = process.cwd();
const { makeDeepLinks } = await import(pathToFileURL(path.join(root, 'scripts/make-deeplinks.mjs')).href);
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const registryEntry = JSON.parse(readFileSync(path.join(root, 'server.json'), 'utf8'));

test('npm registry package metadata matches package.json and declares credentials', () => {
  assert.equal(registryEntry.version, packageJson.version);
  const npmPackage = registryEntry.packages.find((entry: { registryType: string }) => entry.registryType === 'npm');
  assert.ok(npmPackage);
  assert.equal(npmPackage.identifier, packageJson.name);
  assert.equal(npmPackage.version, packageJson.version);
  assert.deepEqual(
    npmPackage.environmentVariables.map((variable: { name: string; isSecret?: boolean }) => [variable.name, variable.isSecret]),
    [['API_BASE_URL', undefined], ['BEARER_TOKEN', true]],
  );
});

test('VS Code and Cursor deep links encode their documented npm server configuration', () => {
  const links = makeDeepLinks();
  const vscodeJson = decodeURIComponent(links.vscode.slice('vscode:mcp/install?'.length));
  const cursorUrl = new URL(links.cursor);
  const cursorJson = Buffer.from(cursorUrl.searchParams.get('config')!, 'base64').toString('utf8');
  const expectedServer = { command: 'npx', args: ['-y', packageJson.name] };

  assert.deepEqual(JSON.parse(vscodeJson), { name: packageJson.name, ...expectedServer });
  assert.equal(cursorUrl.protocol, 'cursor:');
  assert.equal(cursorUrl.host, 'anysphere.cursor-deeplink');
  assert.equal(cursorUrl.pathname, '/mcp/install');
  assert.equal(cursorUrl.searchParams.get('name'), packageJson.name);
  assert.deepEqual(JSON.parse(cursorJson), expectedServer);
});

test('MCPB manifest prompts for the API URL and a sensitive PAT', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, 'mcpb/manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, '0.3');
  assert.equal(manifest.server.type, 'node');
  assert.equal(manifest.server.entry_point, 'build/index.js');
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.user_config.api_base_url.required, true);
  assert.equal(manifest.user_config.bearer_token.required, true);
  assert.equal(manifest.user_config.bearer_token.sensitive, true);
});
