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
for (const pkg of server.packages ?? []) pkg.version = version;
writeFileSync('server.json', `${JSON.stringify(server, null, 2)}\n`);
