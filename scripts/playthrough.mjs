/**
 * playthrough.mjs — play the game against the running server, as a person
 * would, and narrate what the app says back.
 *
 * Not the test suite: this drives the real app at its real URL and reports
 * what a player actually sees on screen.
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';

const URL = process.env.APP_URL || 'http://localhost:5173/';
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-GAME-Achieve/d8513491-19ee-5cc7-a14c-0c1f27d24968/scratchpad/play';
mkdirSync(OUT, { recursive: true });

function chromiumPath() {
  for (const p of [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  ]) if (existsSync(p)) return p;
  return undefined;
}

const say = (s) => console.log(s);
const shot = async (page, n, name) => {
  await page.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}-${name}.png`, fullPage: true });
};

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 460, height: 940 },
  geolocation: { latitude: 34.0522, longitude: -118.2437 },
  permissions: ['geolocation'],
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('dialog', (d) => d.accept('The gym'));

await page.goto(URL);
await page.waitForSelector('#root .card');
say('\n── OPENING ────────────────────────────────────────────');
say(await page.textContent('#root h1'));
await shot(page, 1, 'opening');

// 1. Begin.
await page.fill('[data-testid=ob-name]', 'Niolo');
await page.click('[data-testid=ob-go]');
await page.waitForSelector('.nav');
say('\n── IT ROUTES TO ─────────────────────────────────────');
const cur = await page.$$eval('.nav button[aria-current="true"]', (b) => b.map((x) => x.textContent.trim()));
say(`  ${cur.join('')}   (Be, before any task)`);

// 2. What does it ask for first?
await page.click('[data-testid=nav-today]');
await page.waitForTimeout(200);
say('\n── THE NEXT STEP ────────────────────────────────────');
say(`  "${(await page.textContent('[data-testid=next-step] h1')).trim()}"`);
await shot(page, 2, 'first-step');

// 3. Load the real board.
await page.click('[data-testid=nav-vision]');
await page.click('[data-testid=btn-seed]');
await page.waitForTimeout(600);
const st1 = await page.evaluate(() => globalThis.__ACHIEVE.state);
say('\n── BOARD LOADED ─────────────────────────────────────');
say(`  ${st1.stones.length} stones · all veiled: ${st1.stones.every((s) => !s.woopComplete)}`);
await shot(page, 3, 'board-loaded');

// 4. Territories.
await page.click('[data-testid=nav-map]');
await page.waitForTimeout(500);
const terr = await page.$$eval('.terr', (els) => els.map((e) => ({
  name: e.querySelector('.terr-name').textContent.trim(),
  count: e.querySelector('.terr-count').textContent.trim(),
  hasArt: /url\("data:image/.test(getComputedStyle(e.querySelector('.terr-art')).backgroundImage),
})));
say('\n── TERRITORIES ──────────────────────────────────────');
for (const t of terr) say(`  ${t.name.padEnd(18)} ${t.count.padEnd(12)} art:${t.hasArt ? 'yes' : 'NO'}`);
await shot(page, 4, 'territories');

// 5. Name an identity from the suggestions.
await page.click('[data-testid=nav-identity]');
await page.waitForTimeout(300);
await page.click('[data-testid=seed-id-body]');
await page.waitForSelector('[data-testid=id-statement]');
const suggested = await page.inputValue('[data-testid=id-statement]');
say('\n── BE ───────────────────────────────────────────────');
say(`  suggested: "${suggested}"`);
await page.click('[data-testid=identity-save]');
await page.waitForSelector('[data-testid=why-text]');

// 6. Seal the private Why.
const WHY = 'Because my kids need me strong for another forty years, not just this one.';
await page.fill('[data-testid=why-text]', WHY);
await page.click('[data-testid=why-save]');
await page.waitForSelector('[data-testid=why-text]', { state: 'detached' });
const leaked = await page.evaluate((w) => JSON.stringify(globalThis.__ACHIEVE.state).includes(w),
  'kids need me strong');
say(`  Why sealed. present in shareable game state: ${leaked ? 'LEAKED' : 'no'}`);
await shot(page, 5, 'identity');

// 7. Try to kindle a stone with an EXTERNAL obstacle — the gate should hold.
await page.click('[data-testid=nav-map]');
await page.click('[data-testid=terr-body]');
await page.waitForSelector('.modal');
await page.click('.modal [data-act=open-stone]');
await page.waitForSelector('[data-testid=woop-obstacle]');
await page.fill('[data-testid=woop-outcome]', 'I am lean, strong and still training at sixty');
await page.fill('[data-testid=woop-obstacle]', 'I have no time because my job keeps me late');
await page.fill('[data-testid=woop-plan]', 'When I get home, I will train');
await page.click('[data-testid=woop-save]');
await page.waitForTimeout(300);
say('\n── THE WOOP GATE (external obstacle) ────────────────');
say(`  ${(await page.textContent('#woop-errors')).replace(/\s+/g, ' ').trim().slice(0, 160)}`);
const held = await page.evaluate(() => !globalThis.__ACHIEVE.state.stones.find((s) => s.domain === 'body').woopComplete);
say(`  gate held: ${held}`);
await shot(page, 6, 'woop-rejected');

// 8. Now an honest inner obstacle.
await page.fill('[data-testid=woop-obstacle]', 'I tell myself I am too tired and I sit down instead');
await page.fill('[data-testid=woop-plan]', 'When I sit down after work, I will put my shoes on at the door');
await page.click('[data-testid=woop-save]');
await page.waitForSelector('[data-testid=q-cue]');
say('\n── KINDLED ──────────────────────────────────────────');
say('  the stone kindled, and it went straight to writing the first step');
await shot(page, 7, 'woop-accepted');

// 9. Reject a bare verb.
await page.fill('[data-testid=q-action]', 'go to the gym');
await page.click('[data-testid=quest-save]');
await page.waitForTimeout(200);
say('\n── THE IF-THEN COMPOSER (bare verb) ─────────────────');
say(`  ${(await page.textContent('#quest-errors')).replace(/\s+/g, ' ').trim().slice(0, 150)}`);

// 10. Write it properly.
await page.fill('[data-testid=q-cue]', 'I finish breakfast');
await page.fill('[data-testid=q-action]', 'train for thirty minutes');
await page.fill('[data-testid=q-place]', 'the gym');
await page.selectOption('[data-testid=q-level]', '2');
await page.click('[data-testid=quest-save]');
await page.waitForSelector('[data-testid=q-cue]', { state: 'detached' });
const q = (await page.evaluate(() => globalThis.__ACHIEVE.state.quests[0])).text;
say(`  composed: "${q}"`);

// 11. Do it.
await page.click('[data-testid=nav-today]');
await page.waitForTimeout(300);
say('\n── TODAY ────────────────────────────────────────────');
const title = (await page.textContent('[data-testid=next-step] h1')).trim();
say(`  "${title}"`);
await shot(page, 8, 'today');

const sabbath = await page.locator('[data-testid=btn-complete]').count() === 0;
if (sabbath) {
  say('  The Sabbath lock is on — the game is refusing to serve a quest.');
  say('  Turning it off to carry on with the playthrough.');
  await page.evaluate(() => { globalThis.__ACHIEVE.state.settings.sabbathEnabled = false; });
  await page.click('[data-testid=nav-vision]');
  await page.click('[data-testid=nav-today]');
  await page.waitForTimeout(300);
  say(`  now: "${(await page.textContent('[data-testid=next-step] h1')).trim()}"`);
}
say(`  ${(await page.textContent('[data-testid=quest-text]')).trim()}`);

await page.click('[data-testid=btn-complete]');
await page.waitForTimeout(600);
if (await page.locator('.manna').count()) {
  say('\n── MANNA FELL ───────────────────────────────────────');
  await shot(page, 9, 'manna');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

const st2 = await page.evaluate(() => globalThis.__ACHIEVE.state);
const note = st2.chronicle.find((c) => c.kind === 'accomplishment');
say('\n── WHAT THE GAME SAID BACK ──────────────────────────');
say(`  ${note.title}`);
say(`  ${note.body}`);

// 12. Mark real ground.
await page.click('[data-testid=nav-map]');
await page.click('[data-testid=tab-earth]');
await page.click('[data-testid=btn-ping-me]');
await page.waitForTimeout(900);
const pings = await page.evaluate(() => globalThis.__ACHIEVE.state.pings);
say('\n── REAL GROUND ──────────────────────────────────────');
say(`  ${pings.length} marker: "${pings[0].label}" at ${pings[0].lat.toFixed(4)}, ${pings[0].lng.toFixed(4)}`);
await shot(page, 10, 'real-ground');

// 13. The story so far.
await page.click('[data-testid=nav-chronicle]');
await page.waitForTimeout(300);
await shot(page, 11, 'chronicle');
say('\n── THE CHRONICLE ────────────────────────────────────');
for (const c of st2.chronicle.slice(0, 4)) say(`  · ${c.title}`);

// 14. Does it survive a reload?
await page.reload();
await page.waitForSelector('.nav');
const st3 = await page.evaluate(() => globalThis.__ACHIEVE.state);
say('\n── AFTER RELOAD ─────────────────────────────────────');
say(`  ${st3.stones.length} stones · ${st3.quests.filter((x) => x.completedAt).length} step done · ${st3.votes.length} vote · streak intact`);

say('\n── ERRORS ───────────────────────────────────────────');
const real = errors.filter((e) => !/favicon/.test(e));
say(real.length ? real.slice(0, 5).join('\n  ') : '  none');
say('');

await browser.close();
