/** Drive the app into a realistic state and screenshot every view. */
import { mkdirSync } from 'node:fs';
import {
  newPage, closeBrowser, onboard, nameIdentity, sealWhy,
  makeStone, writeQuest, completeStep,
} from '../tests/e2e/helpers.mjs';

const out = process.argv[2] || '/tmp/claude-0/-home-user-GAME-Achieve/d8513491-19ee-5cc7-a14c-0c1f27d24968/scratchpad/shots';
mkdirSync(out, { recursive: true });

const page = await newPage({ geo: { latitude: 34.0522, longitude: -118.2437 } });
await page.setViewportSize({ width: 460, height: 1000 });

await page.screenshot({ path: `${out}/01-onboarding.png`, fullPage: true });

await onboard(page, 'Sam');
await nameIdentity(page, 'I am a man who trains before sunrise');
await sealWhy(page, 'Because my father died at 54 and I refuse to leave my kids the same way.');

// A second identity in another territory.
await page.click('[data-testid=btn-new-identity]');
await page.fill('[data-testid=id-statement]', 'I am a woman who ships work she is proud of every week');
await page.selectOption('[data-testid=id-domain]', 'craft');
await page.click('[data-testid=identity-save]');
await page.waitForSelector('[data-testid=why-text]');
await page.keyboard.press('Escape');

await page.screenshot({ path: `${out}/02-identity.png`, fullPage: true });

await makeStone(page);
await writeQuest(page, { cue: 'I finish breakfast', action: 'run for twenty minutes', place: 'the park', level: 1 });

// A second stone so the maps and chart have something to show.
await page.click('[data-testid=nav-vision]');
await page.click('[data-testid=btn-describe]');
await page.fill('[data-testid=s-title]', 'The studio with north light');
await page.selectOption('[data-testid=s-domain]', 'craft');
await page.click('[data-testid=stone-save]');
await page.waitForSelector('[data-testid=woop-outcome]');
await page.fill('[data-testid=woop-outcome]', 'I walk in at 7am and the light is already good and the work is waiting');
await page.fill('[data-testid=woop-obstacle]', 'I decide I am not in the mood and I clean the kitchen instead');
await page.fill('[data-testid=woop-plan]', 'When I catch myself tidying, I will set a 25 minute timer at the desk');
await page.click('[data-testid=woop-save]');
await page.waitForSelector('[data-testid=q-cue]');
await writeQuest(page, { cue: 'I sit down after dinner', action: 'draw for twenty five minutes', place: 'the desk', level: 2 });

await page.click('[data-testid=nav-vision]');
await page.screenshot({ path: `${out}/03-vision.png`, fullPage: true });

// Backdate some history so the growth chart has a real curve.
await page.evaluate(() => {
  const A = globalThis.__ACHIEVE;
  const day = (d) => { const x = new Date(); x.setDate(x.getDate() - d);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const id = A.state.identities[0].id;
  const stone = A.state.stones[0].id;
  for (let d = 40; d >= 1; d--) {
    if (d % 7 === 3) continue; // a couple of real misses
    const ts = Date.now() - d * 86400000;
    A.state.quests.push({
      id: 'seed_' + d, stoneId: stone, identityId: id,
      text: 'When I finish breakfast, I will run at the park',
      level: 2, sealed: false, createdAt: ts, completedAt: ts, attempts: 0, archived: false,
    });
    A.state.votes.push({ id: 'v_' + d, identityId: id, questId: 'seed_' + d, day: day(d), for: true, ts });
  }
  A.state.pings.push(
    { id: 'p1', kind: 'ebenezer', lat: 34.0522, lng: -118.2437, label: 'Where I started', note: '', day: day(40), ts: Date.now() - 40 * 86400000 },
    { id: 'p2', kind: 'quest', lat: 34.0610, lng: -118.2500, label: 'The park', note: '', day: day(20), ts: Date.now() - 20 * 86400000 },
    { id: 'p3', kind: 'ebenezer', lat: 34.0455, lng: -118.2340, label: 'First 10k', note: '', day: day(2), ts: Date.now() - 2 * 86400000 },
  );
  globalThis.__ACHIEVE_persist?.();
});
await page.click('[data-testid=nav-today]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/04-today.png`, fullPage: true });

await page.click('[data-testid=nav-growth]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/05-growth.png`, fullPage: true });

await page.click('[data-testid=nav-map]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/06-map-land.png`, fullPage: true });
await page.click('[data-testid=tab-earth]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/07-map-earth.png`, fullPage: true });

await page.click('[data-testid=nav-circle]');
await page.click('[data-testid=btn-circle-create]');
await page.waitForTimeout(250);
await page.fill('[data-testid=chat-input]', 'Ran before sunrise. Cold but done.');
await page.click('[data-testid=chat-send]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/08-circle.png`, fullPage: true });

await page.click('[data-testid=nav-chronicle]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/09-chronicle.png`, fullPage: true });

await page.click('[data-testid=nav-codex]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/10-codex.png`, fullPage: true });

// The WOOP gate modal.
await page.click('[data-testid=nav-vision]');
await page.waitForTimeout(150);
await page.locator('[data-testid=btn-open-stone]').first().click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/11-woop.png`, fullPage: true });

console.log('shots written to ' + out);
await closeBrowser();
