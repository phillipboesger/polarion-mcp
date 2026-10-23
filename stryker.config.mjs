const projects = {
  oauth: {
    mutate: ['build-tests/src/oauth.js'],
    command: 'node --test --test-concurrency=1 build-tests/tests/oauth*.test.js build-tests/tests/mcp-http.test.js build-tests/tests/mcp-sessions.test.js build-tests/tests/token-check.test.js build-tests/tests/security-coverage.test.js',
  },
  sealed: {
    mutate: ['build-tests/src/sealed.js'],
    command: 'node --test --test-concurrency=1 build-tests/tests/security-coverage.test.js',
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
    // This compiled line range maps to guarded HTTP dispatch in src/executor.ts (lines 868-960).
    mutate: ['build-tests/src/executor.js:784-869'],
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
