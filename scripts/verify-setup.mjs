#!/usr/bin/env node
// Local setup gate. Static checks and code tests always run. --docker adds the
// live tests against a Polarion you run yourself; they fail, not skip, when the
// LIVE_* variables are missing. --ui adds the docs browser tests.
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const unknown = [...args].filter(arg => !['--docker', '--ui'].includes(arg));
if (unknown.length) {
  console.error(`verify-setup: unknown option ${unknown.join(' ')} (use --docker and/or --ui)`);
  process.exit(2);
}

const steps = [
  { name: 'typecheck', cmd: ['npm', ['run', 'typecheck']] },
  { name: 'lint', cmd: ['npm', ['run', 'lint']] },
  { name: 'docs (strict)', cmd: ['npm', ['run', 'check:docs:strict']] },
  { name: 'package', cmd: ['npm', ['run', 'check:package']] },
  { name: 'unit and code tests', cmd: ['npm', ['test']], noSkips: true },
];

if (args.has('--ui')) {
  steps.push({ name: 'docs browser tests', cmd: ['npm', ['run', 'test:docs-ui']] });
}

if (args.has('--docker')) {
  const missing = ['LIVE_API_BASE_URL', 'LIVE_PAT'].filter(name => !process.env[name]);
  if (missing.length) {
    console.error(`verify-setup: --docker needs ${missing.join(' and ')}. Start your Polarion container, provision users (scripts/live/provision-users.mjs), then export them.`);
    process.exit(2);
  }
  steps.push({ name: 'live tests (your Polarion)', cmd: ['npm', ['run', 'test:live']], noSkips: true });
}

const failures = [];
for (const step of steps) {
  const [bin, argv] = step.cmd;
  const run = spawnSync(bin, argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const skipped = Number(/ℹ skipped (\d+)/.exec(output)?.[1] ?? 0);
  const passed = Number(/ℹ pass (\d+)/.exec(output)?.[1] ?? 0);
  const ok = run.status === 0 && !(step.noSkips && skipped > 0);
  const detail = step.noSkips && passed ? ` (${passed} passed, ${skipped} skipped)` : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step.name}${detail}`);
  if (!ok) {
    failures.push(step.name);
    const reason = skipped > 0 ? `${skipped} test(s) skipped; setup suites must run every case` : `exit ${run.status}`;
    console.log(`      ${reason}`);
    console.log(output.split('\n').slice(-40).map(line => `      ${line}`).join('\n'));
  }
}

if (failures.length) {
  console.log(`\nverify-setup: FAILED (${failures.join(', ')})`);
  process.exit(1);
}
console.log(`\nverify-setup: all ${steps.length} steps passed${args.has('--docker') ? ' (live included)' : ' (live not run; add --docker)'}`);
