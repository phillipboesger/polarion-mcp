// Creates a personal access token for a fresh Polarion through its web UI and
// prints it on stdout. Polarion shows the token once and offers no API for
// creating it, so the live suite drives the same page a user would.
//
// Needs `playwright` with a Chromium (not a dependency of this package):
//   npm install --no-save playwright@1.52.0 && npx playwright install chromium
//
// POLARION_URL (default http://localhost), POLARION_USER / POLARION_PASS
// (default admin / admin), PAT_NAME (default live-suite).
import { chromium } from "playwright";

const base = (process.env.POLARION_URL || "http://localhost").replace(/\/+$/, "");
const user = process.env.POLARION_USER || "admin";
const pass = process.env.POLARION_PASS || "admin";
const name = process.env.PAT_NAME || "live-suite";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(60_000);

  await page.goto(`${base}/polarion/`, { waitUntil: "networkidle" });
  await page.fill("#j_username", user);
  await page.fill("#j_password", pass);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}), page.locator("#j_password").press("Enter")]);

  await page.goto(`${base}/polarion/#/user_tokens?id=${encodeURIComponent(user)}`);
  await page.waitForSelector(".polarion-Personal-Access-Token-input");
  await page.fill(".polarion-Personal-Access-Token-input", name);
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await page.fill(".polarion-DateInput-input", expires);
  await page.keyboard.press("Tab");
  await page.getByText("Create Token", { exact: true }).click();

  const handle = await page.waitForFunction(() => {
    const text = [...document.querySelectorAll("div, span, td, input, textarea")]
      .map((e) => (e.value || e.innerText || "").trim())
      .find((t) => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(t));
    return text || false;
  });
  process.stdout.write(`${await handle.jsonValue()}\n`);
} finally {
  await browser.close();
}
