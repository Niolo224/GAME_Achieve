/**
 * flow.test.js — the game played end to end in a real browser.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPage, closeBrowser, onboard, nameIdentity, sealWhy,
  makeStone, writeQuest, readAppState, readVault, assertNoErrors, completeStep,
} from './helpers.mjs';

after(async () => { await closeBrowser(); });

describe('onboarding', () => {
  test('loads, teaches Be>Do>Have, and starts clean', async () => {
    const page = await newPage();
    const body = await page.textContent('#root');
    assert.match(body, /Write the vision/i);
    assert.match(body, /Habakkuk 2:2/);
    assert.match(body, /HAVE\s*→\s*DO\s*→\s*BE/, 'must teach the inversion up front');
    assertNoErrors(page, assert, 'on load');
    await page.close();
  });

  test('entering a name moves you to the identity step, not to tasks', async () => {
    const page = await newPage();
    await onboard(page, 'Sam');
    // Be comes first: the app should route to identity, never to a task list.
    const view = await page.getAttribute('[data-testid=nav-identity]', 'aria-current');
    assert.equal(view, 'true', 'Be must come before Do');
    await page.close();
  });
});

describe('the Be > Do > Have chain is enforced in order', () => {
  test('with no identity, the next step demands a name — not a task', async () => {
    const page = await newPage();
    await onboard(page);
    await page.click('[data-testid=nav-today]');
    const title = await page.textContent('[data-testid=next-step] h1');
    assert.match(title, /who are you becoming/i);
    assert.ok(!/task|to-?do/i.test(title), 'the first thing asked must be an identity, not a task');
    await page.close();
  });

  test('with an identity but no vision, it demands the vision written', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await page.click('[data-testid=nav-today]');
    const step = await page.textContent('[data-testid=next-step]');
    assert.match(step, /write the vision/i);
    await page.close();
  });

  test('a stone stays VEILED until the cost is counted', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await page.click('[data-testid=nav-vision]');
    await page.click('[data-testid=btn-describe]');
    await page.fill('[data-testid=s-title]', 'Buy the house');
    await page.click('[data-testid=stone-save]');
    // The WOOP gate opens immediately; dismiss it without completing.
    await page.waitForSelector('[data-testid=woop-obstacle]');
    await page.keyboard.press('Escape');
    const state = await readAppState(page);
    assert.equal(state.stones.length, 1);
    assert.equal(state.stones[0].woopComplete, false, 'must not be playable yet');
    const html = await page.textContent('#root');
    assert.match(html, /Veiled/i);
    await page.close();
  });
});

describe('the WOOP gate', () => {
  test('rejects an external obstacle and explains why', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await page.click('[data-testid=nav-vision]');
    await page.click('[data-testid=btn-describe]');
    await page.fill('[data-testid=s-title]', 'Start the business');
    await page.click('[data-testid=stone-save]');
    await page.waitForSelector('[data-testid=woop-obstacle]');
    await page.fill('[data-testid=woop-outcome]', 'I am free and providing for my household without fear');
    await page.fill('[data-testid=woop-obstacle]', 'I have no time because my boss keeps me late');
    await page.fill('[data-testid=woop-plan]', 'When I get home, I will open the laptop at the kitchen table');
    await page.click('[data-testid=woop-save]');
    const err = await page.textContent('#woop-errors');
    assert.match(err, /outside you/i);
    const state = await readAppState(page);
    assert.equal(state.stones[0].woopComplete, false, 'the gate must actually hold');
    await page.close();
  });

  test('accepts a properly contrasted WOOP and kindles the stone', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    const state = await readAppState(page);
    assert.equal(state.stones[0].woopComplete, true);
    assert.ok(state.stones[0].woop.obstacle.length > 5);
    assertNoErrors(page, assert, 'after woop');
    await page.close();
  });
});

describe('the quest composer refuses a bare verb', () => {
  test('rejects an action with no cue', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    // The composer is already open. Fill only the action.
    await page.fill('[data-testid=q-action]', 'go to the gym');
    await page.click('[data-testid=quest-save]');
    const err = await page.textContent('#quest-errors');
    assert.ok(err.length > 0, 'must reject an actionless if-then');
    await page.close();
  });

  test('accepts a cue + action and composes a real implementation intention', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page);
    const state = await readAppState(page);
    assert.equal(state.quests.length, 1);
    assert.match(state.quests[0].text, /^When .*, I will .*/);
    assert.match(state.quests[0].text, /at the park/);
    await page.close();
  });
});

