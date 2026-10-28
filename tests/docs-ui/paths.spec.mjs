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

const primary = id => `.node.primary[data-node="${id}"]`;
const satellite = id => `.satellite[data-client="${id}"]`;
// The fixed bottom sheet can cover map nodes on small screens, so dispatch clicks there.
const isMobile = info => info.project.name.includes('mobile');
const detailId = info => (isMobile(info) ? '#galaxy-sheet' : '#galaxy-panel');
const press = (info, locator) => (isMobile(info) ? locator.dispatchEvent('click') : locator.click());

test('the map starts with six providers, no panel and a complete no-JS guide list', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#setup')).toHaveCount(0);
  await expect(page.locator('#clients .setup-steps, #clients pre, #clients ol, #clients input[name="path"]')).toHaveCount(0);
  await expect(page.locator('.node.primary')).toHaveCount(6);
  await expect(page.locator('.satellite')).toHaveCount(0);
  await expect(page.locator('#galaxy-panel')).toBeHidden();
  await expect(page.locator('#galaxy-sheet')).toBeHidden();
  await expect(page.locator('.galaxy-list')).toBeHidden();
  await expect(page.locator('#galaxy-hint')).toHaveText('Select a provider to see its options');
  await expect(page.locator('.galaxy-list a.guide-link')).toHaveCount(manifest.clients.length);
  for (const client of manifest.clients) {
    await expect(page.locator(`.galaxy-list a[href="${guideBase}clients/${client.id}.md"]`)).toHaveCount(1);
    expect(fs.existsSync(`docs/guides/clients/${client.id}.md`)).toBe(true);
  }
  await expect(page.getByRole('link', { name: /Open the local guide/ })).toHaveAttribute('href', `${guideBase}local-npm.md`);
  await expect(page.getByRole('link', { name: /Open the server guide/ })).toHaveAttribute('href', `${guideBase}server-docker.md`);
  await noOverflow(page);
});

test('one provider branch is open at a time; hub, second click and Escape step back', async ({ page }, info) => {
  await page.goto('/');
  for (const node of manifest.map) {
    await press(info, page.locator(primary(node.id)));
    await expect(page.locator(primary(node.id))).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.satellite')).toHaveCount(node.clients.length);
    await expect(page.locator('.node.primary[aria-expanded="true"]')).toHaveCount(1);
  }
  await press(info, page.locator(primary('claude')));
  await expect(page.locator('.satellite')).toHaveCount(4);
  await press(info, page.locator(satellite('claude-code')));
  await expect(page.locator(detailId(info))).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(detailId(info))).toBeHidden();
  await expect(page.locator('.satellite')).toHaveCount(4);
  await page.locator(satellite('claude-code')).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.satellite')).toHaveCount(0);
  await press(info, page.locator(primary('claude')));
  await press(info, page.locator('#galaxy-hub'));
  await expect(page.locator('.satellite')).toHaveCount(0);
  await expect(page.locator(detailId(info))).toBeHidden();
  await press(info, page.locator(primary('claude')));
  await press(info, page.locator(primary('claude')));
  await expect(page.locator('.satellite')).toHaveCount(0);
});

test('every client opens a panel with its guide, working modes and explained unsupported modes', async ({ page }, info) => {
  await page.goto('/');
  for (const client of manifest.clients.filter(item => item.id !== 'docker')) {
    const node = manifest.map.find(item => item.clients.includes(client.id));
    await press(info, page.locator(primary(node.id)));
    await press(info, page.locator(satellite(client.id)));
    const panel = page.locator(detailId(info));
    await expect(panel).toBeVisible();
    await expect(panel.locator('h3')).toHaveText(client.name);
    await expect(panel.locator('a.go')).toHaveAttribute('href', `${guideBase}clients/${client.id}.md`);
    for (const mode of ['local', 'server']) {
      const button = panel.locator(`.env[data-env="${mode}"]`);
      if (client[mode].reason) {
        await expect(button).toHaveAttribute('aria-disabled', 'true');
        await expect(panel.locator('.why')).toContainText(client[mode].reason);
      } else {
        await expect(button).not.toHaveAttribute('aria-disabled', 'true');
      }
    }
    const first = client.local.reason ? 'server' : 'local';
    await expect(panel.locator(`.env[data-env="${first}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.locator('.chips li').first()).toBeVisible();
    await press(info, page.locator('#galaxy-hub'));
  }
});

test('switching the environment updates requirements and flow; disabled modes stay put', async ({ page }, info) => {
  await page.goto('/');
  await press(info, page.locator(primary('claude')));
  await press(info, page.locator(satellite('claude-code')));
  const panel = page.locator(detailId(info));
  await expect(panel.locator('.flow')).toContainText('Polarion MCP (npx)');
  await panel.locator('.env[data-env="server"]').click();
  await expect(panel.locator('.flow')).toContainText('Polarion MCP (Docker)');
  await expect(panel.locator('.env[data-env="server"]')).toHaveAttribute('aria-pressed', 'true');
  await press(info, page.locator('#galaxy-hub'));
  await press(info, page.locator(primary('editors')));
  await press(info, page.locator(satellite('jetbrains-ai')));
  await panel.locator('.env[data-env="server"]').click({ force: true });
  await expect(panel.locator('.env[data-env="local"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('.why')).toContainText('Authorization header');
});

test('the map works from the keyboard', async ({ page }, info) => {
  await page.goto('/');
  await page.locator(primary('openai')).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(primary('openai'))).toHaveAttribute('aria-expanded', 'true');
  await page.locator(satellite('codex-cli')).focus();
  await page.keyboard.press('Space');
  await expect(page.locator(detailId(info))).toBeVisible();
  await expect(page.locator(detailId(info))).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator(detailId(info))).toBeHidden();
  await expect(page.locator(satellite('codex-cli'))).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator(primary('openai'))).toBeFocused();
  await expect(page.locator('#path-status')).not.toBeEmpty();
});

test('nodes stay large enough and the map never overflows on desktop', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('#galaxy-hub').scrollIntoViewIfNeeded();
  const size = async selector => (await page.locator(selector).first().locator('.disc').boundingBox()).width;
  const wide = info.project.name.includes('mobile') ? 0 : 1;
  await page.locator(primary('editors')).click();
  if (wide) {
    expect(await size(primary('editors'))).toBeGreaterThanOrEqual(70);
    expect(await size('.satellite')).toBeGreaterThanOrEqual(50);
  }
  await page.locator(satellite('cursor')).click();
  await noOverflow(page);
  await screenshot(page, `after-${info.project.name}-galaxy.png`);
});

test('the chooser degrades to a guide list without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.galaxy-list')).toBeVisible();
  await expect(page.locator('.galaxy-stage')).toBeHidden();
  await expect(page.locator('.galaxy-list a.guide-link')).toHaveCount(manifest.clients.length);
  await context.close();
});

test('reduced motion removes map animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator(primary('claude')).click();
  expect(await page.locator(satellite('claude-code')).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(await page.locator('.galaxy .pulse').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
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
