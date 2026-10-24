import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  outputDir: '../../test-results/docs-ui',
  reporter: 'list',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:8767', reducedMotion: 'reduce', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: 'python3 -m http.server 8767 --bind 127.0.0.1 --directory docs', url: 'http://127.0.0.1:8767', reuseExistingServer: !process.env.CI, cwd: process.cwd() },
});