describe('completing a step casts a vote for the identity', () => {
  test('reports identity evidence, never "task complete"', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });
    await page.click('[data-testid=nav-today]');
    await completeStep(page);

    const state = await readAppState(page);
    assert.equal(state.votes.length, 1, 'a vote must be recorded');
    assert.equal(state.votes[0].for, true);
    assert.equal(state.quests[0].completedAt !== null, true);

    const chron = state.chronicle.find((c) => c.kind === 'accomplishment');
    assert.ok(chron, 'the Chronicle must note what was accomplished');
    assert.match(chron.title, /evidence says/i, 'must speak to identity, not tasks');
    assertNoErrors(page, assert, 'after completing');
    await page.close();
  });

  test('the stone registers ground taken when all its steps are done', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });
    await page.click('[data-testid=nav-today]');
    await completeStep(page);
    const state = await readAppState(page);
    assert.ok(state.stones[0].completedAt, 'the stone should complete');
    assert.ok(state.chronicle.some((c) => c.kind === 'stone_taken'));
    await page.close();
  });
});

describe('THE PRIVATE WHY', () => {
  test('is stored in a separate vault, never on the game state', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    const SECRET = 'Because my father died young and I refuse to leave my kids the same way.';
    await sealWhy(page, SECRET);

    const state = await readAppState(page);
    const vault = await readVault(page);
    assert.ok(JSON.stringify(vault).includes('father died'), 'the vault holds it');
    assert.ok(!JSON.stringify(state).includes('father died'), 'THE GAME STATE MUST NOT');
    await page.close();
  });

  test('never appears in the snapshot the Circle would receive', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page, 'my most private reason is this exact string');
    const snap = await page.evaluate(() => {
      const A = globalThis.__ACHIEVE;
      return JSON.stringify(A.state);
    });
    assert.ok(!snap.includes('most private reason'));
    await page.close();
  });

  test('lives under a different localStorage key than the game', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page, 'sealed secret content here');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    assert.ok(keys.length >= 2, `expected separate keys, got ${keys}`);
    const gameBlob = await page.evaluate(() => localStorage.getItem('achieve.state.v1'));
    assert.ok(!gameBlob.includes('sealed secret content'), 'must not be in the game blob');
    await page.close();
  });
});

describe('persistence', () => {
  test('survives a reload', async () => {
    const page = await newPage();
    await onboard(page, 'Sam');
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page);
    await page.reload();
    await page.waitForSelector('.nav');
    const state = await readAppState(page);
    assert.equal(state.player.name, 'Sam');
    assert.equal(state.identities.length, 1);
    assert.equal(state.stones.length, 1);
    assert.equal(state.quests.length, 1);
    assertNoErrors(page, assert, 'after reload');
    await page.close();
  });
});

describe('every view renders without throwing', () => {
  test('all nine tabs survive a visit, empty and populated', async () => {
    const page = await newPage();
    await onboard(page);
    const tabs = ['today', 'vision', 'identity', 'map', 'growth', 'circle', 'chronicle', 'codex', 'settings'];

    for (const t of tabs) {
      await page.click(`[data-testid=nav-${t}]`);
      await page.waitForTimeout(90);
      const txt = await page.textContent('#root');
      assert.ok(txt.length > 100, `${t} rendered nothing`);
    }
    assertNoErrors(page, assert, 'empty state tabs');

    // Now populate and sweep again.
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });
    await page.click('[data-testid=nav-today]');
    await completeStep(page);

    for (const t of tabs) {
      await page.click(`[data-testid=nav-${t}]`);
      await page.waitForTimeout(90);
      const txt = await page.textContent('#root');
      assert.ok(txt.length > 100, `${t} rendered nothing when populated`);
    }
    assertNoErrors(page, assert, 'populated tabs');
    await page.close();
  });

  test('both maps render', async () => {
    const page = await newPage();
    await onboard(page);
    await page.click('[data-testid=nav-map]');
    await page.waitForSelector('[data-testid=terr-grid]');
    assert.equal(await page.locator('.terr').count(), 6, 'every territory must appear');

    await page.click('[data-testid=tab-earth]');
    await page.waitForSelector('#earth-canvas');
    const earthPainted = await page.evaluate(() => {
      const c = document.getElementById('earth-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      return d.some((v, i) => i % 4 !== 3 && v > 0);
    });
    assert.ok(earthPainted, 'the real-ground map must paint');
    assertNoErrors(page, assert, 'maps');
    await page.close();
  });
});

describe('the codex is honest', () => {
  test('every principle shows a mechanic and a citation with a year', async () => {
    const page = await newPage();
    await onboard(page);
    await page.click('[data-testid=nav-codex]');
    const count = await page.locator('[data-testid=codex-principle]').count();
    assert.ok(count >= 20, `expected the full registry, got ${count}`);
    const txt = await page.textContent('#root');
    assert.match(txt, /Gollwitzer/);
    assert.match(txt, /Oettingen/);
    assert.match(txt, /Schultz/);
    assert.match(txt, /In this game/);
    await page.close();
  });

  test('the exploitable mechanic carries its ethics warning in the UI', async () => {
    const page = await newPage();
    await onboard(page);
    await page.click('[data-testid=nav-codex]');
    const txt = await page.textContent('#root');
    assert.match(txt, /slot machines/i, 'the variable-ratio ethics note must be visible to the player');
    await page.close();
  });
});
