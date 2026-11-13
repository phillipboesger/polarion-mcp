#!/usr/bin/env node
// Builds the replay page from out/transcript.json (+ out/screenshots/{before,after}.png), records it with
// Playwright and encodes mp4 + webm (< 4 MB) + GIF (< 2 MB) + poster with ffmpeg.
//
//   node scripts/demo/render.mjs [--out dir] [--page-only]
//
// Mock transcripts are watermarked inside the page itself and written to demo-mock.* so they cannot be
// mistaken for the publishable demo.*.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { OUT_DIR, browserLaunchOptions, isMain, parseArgs } from './lib/common.mjs';
import { buildReplayPage, totalSeconds } from './lib/page.mjs';

export const LIMITS = { webmBytes: 4 * 1024 * 1024, gifBytes: 2 * 1024 * 1024 };

const dataUri = file => (fs.existsSync(file) ? `data:image/png;base64,${fs.readFileSync(file).toString('base64')}` : null);

/** Reads the transcript and screenshots in `outDir` and writes `replay.html`. Returns the page path and metadata. */
export function writeReplayPage(outDir) {
  const transcript = JSON.parse(fs.readFileSync(path.join(outDir, 'transcript.json'), 'utf8'));
  const screenshots = { before: dataUri(path.join(outDir, 'screenshots', 'before.png')), after: dataUri(path.join(outDir, 'screenshots', 'after.png')) };
  const html = buildReplayPage(transcript, { screenshots });
  const file = path.join(outDir, 'replay.html');
  fs.writeFileSync(file, html);
  return { file, transcript, hasScreenshots: Boolean(screenshots.before && screenshots.after) };
}

/** ffmpeg arguments for one output. `level` walks down quality until the size budget fits. */
export function ffmpegArgs({ input, output, kind, offsetSec, durationSec, level = 0 }) {
  const trim = ['-ss', offsetSec.toFixed(2), '-t', durationSec.toFixed(2), '-i', input];
  if (kind === 'mp4') return ['-y', ...trim, '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(24 + level * 3), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', output];
  if (kind === 'webm') return ['-y', ...trim, '-r', '30', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(34 + level * 4), '-row-mt', '1', '-an', output];
  const gif = [{ fps: 10, width: 640 }, { fps: 8, width: 560 }, { fps: 8, width: 480 }, { fps: 6, width: 400 }][Math.min(level, 3)];
  return ['-y', ...trim, '-vf', `fps=${gif.fps},scale=${gif.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, '-loop', '0', output];
}

export function hasFfmpeg() {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

function encodeWithin(kind, params, maxBytes) {
  const maxLevel = kind === 'gif' ? 3 : 4;
  for (let level = 0; level <= maxLevel; level++) {
    execFileSync('ffmpeg', ffmpegArgs({ ...params, kind, level }), { stdio: 'ignore' });
    const size = fs.statSync(params.output).size;
    if (!maxBytes || size <= maxBytes) return size;
  }
  throw new Error(`${path.basename(params.output)} is still larger than ${maxBytes} bytes at the lowest quality; shorten the storyboard.`);
}

/** Records the page in headless Chromium and returns the raw video path, the poster path and the start offset. */
async function capture({ pageFile, outDir, baseName, total }) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch(browserLaunchOptions());
  const videoDir = path.join(outDir, 'video-raw');
  fs.rmSync(videoDir, { recursive: true, force: true });
  fs.mkdirSync(videoDir, { recursive: true });
  const poster = path.join(outDir, `${baseName}-poster.png`);
  try {
    const size = { width: 1280, height: 720 };
    const context = await browser.newContext({ viewport: size, recordVideo: { dir: videoDir, size }, reducedMotion: 'no-preference' });
    const created = Date.now();
    const page = await context.newPage();
    await page.goto(`${pathToFileURL(pageFile).href}?manual`);
    await page.waitForFunction(() => document.body.dataset.state === 'ready');
    const offsetSec = (Date.now() - created) / 1000;
    await page.evaluate(() => window.__demo.start());
    await page.waitForFunction(() => document.body.dataset.done === 'true', undefined, { timeout: (total + 30) * 1000 });
    await page.waitForTimeout(300);
    const video = page.video();
    await context.close();

    // Poster: the frozen frame with the verified result, which is also the reduced-motion view.
    const freeze = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
    const still = await freeze.newPage();
    await still.goto(pathToFileURL(pageFile).href);
    await still.screenshot({ path: poster });
    await freeze.close();
    return { raw: await video.path(), poster, offsetSec };
  } finally {
    await browser.close();
  }
}

export async function renderDemo({ outDir = OUT_DIR, pageOnly = false } = {}) {
  const { file: pageFile, transcript, hasScreenshots } = writeReplayPage(outDir);
  const baseName = transcript.mode === 'mock' ? 'demo-mock' : 'demo';
  const total = totalSeconds(transcript);
  const notes = [];
  if (!hasScreenshots) notes.push('no LiveDoc screenshots found in out/screenshots: placeholder panels were used' + (transcript.mode === 'live' ? ' (run capture-polarion.mjs before and after the recording)' : ''));
  if (pageOnly) return { pageFile, notes, outputs: [] };

  const { raw, poster, offsetSec } = await capture({ pageFile, outDir, baseName, total });
  const outputs = [{ file: poster, bytes: fs.statSync(poster).size }];
  if (!hasFfmpeg()) {
    const kept = path.join(outDir, `${baseName}.raw.webm`);
    fs.copyFileSync(raw, kept);
    notes.push(`ffmpeg not found: wrote only the raw Playwright video (${path.basename(kept)}) and the poster. Install ffmpeg to produce mp4, webm and GIF.`);
    return { pageFile, notes, outputs: [...outputs, { file: kept, bytes: fs.statSync(kept).size }], incomplete: true };
  }
  const common = { input: raw, offsetSec, durationSec: total };
  for (const [kind, ext, max] of [['mp4', 'mp4', 0], ['webm', 'webm', LIMITS.webmBytes], ['gif', 'gif', LIMITS.gifBytes]]) {
    const output = path.join(outDir, `${baseName}.${ext}`);
    encodeWithin(kind, { ...common, output }, max);
    outputs.push({ file: output, bytes: fs.statSync(output).size });
  }
  return { pageFile, notes, outputs, incomplete: false };
}

async function main() {
  const { flags, values } = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(values.out ?? OUT_DIR);
  if (!fs.existsSync(path.join(outDir, 'transcript.json'))) throw new Error(`No transcript at ${path.join(outDir, 'transcript.json')}. Run record.mjs first.`);
  const result = await renderDemo({ outDir, pageOnly: flags.has('page-only') });
  console.log(`page: ${path.relative(process.cwd(), result.pageFile)}`);
  for (const output of result.outputs) console.log(`${path.relative(process.cwd(), output.file)}  ${(output.bytes / 1024).toFixed(0)} KiB`);
  for (const note of result.notes) console.warn(`note: ${note}`);
  if (result.incomplete) {
    const live = JSON.parse(fs.readFileSync(path.join(outDir, 'transcript.json'), 'utf8')).mode === 'live';
    if (live) process.exitCode = 3;
  }
}

if (isMain(import.meta.url)) {
  main().catch(error => { console.error(`render: ${error.message}`); process.exit(1); });
}
