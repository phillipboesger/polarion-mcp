#!/usr/bin/env node
// One command for the whole demo. Live: seed, screenshot before, record, screenshot after, render.
// With --mock: record against the fake Polarion and render a watermarked replay (no seed, no screenshots).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { DEMO_DIR, parseArgs } from './lib/common.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const passthrough = process.argv.slice(2).filter(arg => arg === '--i-know');
const plan = flags.has('mock')
  ? [['record.mjs', ['--mock']], ['render.mjs', []]]
  : [['seed.mjs', passthrough], ['capture-polarion.mjs', ['before', ...passthrough]], ['record.mjs', passthrough], ['capture-polarion.mjs', ['after', ...passthrough]], ['render.mjs', []]];

for (const [name, args] of plan) {
  console.log(`\n== ${name} ${args.join(' ')}`.trimEnd());
  const result = spawnSync(process.execPath, [path.join(DEMO_DIR, name), ...args], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`demo: ${name} exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
}
