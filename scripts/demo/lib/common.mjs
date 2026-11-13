// Shared constants and helpers for the demo harness (see scripts/demo/README.md).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEMO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(DEMO_DIR, '..', '..');
export const OUT_DIR = path.join(DEMO_DIR, 'out');

export const CAPTION = 'Replay of real tool calls, assistant text scripted';
export const MOCK_WATERMARK = 'MOCK - not for publication';

/** The demo project and LiveDoc the scripted steps write into. */
export const DEMO = {
  project: 'brakedemo',
  trackerPrefix: 'BRK',
  space: 'Specification',
  document: 'BrakeSystem',
  documentTitle: 'Brake System Requirements',
  workItemType: 'requirement',
  customField: 'asilLevel',
  wrongCustomField: 'asil',
};

const LOCAL_HOSTS = new Set(['localhost', '::1', '[::1]']);

/** True only for loopback targets. Parses the URL, so `localhost.evil.com` and `127.0.0.1@evil.com` are not local. */
export function isLocalUrl(value) {
  let host;
  try { host = new URL(value).hostname.toLowerCase(); } catch { return false; }
  if (LOCAL_HOSTS.has(host) || host.endsWith('.localhost')) return true;
  return /^127(\.\d{1,3}){3}$/.test(host);
}

/** Throws unless the URL is loopback or the caller passed `--i-know`. */
export function assertLocalTarget(value, iKnow = false) {
  if (isLocalUrl(value) || iKnow) return;
  throw new Error(`Refusing to write to non-local Polarion URL (${safeOrigin(value)}). The demo creates data and must only run against a throwaway instance. Pass --i-know to override.`);
}

function safeOrigin(value) {
  try { return new URL(value).origin; } catch { return '<unparseable URL>'; }
}

/** Polarion root URL (`http://localhost`) or REST base (`.../polarion/rest/v1`) in, REST base out. */
export function restBase(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (/\/rest\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed.replace(/\/polarion$/, '')}/polarion/rest/v1`;
}

/** Polarion root (without /polarion/rest/v1) for UI navigation. */
export function polarionRoot(baseUrl) {
  return restBase(baseUrl).replace(/\/polarion\/rest\/v\d+$/, '');
}

const VALUE_FLAGS = new Set(['out', 'project', 'timeout']);

export function parseArgs(argv) {
  const flags = new Set();
  const values = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [key, inline] = arg.slice(2).split('=');
    if (inline !== undefined) values[key] = inline;
    else if (VALUE_FLAGS.has(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) values[key] = argv[++i];
    else flags.add(key);
  }
  return { flags, values };
}

/** Playwright launch options. DEMO_CHROMIUM points at a specific Chromium when the bundled one is not installed. */
export function browserLaunchOptions() {
  return process.env.DEMO_CHROMIUM ? { executablePath: process.env.DEMO_CHROMIUM } : {};
}

export function isMain(metaUrl) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
