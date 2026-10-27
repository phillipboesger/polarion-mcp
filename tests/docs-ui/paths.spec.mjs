import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync('docs/clients.json', 'utf8'));
const scenarios = JSON.parse(fs.readFileSync('docs/daily-use.json', 'utf8'));
const screenshotDir = process.env.DOCS_SCREENSHOT_DIR || '/tmp/sol-docs3';

async function noOverflow(page) {
  expect(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth)).toBe(true);
}

async function screenshot(page, name) {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, name) });
}

test('hero breathes and the landing page follows the complete user journey', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => globalThis.document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  for (const text of ['284', 'Preview', 'Open source', 'Release', 'Stars']) await expect(page.locator('.proof').getByText(text, { exact: false })).toBeInViewport();
  await expect(page.locator('.hero .outcomes')).toHaveCount(0);
  await expect(page.locator('.hero .button')).toHaveCount(2);
  await expect(page.locator('body')).not.toContainText(/unverified|Web connector/i);
  expect(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.id || section.className))).toEqual(['hero', 'features', 'daily-use', 'clients', 'faq']);
  await noOverflow(page);
  await screenshot(page, `after-${info.project.name}.png`);
  for (const section of ['features', 'daily-use', 'clients', 'faq']) {
    await page.locator(`#${section}`).scrollIntoViewIfNeeded();
    await noOverflow(page);
    await screenshot(page, `after-${info.project.name}-${section}.png`);
  }
  await page.screenshot({ path: path.join(screenshotDir, `after-${info.project.name}-full.png`), fullPage: true });
  await expect(page.locator('#clients-title')).toHaveText('Choose your path');
  await expect(page.locator('#setup')).toHaveCount(0);
  expect(errors).toEqual([]);
});

const guideBase = 'https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/';

test('every client card shows both requirements and a valid GitHub guide link, with no setup panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#setup')).toHaveCount(0);
  await expect(page.locator('#clients .setup-steps, #clients pre, #clients ol')).toHaveCount(0);
  await expect(page.locator('.client-card')).toHaveCount(manifest.clients.length);
  for (const client of manifest.clients) {
    const card = page.locator(`.client-card[data-client="${client.id}"]`);
    await expect(card).toHaveCount(1);
    await expect(card.locator('h4')).toHaveText(client.name);
    await expect(card.locator('dd').nth(0)).not.toBeEmpty();
    await expect(card.locator('dd').nth(1)).not.toBeEmpty();
    await expect(card.getByRole('link', { name: /Open guide/ })).toHaveAttribute('href', `${guideBase}clients/${client.id}.md`);
    expect(fs.existsSync(`docs/guides/clients/${client.id}.md`)).toBe(true);
  }
  await expect(page.getByRole('link', { name: /Open the local guide/ })).toHaveAttribute('href', `${guideBase}local-npm.md`);
  await expect(page.getByRole('link', { name: /Open the server guide/ })).toHaveAttribute('href', `${guideBase}server-docker.md`);
  await noOverflow(page);
});

test('the local/server question filters the client cards and is keyboard reachable', async ({ page }) => {
  await page.goto('/');
  const supports = mode => manifest.clients.filter(client => !client[mode].reason).map(client => client.id);
  for (const mode of ['local', 'server']) {
    await page.getByLabel(mode === 'local' ? /On my computer/ : /Cloud or team/).check();
    const shown = await page.locator('.client-card:not([hidden])').evaluateAll(cards => cards.map(card => card.dataset.client));
    expect(shown.sort()).toEqual(supports(mode).sort());
    await expect(page.locator('#path-status')).toHaveText(`${shown.length} clients shown`);
    for (const group of await page.locator('.client-group').all()) {
      const visibleCards = await group.locator('.client-card:not([hidden])').count();
      await expect(group).toBeVisible({ visible: visibleCards > 0 });
    }
    await noOverflow(page);
  }
  await page.getByLabel(/Show all clients/).check();
  await expect(page.locator('.client-card:not([hidden])')).toHaveCount(manifest.clients.length);
  await page.getByLabel(/Show all clients/).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel(/On my computer/)).toBeChecked();
  await page.locator('.client-card a').first().focus();
  await expect(page.locator('.client-card a').first()).toBeFocused();
});

test('hero CTAs reach the chooser and the Docker link points to the server guide; old #setup links land on the chooser', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Connect your assistant' }).click();
  await expect(page.locator('#clients-title')).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Run with Docker' })).toHaveAttribute('href', `${guideBase}server-docker.md`);
  await page.goto('/#setup/claude-code');
  await expect(page).toHaveURL(/#clients$/);
});

test('daily conversations support keyboard tabs without shifting the next section', async ({ page }, info) => {
  await page.goto('/');
  const setupTop = () => page.locator('#clients').evaluate(element => element.getBoundingClientRect().top + globalThis.scrollY);
  const before = await setupTop();
  for (const scenario of scenarios) {
    await page.locator(`#tab-${scenario.id}`).click();
    await expect(page.locator(`#tab-${scenario.id}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByRole('tabpanel')).toContainText(scenario.prompt);
    await expect(page.getByRole('tabpanel').locator('.approval')).toContainText(scenario.guard);
    expect(await setupTop()).toBe(before);
    await noOverflow(page);
  }
  await page.locator('#tab-trace').press('Home');
  await expect(page.locator('#tab-triage')).toBeFocused();
  await page.locator('#tab-triage').press('ArrowDown');
  await expect(page.locator('#tab-review')).toHaveAttribute('aria-selected', 'true');
  await screenshot(page, `after-${info.project.name}-daily-review.png`);
  await page.locator('#tab-review').press('End');
  await expect(page.locator('#tab-trace')).toBeFocused();
});

test('FAQ is usable inline and community links match enabled repository features', async ({ page }, info) => {
  await page.goto('/');
  const questions = page.locator('#faq details');
  await expect(questions).toHaveCount(manifest.faq.length);
  for (const item of await questions.all()) {
    await item.locator('summary').click();
    await expect(item).toHaveAttribute('open', '');
    await expect(item.locator('p')).toBeVisible();
    await noOverflow(page);
    await item.locator('summary').press('Enter');
    await expect(item).not.toHaveAttribute('open', '');
  }
  await expect(page.locator('#faq a[href$="/issues"]')).toHaveCount(1);
  await expect(page.locator('a[href*="/discussions"]')).toHaveCount(0);
  await page.locator('#faq details').nth(1).locator('summary').click();
  await page.locator('#faq').scrollIntoViewIfNeeded();
  await screenshot(page, `after-${info.project.name}-faq-open.png`);
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

test('topic carousel advances on its own, responds to controls and honors reduced motion', async ({ page }) => {
  await page.goto('/');
  const track = page.locator('.carousel-track');
  await track.scrollIntoViewIfNeeded();
  await expect(page.locator('.carousel-dot[aria-current="true"]')).toHaveAttribute('data-slide', '0');
  await expect.poll(() => track.evaluate(el => el.scrollLeft), { timeout: 9000 }).toBeGreaterThan(0);
  await page.locator('.carousel-dot').nth(2).click();
  await expect(page.locator('.carousel-dot[aria-current="true"]')).toHaveAttribute('data-slide', '2');
  await noOverflow(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await track.scrollIntoViewIfNeeded();
  await page.waitForTimeout(5500);
  expect(await track.evaluate(el => el.scrollLeft)).toBeLessThan(10);
});
