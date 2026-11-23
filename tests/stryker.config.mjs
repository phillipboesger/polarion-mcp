import { readFileSync } from 'node:fs';

function executorDispatchRange() {
  const file = 'build-tests/src/executor.js';
  const lines = readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((line) => line.includes('===== STEP 7: Execute the HTTP Request'));
  const end = lines.findIndex((line) => line.includes('===== STEP 8: Format the Response'));
  if (start < 0 || end <= start) {
    throw new Error(`STEP 7 / STEP 8 markers not found in ${file}; update tests/stryker.config.mjs`);
  }
  return `${file}:${start + 1}-${end}`;
}

const projects = {
  oauth: {
    mutate: ['build-tests/src/oauth.js'],
    command: 'node --test --test-concurrency=1 build-tests/tests/oauth*.test.js build-tests/tests/mcp-http.test.js build-tests/tests/token-check.test.js build-tests/tests/security-coverage.test.js',
  },
  sealed: {
    mutate: ['build-tests/src/sealed.js'],
    command: 'node --test --test-concurrency=1 build-tests/tests/sealed.test.js build-tests/tests/security-coverage.test.js',
  },
  guards: {
    mutate: ['build-tests/src/guards.js'],
    command: 'node --test --test-concurrency=1 build-tests/tests/guards*.test.js build-tests/tests/executor.test.js build-tests/tests/executor-audit.test.js build-tests/tests/security-coverage.test.js',
  },
  'tool-filter': {
    mutate: ['build-tests/src/tool-filter.js'],
    command: 'node --test --test-concurrency=1 build-tests/tests/tool-filter.test.js build-tests/tests/annotations.test.js build-tests/tests/guidance-filter.test.js build-tests/tests/mcp-http.test.js',
  },
  executor: {
    // Guarded HTTP dispatch: from the STEP 7 marker to the STEP 8 marker in src/executor.ts. The compiled
    // line range is derived from those markers so it cannot drift when the file changes.
    mutate: [executorDispatchRange()],
    command: 'node --test --test-concurrency=1 build-tests/tests/executor*.test.js build-tests/tests/http-client.test.js build-tests/tests/httpClient.test.js build-tests/tests/security-coverage.test.js',
  },
};

const moduleName = process.env.MUTATION_MODULE;
const project = projects[moduleName];
if (!project) throw new Error(`Set MUTATION_MODULE to one of: ${Object.keys(projects).join(', ')}`);

/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
export default {
  testRunner: 'command',
  commandRunner: {
    command: project.command,
  },
  mutate: project.mutate,
  coverageAnalysis: 'off',
  concurrency: 4,
  timeoutMS: 20_000,
  thresholds: { break: 75 },
  dryRunTimeoutMinutes: 2,
  incremental: true,
  incrementalFile: `reports/mutation/${moduleName}-incremental.json`,
  reporters: ['clear-text', 'html', 'json'],
  htmlReporter: {
    fileName: `reports/mutation/${moduleName}.html`,
  },
  jsonReporter: {
    fileName: `reports/mutation/${moduleName}.json`,
  },
  cleanTempDir: true,
};
