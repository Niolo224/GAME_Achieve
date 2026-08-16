import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PAGE_URL = 'file://' + join(root, 'dist', 'index.html');

let browser;

/**
 * The image ships a pinned Chromium that may not match the npm-resolved
 * Playwright build, so point at the real binary rather than letting
 * Playwright hunt for a version-stamped path that does not exist here.
 */
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      executablePath: chromiumPath(),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) { await browser.close(); browser = null; }
}

/** A fresh page with a clean profile and console/error capture. */
export async function newPage({ geo = null } = {}) {
  const b = await getBrowser();
  const ctx = await b.newContext({
    viewport: { width: 480, height: 900 },
    ...(geo ? { geolocation: geo, permissions: ['geolocation'] } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.errors = errors;
  await page.goto(PAGE_URL);
  await page.waitForSelector('#root .app, #root .card', { timeout: 10000 });
  return page;
}

/**
 * Complete onboarding and land in the game.
 *
 * The Sabbath lock is switched OFF by default here. It defaults to Sunday in
 * the app, so leaving it on would make the whole suite pass or fail depending
 * on which day of the week it happens to run — the tests that complete a step
 * would simply find no step to complete. The dedicated Sabbath tests turn it
 * back on explicitly.
 */
export async function onboard(page, name = 'Sam', { sabbath = false } = {}) {
  await page.fill('[data-testid=ob-name]', name);
  await page.click('[data-testid=ob-go]');
  await page.waitForSelector('.nav');
  if (!sabbath) {
    await page.evaluate(() => {
      const A = globalThis.__ACHIEVE;
      A.state.settings.sabbathEnabled = false;
    });
  }
}

/** Name an identity (the Be step), dismissing the Why modal that follows. */
export async function nameIdentity(page, statement = 'I am a man who trains before sunrise') {
  await page.click('[data-testid=nav-identity]');
  await page.click('[data-testid=btn-new-identity]');
  await page.fill('[data-testid=id-statement]', statement);
  await page.click('[data-testid=identity-save]');
  await page.waitForSelector('[data-testid=why-text]');
}

export async function sealWhy(page, text = 'Because my father died young and I refuse to leave my kids the same way.') {
  await page.fill('[data-testid=why-text]', text);
  await page.click('[data-testid=why-save]');
  await page.waitForSelector('[data-testid=why-text]', { state: 'detached' });
}

/** Create a stone by description and pass the WOOP gate. */
/** Load the uploaded vision board as Stones. */
export async function seedBoard(page) {
  await page.click('[data-testid=nav-vision]');
  await page.click('[data-testid=btn-seed]');
  await page.waitForTimeout(400);
}

export async function makeStone(page, {
  title = 'Run the half marathon',
  outcome = 'I cross the line strong and my kids are watching from the rail',
  obstacle = 'I tell myself I am too tired and I open my phone instead',
  plan = 'When I reach for my phone after dinner, I will put on my shoes at the front door',
} = {}) {
  await page.click('[data-testid=nav-vision]');
  await page.click('[data-testid=btn-describe]');
  await page.fill('[data-testid=s-title]', title);
  await page.click('[data-testid=stone-save]');
  await page.waitForSelector('[data-testid=woop-outcome]');
  await page.fill('[data-testid=woop-outcome]', outcome);
  await page.fill('[data-testid=woop-obstacle]', obstacle);
  await page.fill('[data-testid=woop-plan]', plan);
  await page.click('[data-testid=woop-save]');
  await page.waitForSelector('[data-testid=q-cue]');
}

/** Fill the quest composer that opens right after a WOOP save. */
export async function writeQuest(page, {
  cue = 'I finish breakfast',
  action = 'run for twenty minutes',
  place = 'the park',
  level = null,
} = {}) {
  await page.fill('[data-testid=q-cue]', cue);
  await page.fill('[data-testid=q-action]', action);
  await page.fill('[data-testid=q-place]', place);
  if (level) await page.selectOption('[data-testid=q-level]', String(level));
  await page.click('[data-testid=quest-save]');
  await page.waitForSelector('[data-testid=q-cue]', { state: 'detached' });
}

/**
 * Complete the current step, dismissing the Manna modal if it fires.
 * Manna drops on a variable-ratio roll, so this is non-deterministic by
 * design — a test that assumed it never appears would be flaky ~25% of runs.
 */
export async function completeStep(page) {
  await page.click('[data-testid=btn-complete]');
  await page.waitForTimeout(350);
  const modal = await page.locator('.modal-bg').count();
  if (modal) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }
}

/** Read the app's internal state out of the page. */
export function readAppState(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(globalThis.__ACHIEVE.state)));
}

export function readVault(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(globalThis.__ACHIEVE.vault)));
}

/** Assert nothing blew up in the browser. */
export function assertNoErrors(page, assert, label = '') {
  const real = page.errors.filter((e) => !/favicon|net::ERR_FILE_NOT_FOUND/.test(e));
  assert.deepEqual(real, [], `page errors ${label}: ${real.join(' | ')}`);
}
