/**
 * Render the character at several stages and clip the hero panel, so the
 * figure can actually be looked at rather than assumed.
 */
import { mkdirSync } from 'node:fs';
import { newPage, closeBrowser, onboard } from '../tests/e2e/helpers.mjs';

const out = process.argv[2] || '/tmp/claude-0/-home-user-GAME-Achieve/d8513491-19ee-5cc7-a14c-0c1f27d24968/scratchpad/char';
mkdirSync(out, { recursive: true });

const STAGES = [
  ['a-ember', 0],
  ['b-lamp', 8],
  ['c-runner', 40],
  ['d-steward', 260],
  ['e-elder', 900],
];

const page = await newPage();
await page.setViewportSize({ width: 460, height: 1000 });
await onboard(page, 'Niolo');

for (const [label, deedCount] of STAGES) {
  await page.evaluate((n) => {
    const A = globalThis.__ACHIEVE;
    const day = (d) => { const x = new Date(); x.setDate(x.getDate() - d);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    const doms = ['faith', 'family', 'enterprise', 'body', 'global', 'brotherhood'];
    A.state.deeds = [];
    for (let i = 0; i < n; i++) {
      A.state.deeds.push({
        id: 'seed_d' + i, text: 'Work done', domain: doms[i % doms.length],
        identityId: null, size: 'real', xp: 25, day: day(i % 9), ts: Date.now() - i * 3600e3,
      });
    }
    A.state.votes = [];
    for (let d = 19; d >= 0; d--) {
      A.state.votes.push({ id: 'v' + d, identityId: null, questId: null, day: day(d), for: true, ts: Date.now() - d * 86400e3 });
    }
  }, deedCount);

  // Nav round-trip forces a re-render from the mutated state.
  await page.click('[data-testid=nav-growth]');
  await page.click('[data-testid=nav-today]');
  await page.waitForTimeout(500);
  const panel = page.locator('[data-testid=character]');
  await panel.screenshot({ path: `${out}/7-${label}.png` });
  const title = await page.locator('.char-stage').first().innerText().catch(() => '?');
  console.log(`${label} (${deedCount} deeds) → ${title.replace(/\n/g, ' ')}`);
}

await closeBrowser();
