import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync('docs/clients.json', 'utf8'));
const screenshotDir = process.env.DOCS_SCREENSHOT_DIR || '/tmp/sol-docs2';

async function noOverflow(page) {
  expect(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth)).toBe(true);
}

test('benefits fit the first screen and the picker is grouped', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  for (const text of ['284', 'Read-only', 'Open source', 'Signed']) await expect(page.locator('.proof').getByText(text, { exact: false })).toBeInViewport();
  await expect(page.locator('body')).not.toContainText(/unverified/i);
  await expect(page.locator('a[href^="clients/"]')).toHaveCount(0);
  await noOverflow(page);
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `after-${info.project.name}.png`) });
  await page.locator('#clients').scrollIntoViewIfNeeded();
  await expect(page.locator('.client-group > h3')).toHaveText(['AI providers', 'Tools / IDEs', 'Custom / self-hosted']);
  await expect(page.locator('#group-providers + div h4')).toHaveText(['Claude', 'OpenAI / ChatGPT', 'Microsoft', 'Google']);
  await page.screenshot({ path: path.join(screenshotDir, `after-${info.project.name}-setup.png`) });
  expect(errors).toEqual([]);
});

test('every client opens its inline steps, one snippet and a compatible switcher', async ({ page }) => {
  await page.goto('/');
  for (const client of manifest.clients) {
    const setup = manifest.setups.find(setup => setup.id === client.setup);
    await page.locator(`[data-client="${client.id}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`#setup/${client.id}$`));
    await expect(page.locator('#setup-title')).toHaveText(setup.title);
    await expect(page.locator('#setup-code')).toHaveText(client.snippet ?? setup.snippet);
    await expect(page.locator('#setup-steps li')).toHaveText(client.steps);
    await expect(page.locator('#setup-client option')).toHaveCount(manifest.clients.filter(item => item.setup === client.setup).length);
    await expect(page.locator('#setup pre')).toHaveCount(1);
    await noOverflow(page);
  }
});

test('same-format clients share one panel and CLI switchers update the command', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('[data-client="cursor"]').click();
  await expect(page.locator('#setup-title')).toBeInViewport();
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `after-${info.project.name}-inline.png`) });
  const json = await page.locator('#setup-code').textContent();
  await page.locator('#setup-client').selectOption('cline');
  await expect(page.locator('#setup-code')).toHaveText(json);
  await expect(page.locator('#setup-steps')).toContainText('Cline');
  await page.locator('[data-client="claude-code"]').click();
  await expect(page.locator('#setup-code')).toContainText('claude mcp add');
  await page.locator('#setup-client').selectOption('codex-cli');
  await expect(page.locator('#setup-code')).toContainText('codex mcp add');
  await expect(page.locator('#setup-code')).toContainText('--env BEARER_TOKEN=');
});

test('copy writes exactly the selected snippet and handles clipboard denial', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#setup/docker');
  await expect(page.locator('#setup-title')).toHaveText('Docker team server');
  const snippet = await page.locator('#setup-code').textContent();
  await page.getByRole('button', { name: 'Copy snippet' }).click();
  await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => globalThis.navigator.clipboard.readText())).toBe(snippet);
  await page.evaluate(() => { globalThis.navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); });
  await page.getByRole('button', { name: 'Copied', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Clipboard unavailable');
  expect(await page.evaluate(() => globalThis.getSelection().toString())).toBe(snippet);
});

test('Docker hero link opens the setup again when its hash is already selected', async ({ page }) => {
  await page.goto('/#setup/docker');
  await expect(page.locator('#setup-title')).toHaveText('Docker team server');
  await page.evaluate(() => globalThis.scrollTo({ top: 0, behavior: 'instant' }));
  await page.getByRole('link', { name: 'Run with Docker' }).click();
  await expect(page.locator('#setup-title')).toBeInViewport();
  await expect(page.locator('#setup-code')).toContainText('ghcr.io/phillipboesger/polarion-mcp:1.4.0');
});

test('canvas stops for reduced motion and when the hero leaves the viewport', async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.canvasFrames = {};
    const original = globalThis.CanvasRenderingContext2D.prototype.clearRect;
    globalThis.CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      globalThis.canvasFrames[this.canvas.id] = (globalThis.canvasFrames[this.canvas.id] || 0) + 1;
      return original.apply(this, args);
    };
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => globalThis.canvasFrames['viz-hero'] || 0)).toBeGreaterThan(0);
  await page.waitForTimeout(150);
  const still = await page.evaluate(() => globalThis.canvasFrames);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => globalThis.canvasFrames)).toEqual(still);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.evaluate(() => globalThis.canvasFrames['viz-hero'])).toBeGreaterThan(still['viz-hero'] + 2);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const offscreen = await page.evaluate(() => globalThis.canvasFrames['viz-hero']);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => globalThis.canvasFrames['viz-hero'])).toBe(offscreen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const reduced = await page.evaluate(() => globalThis.canvasFrames);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => globalThis.canvasFrames)).toEqual(reduced);
});
