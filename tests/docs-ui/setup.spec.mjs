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
  for (const section of ['features', 'daily-use', 'clients', 'setup', 'faq']) {
    await page.locator(`#${section}`).scrollIntoViewIfNeeded();
    await noOverflow(page);
    await screenshot(page, `after-${info.project.name}-${section}.png`);
  }
  await page.screenshot({ path: path.join(screenshotDir, `after-${info.project.name}-full.png`), fullPage: true });
  await expect(page.locator('.client-group > h3')).toHaveText(['AI providers', 'Tools / IDEs']);
  await expect(page.locator('[data-client="claude-web-desktop"]')).toHaveText('claude.ai');
  await expect(page.locator('[data-client="generic-stdio"]')).toHaveText('Any MCP client');
  expect(errors).toEqual([]);
});

test('every client shows its default, disabled reasons and every supported server configuration', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  for (const client of manifest.clients) {
    await page.locator(`[data-client="${client.id}"]`).first().click();
    await expect(page.locator('#setup-title')).toHaveText(client.name);
    await expect(page.locator(`[name="server-mode"][value="${client.defaultMode}"]`)).toBeChecked();
    for (const mode of manifest.serverModes) {
      const connection = client.connections[mode.id];
      const input = page.locator(`[name="server-mode"][value="${mode.id}"]`);
      if (connection.reason) {
        await expect(input).toBeDisabled();
        await expect(page.locator(`#reason-${mode.id}`)).toHaveText(connection.reason);
        continue;
      }
      await expect(page.locator(`#description-${mode.id}`)).toHaveText(connection.description || mode.description);
      await expect(input).toBeEnabled();
      await input.check();
      await expect(input).toBeChecked();
      const setup = manifest.setups.find(setup => setup.id === connection.setup);
      await expect(page.locator('#setup-code')).toHaveText(connection.snippet ?? setup.snippet);
      await expect(page.locator('#setup-steps li')).toHaveText(connection.steps);
      if (connection.needs?.length) await expect(page.locator('#setup-needs')).toHaveText(`Needs: ${connection.needs.join(' · ')}`);
      if (connection.serverSetup) {
        const server = manifest.setups.find(setup => setup.id === connection.serverSetup);
        await expect(page.locator('#server-command')).toBeVisible();
        await expect(page.locator('#server-code')).toHaveText(server.snippet);
      } else await expect(page.locator('#server-command')).toBeHidden();
      await expect(page.locator('#setup-source')).toHaveAttribute('href', client.sources[0]);
      await noOverflow(page);
    }
  }
});

test('client switcher and mode deep links restore configurations with safe defaults', async ({ page }) => {
  await page.goto('/#setup/cursor/remote');
  await expect(page.locator('#setup-title')).toHaveText('Cursor');
  await expect(page.locator('#setup-code')).toContainText('https://YOUR-SERVER/mcp');
  await page.locator('#setup-client').selectOption('windsurf');
  await expect(page.locator('#setup-code')).toContainText('"command": "npx"');
  await page.locator('[name="server-mode"][value="remote"]').check();
  await expect(page.locator('#setup-code')).toContainText('"serverUrl"');
  await page.reload();
  await expect(page.locator('[name="server-mode"][value="remote"]')).toBeChecked();
  await expect(page.locator('#setup-code')).toContainText('"serverUrl"');
  await page.goto('/#setup/chatgpt-apps/npm');
  await expect(page.locator('[name="server-mode"][value="remote"]')).toBeChecked();
  await page.goto('/#setup/claude-desktop/invalid-mode');
  await expect(page.locator('[name="server-mode"][value="npm"]')).toBeChecked();
});

test('copy uses the selected client or server snippet and handles clipboard denial', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#setup/claude-web-desktop/docker');
  for (const target of ['setup-code', 'server-code']) {
    const snippet = await page.locator(`#${target}`).textContent();
    const button = page.locator(`[data-copy="${target}"]`);
    await button.click();
    await expect(button).toHaveText('Copied');
    expect(await page.evaluate(() => globalThis.navigator.clipboard.readText())).toBe(snippet);
  }
  await page.evaluate(() => { globalThis.navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); });
  await page.locator('#copy-setup').click();
  await expect(page.getByRole('status')).toContainText('Clipboard unavailable');
  expect(await page.evaluate(() => globalThis.getSelection().toString())).toBe(await page.locator('#setup-code').textContent());
});

test('hero CTAs reach setup and Docker links work with an already selected hash', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Connect your assistant' }).click();
  await expect(page.locator('#clients-title')).toBeInViewport();
  await page.evaluate(() => globalThis.scrollTo({ top: 0, behavior: 'instant' }));
  await page.getByRole('link', { name: 'Run with Docker' }).click();
  await expect(page.locator('#setup-title')).toHaveText('Docker team server');
  await expect(page.locator('#setup-title')).toBeInViewport();
  await expect(page.locator('#server-code')).toContainText('ghcr.io/phillipboesger/polarion-mcp:1.4.1');
  await page.evaluate(() => globalThis.scrollTo({ top: 0, behavior: 'instant' }));
  await page.getByRole('link', { name: 'Run with Docker' }).click();
  await expect(page.locator('#setup-title')).toBeInViewport();
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

test('every setup shows prerequisites, a check and a fix for failures', async ({ page }) => {
  await page.goto('/');
  for (const client of manifest.clients) {
    for (const [mode, connection] of Object.entries(client.connections)) {
      if (connection.reason) continue;
      await page.goto(`/#setup/${client.id}/${mode}`);
      await expect(page.locator('#setup-title')).toHaveText(client.name);
      await expect(page.locator('#before-items details').first()).toBeAttached();
      await expect(page.locator('#setup-verify')).toBeVisible();
      await expect(page.locator('#verify-expect')).not.toBeEmpty();
      await expect(page.locator('#setup-fails summary')).toBeVisible();
      await expect(page.locator('#setup-fails dt').first()).toBeAttached();
      await expect(page.locator('#setup-steps li')).toHaveCount(connection.steps.length);
    }
  }
  await noOverflow(page);
});

test('unsafe or malformed manifest source URLs never reach the DOM link', async ({ page }) => {
  for (const source of ['javascript:alert(1)', 'http://example.com', 'data:text/html,test', 'not a URL']) {
    await page.route('**/index.html', async route => {
      const response = await route.fetch();
      let body = await response.text();
      body = body.replace(/(<script type="application\/json" id="client-data">)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
        const data = JSON.parse(json);
        for (const client of data.clients) client.source = source;
        return start + JSON.stringify(data).replaceAll('<', '\\u003c') + end;
      });
      await route.fulfill({ response, body });
    });
    await page.goto('/index.html');
    await expect(page.locator('#setup-source')).not.toHaveAttribute('href');
    await page.locator('#setup-client').selectOption('cursor');
    await expect(page.locator('#setup-source')).not.toHaveAttribute('href');
    await page.unroute('**/index.html');
  }
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
