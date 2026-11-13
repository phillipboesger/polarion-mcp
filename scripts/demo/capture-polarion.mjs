#!/usr/bin/env node
// Playwright screenshot of the demo LiveDoc in the Polarion UI: run once with "before", once with "after".
// Not used in --mock mode (render.mjs draws placeholder panels instead).
//
//   POLARION_BASE_URL=http://localhost node scripts/demo/capture-polarion.mjs before|after
//
// Login uses POLARION_USER / POLARION_PASSWORD (default admin/admin on a local throwaway instance).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { DEMO, OUT_DIR, browserLaunchOptions, assertLocalTarget, isLocalUrl, isMain, parseArgs, polarionRoot, restBase } from './lib/common.mjs';

export async function captureLiveDoc({ baseUrl, label, outDir = OUT_DIR, project = DEMO.project, user, password }) {
  const root = polarionRoot(baseUrl);
  const dir = path.join(outDir, 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${root}/polarion/login`, { waitUntil: 'load' });
    await page.locator('input[name="j_username"]').fill(user);
    await page.locator('input[name="j_password"]').fill(password);
    await page.locator('input[name="j_password"]').press('Enter');
    await page.waitForLoadState('load');
    await page.goto(`${root}/polarion/#/project/${project}/wiki/${DEMO.space}/${DEMO.document}`, { waitUntil: 'load' });
    // The LiveDoc renders client-side after load; there is no single stable selector across Polarion versions.
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(4000);
    const file = path.join(dir, `${label}.png`);
    await page.screenshot({ path: file });
    return file;
  } finally {
    await browser.close();
  }
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const label = process.argv.slice(2).find(arg => arg === 'before' || arg === 'after');
  if (!label) throw new Error('Usage: capture-polarion.mjs before|after');
  const baseUrl = process.env.POLARION_BASE_URL;
  if (!baseUrl) throw new Error('Set POLARION_BASE_URL (e.g. http://localhost).');
  assertLocalTarget(restBase(baseUrl), flags.has('i-know'));
  const local = isLocalUrl(baseUrl);
  const user = process.env.POLARION_USER ?? (local ? 'admin' : '');
  const password = process.env.POLARION_PASSWORD ?? (local ? 'admin' : '');
  if (!user || !password) throw new Error('Set POLARION_USER and POLARION_PASSWORD.');
  console.log(`Wrote ${await captureLiveDoc({ baseUrl, label, user, password })}`);
}

if (isMain(import.meta.url)) {
  main().catch(error => { console.error(`capture-polarion: ${error.message}`); process.exit(1); });
}
