#!/usr/bin/env node
/**
 * Writes package.json's version into server.json (the MCP registry entry and
 * its OCI image tag). Runs from the npm `version` hook, so `npm version x.y.z`
 * keeps both in step.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const server = JSON.parse(readFileSync('server.json', 'utf8'));
server.version = version;
for (const pkg of server.packages ?? []) {
  if (pkg.registryType === 'oci') {
    pkg.identifier = `${pkg.identifier.replace(/:[^/:]+$/, '')}:${version}`;
    delete pkg.version;
  } else pkg.version = version;
}
writeFileSync('server.json', `${JSON.stringify(server, null, 2)}\n`);

const manifestPath = 'mcpb/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const launcher = 'python/polarion_alm_mcp/__init__.py';
writeFileSync(launcher, readFileSync(launcher, 'utf8').replace(/__version__ = "[^"]+"/, `__version__ = "${version}"`));
const pythonReadme = 'python/README.md';
writeFileSync(pythonReadme, readFileSync(pythonReadme, 'utf8').replace(/polarion-alm-mcp==[0-9.]+/g, `polarion-alm-mcp==${version}`));
