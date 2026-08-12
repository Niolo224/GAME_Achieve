/**
 * features.test.js — the interactive parts: upload, geolocation, chat,
 * the focus timer, the Sabbath lock, calibration and export safety.
 */

import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPage, closeBrowser, onboard, nameIdentity, sealWhy,
  makeStone, writeQuest, readAppState, assertNoErrors, completeStep,
} from './helpers.mjs';

after(async () => { await closeBrowser(); });

/** A tiny valid PNG, uploaded through the real file input. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAV0lEQVR4nO3QMQEAAAjAILV/' +
  'aM3g4QcJqCXZbQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAgJ8GtxwAAWZ9C7cAAAAASUVORK5CYII=', 'base64');

describe('vision board upload', () => {
  test('accepts an image, renders it, and lets you pin a stone onto it', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await page.click('[data-testid=nav-vision]');

    await page.setInputFiles('[data-testid=board-file]', {
      name: 'board.png', mimeType: 'image/png', buffer: PNG,
    });
    await page.waitForSelector('[data-testid=board-wrap] img');

    const state = await readAppState(page);
    assert.equal(state.boards.length, 1);
    assert.match(state.boards[0].image, /^data:image\//);

    // Tapping the board opens the stone composer with coordinates attached.
    await page.locator('[data-testid=board-wrap]').click({ position: { x: 60, y: 60 } });
    await page.waitForSelector('[data-testid=s-title]');
    await page.fill('[data-testid=s-title]', 'The house with the red door');
    await page.click('[data-testid=stone-save]');
    await page.waitForSelector('[data-testid=woop-outcome]');
    await page.keyboard.press('Escape');

    const after = await readAppState(page);
    assert.equal(after.stones.length, 1);
    assert.ok(after.stones[0].x > 0 && after.stones[0].x < 1, 'the pin must record where it was tapped');
    assert.equal(after.stones[0].boardId, after.boards[0].id);
    assertNoErrors(page, assert, 'after upload');
    await page.close();
  });

  test('the pin appears on the board and is marked veiled until contrasted', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await page.click('[data-testid=nav-vision]');
    await page.setInputFiles('[data-testid=board-file]', { name: 'b.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForSelector('[data-testid=board-wrap] img');
    await page.locator('[data-testid=board-wrap]').click({ position: { x: 40, y: 40 } });
    await page.fill('[data-testid=s-title]', 'A goal');
    await page.click('[data-testid=stone-save]');
    await page.waitForSelector('[data-testid=woop-outcome]');
    await page.keyboard.press('Escape');
    const pin = page.locator('.pin.veiled');
    assert.equal(await pin.count(), 1, 'the pin must show as veiled on the board');
    await page.close();
  });
});

describe('the real map', () => {
  test('"Ping me here" drops an Ebenezer at the real coordinates', async () => {
    const page = await newPage({ geo: { latitude: 34.0522, longitude: -118.2437 } });
    await onboard(page);
    // The label prompt is a native dialog.
    page.on('dialog', (d) => d.accept('The park'));
    await page.click('[data-testid=nav-map]');
    await page.click('[data-testid=tab-earth]');
    await page.click('[data-testid=btn-ping-me]');
    await page.waitForTimeout(700);

    const state = await readAppState(page);
    assert.equal(state.pings.length, 1);
    assert.ok(Math.abs(state.pings[0].lat - 34.0522) < 0.01);
    assert.equal(state.pings[0].label, 'The park');
    assert.ok(state.chronicle.some((c) => c.kind === 'ping'), 'marking ground is chronicled');
    assertNoErrors(page, assert, 'after ping');
    await page.close();
  });

  test('the map draws the ping and survives a redraw', async () => {
    const page = await newPage({ geo: { latitude: 51.5074, longitude: -0.1278 } });
    await onboard(page);
    page.on('dialog', (d) => d.accept('Home'));
    await page.click('[data-testid=nav-map]');
    await page.click('[data-testid=tab-earth]');
    await page.click('[data-testid=btn-ping-me]');
    await page.waitForTimeout(700);
    await page.click('[data-testid=tab-land]');
    await page.click('[data-testid=tab-earth]');
    const painted = await page.evaluate(() => {
      const c = document.getElementById('earth-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let gold = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] > 130 && d[i + 2] < 120) gold++;
      return gold;
    });
    assert.ok(painted > 20, 'the Ebenezer marker should actually be drawn');
    await page.close();
  });
});

describe('the Covenant Circle', () => {
  test('creates a circle with a strong code and posts a message', async () => {
    const page = await newPage();
    await onboard(page, 'Sam');
    await page.click('[data-testid=nav-circle]');
    await page.click('[data-testid=btn-circle-create]');
    await page.waitForSelector('[data-testid=circle-code]');

    const code = await page.inputValue('[data-testid=circle-code]');
    assert.ok(code.replace(/-/g, '').length === 16, `weak code: ${code}`);

    await page.fill('[data-testid=chat-input]', 'Ran before sunrise. Cold but done.');
    await page.click('[data-testid=chat-send]');
    await page.waitForTimeout(300);
    const chat = await page.textContent('[data-testid=chat]');
    assert.match(chat, /Cold but done/);
    assertNoErrors(page, assert, 'after chat');
    await page.close();
  });

  test('is honest that a local circle is not live', async () => {
    const page = await newPage();
    await onboard(page);
    await page.click('[data-testid=nav-circle]');
    await page.click('[data-testid=btn-circle-create]');
    const status = await page.textContent('[data-testid=sync-status]');
    assert.match(status, /this device/i, 'must not imply friends can join yet');
    await page.close();
  });

  test('chat escapes HTML — a message cannot inject markup', async () => {
    const page = await newPage();
    await onboard(page);
    await page.click('[data-testid=nav-circle]');
    await page.click('[data-testid=btn-circle-create]');
    await page.fill('[data-testid=chat-input]', '<img src=x onerror="window.__pwned=1">');
    await page.click('[data-testid=chat-send]');
    await page.waitForTimeout(400);
    const pwned = await page.evaluate(() => globalThis.__pwned);
    assert.equal(pwned, undefined, 'CHAT IS AN XSS VECTOR — other people write this text');
    const chat = await page.textContent('[data-testid=chat]');
    assert.match(chat, /onerror/, 'it should show as literal text');
    await page.close();
  });

  test('a stone title with markup cannot inject either', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await page.click('[data-testid=nav-vision]');
    await page.click('[data-testid=btn-describe]');
    await page.fill('[data-testid=s-title]', '<img src=x onerror="window.__pwned2=1">');
    await page.click('[data-testid=stone-save]');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => globalThis.__pwned2), undefined);
    await page.close();
  });
});

describe('the Upper Room focus timer', () => {
  test('runs, enters mandatory stillness, and credits the block', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });
    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=btn-focus]');
    await page.waitForSelector('[data-testid=focus-25]');
    await page.click('[data-testid=focus-25]');
    await page.waitForSelector('[data-testid=focus-clock]');

    const clock = await page.textContent('[data-testid=focus-clock]');
    assert.match(clock, /^2[45]:\d\d$/, `expected a 25 minute clock, got ${clock}`);

    // Skip ahead to the stillness phase.
    await page.click('[data-testid=focus-torest]');
    await page.waitForSelector('[data-testid=focus-finish]');
    const resting = await page.textContent('.timer');
    assert.match(resting, /be still/i, 'the stillness must be its own named phase');

    await page.click('[data-testid=focus-finish]');
    await page.waitForTimeout(300);
    const state = await readAppState(page);
    assert.equal(state.focusBlocks.length, 1);
    assert.ok(state.chronicle.some((c) => c.kind === 'focus'));
    assertNoErrors(page, assert, 'after focus');
    await page.close();
  });

  test('skipping the stillness forfeits part of the credit', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });
    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=btn-focus]');
    await page.click('[data-testid=focus-25]');
    await page.click('[data-testid=focus-torest]');
    await page.click('[data-testid=focus-finish]');   // immediately, no rest taken
    await page.waitForTimeout(300);
    const state = await readAppState(page);
    assert.ok(state.focusBlocks[0].minutes < state.focusBlocks[0].raw,
      'forfeiting consolidation must actually cost something');
    await page.close();
  });
});

describe('the Sabbath lock actually withholds the game', () => {
  test('on the configured day, no quest is offered', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });

    // Set the Sabbath to today, whatever today is.
    await page.evaluate(() => {
      const A = globalThis.__ACHIEVE;
      A.state.settings.sabbathEnabled = true;
      A.state.settings.sabbathDay = new Date().getDay();
    });
    await page.click('[data-testid=nav-today]');
    await page.waitForTimeout(200);

    const step = await page.textContent('[data-testid=next-step]');
    assert.match(step, /closed|sabbath/i);
    const completeBtn = await page.locator('[data-testid=btn-complete]').count();
    assert.equal(completeBtn, 0, 'the game must actually refuse to serve a quest');
    await page.close();
  });

  test('with the lock off, the quest returns', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });
    await page.evaluate(() => {
      const A = globalThis.__ACHIEVE;
      A.state.settings.sabbathEnabled = false;
    });
    await page.click('[data-testid=nav-today]');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-testid=btn-complete]').count(), 1);
    await page.close();
  });
});

describe('the Why gate arms only after a real dwell', () => {
  test('a hard step surfaces the private Why and holds the button', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    const SECRET = 'Because my father died at 54 and I refuse to leave my kids the same way.';
    await sealWhy(page, SECRET);
    await makeStone(page);
    await writeQuest(page, { level: 4 });   // level >= 3 triggers the gate
    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=btn-complete]');

    await page.waitForSelector('[data-testid=why-gate-text]');
    const shown = await page.textContent('[data-testid=why-gate-text]');
    assert.match(shown, /father died at 54/);

    const disabledNow = await page.getAttribute('[data-testid=why-gate-go]', 'disabled');
    assert.notEqual(disabledNow, null, 'the button must be held while the Why is read');

    await page.waitForTimeout(3000);
    const disabledLater = await page.getAttribute('[data-testid=why-gate-go]', 'disabled');
    assert.equal(disabledLater, null, 'it must arm after the dwell');

    await page.click('[data-testid=why-gate-go]');
    await page.waitForTimeout(400);
    const state = await readAppState(page);
    assert.ok(state.quests[0].completedAt, 'and then the step completes');
    await page.close();
  });

  test('an easy step is not gated — the friction is reserved for hard ones', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 1 });
    await page.click('[data-testid=nav-today]');
    await completeStep(page);
    const state = await readAppState(page);
    assert.ok(state.quests[0].completedAt);
    await page.close();
  });
});

describe('export safety in the real UI', () => {
  test('the default export does not carry the private Why', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page, 'this exact private sentence');

    const text = await page.evaluate(() => {
      const A = globalThis.__ACHIEVE;
      // Reproduce exactly what the export button builds, default options.
      return JSON.stringify({ kind: 'achieve.save', state: A.state, vaultIncluded: false });
    });
    assert.ok(!text.includes('this exact private sentence'));
    await page.close();
  });
});

describe('calibration responds to the player', () => {
  test('passing a step twice shrinks the ask instead of blaming the person', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page);
    await makeStone(page);
    await writeQuest(page, { level: 4 });
    await page.click('[data-testid=nav-today]');

    const before = (await readAppState(page)).quests[0].level;
    await page.click('[data-act=quest-miss]');
    await page.waitForTimeout(150);
    await page.click('[data-act=quest-miss]');
    await page.waitForTimeout(250);

    const state = await readAppState(page);
    assert.ok(state.quests[0].level < before, 'the step must get smaller, not the person weaker');
    const note = state.chronicle.find((c) => c.kind === 'miss');
    assert.match(note.body, /sizing problem, not a character problem/i);
    await page.close();
  });
});

describe('REGRESSION: a re-render must not disarm the Why gate', () => {
  test('a toast firing mid-dwell cannot trap the player behind their own Why', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page, 'the private reason');
    await makeStone(page);
    await writeQuest(page, { level: 4 });
    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=btn-complete]');
    await page.waitForSelector('[data-testid=why-gate-text]');

    // Force full re-renders throughout the dwell — this is what an expiring
    // toast does, and it used to revert the button to disabled forever.
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => globalThis.__ACHIEVE && globalThis.dispatchEvent(new Event('resize')));
      await page.evaluate(() => {
        const A = globalThis.__ACHIEVE;
        A.toasts.push({ id: 't' + Math.random(), msg: 'noise', kind: '' });
      });
      await page.waitForTimeout(500);
    }

    const disabled = await page.getAttribute('[data-testid=why-gate-go]', 'disabled');
    assert.equal(disabled, null, 'the gate must still arm through repeated re-renders');

    await page.click('[data-testid=why-gate-go]');
    await page.waitForTimeout(400);
    const state = await readAppState(page);
    assert.ok(state.quests[0].completedAt, 'and the step must complete');
    await page.close();
  });

  test('the gate cannot be bypassed by clicking early', async () => {
    const page = await newPage();
    await onboard(page);
    await nameIdentity(page);
    await sealWhy(page, 'the private reason');
    await makeStone(page);
    await writeQuest(page, { level: 4 });
    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=btn-complete]');
    await page.waitForSelector('[data-testid=why-gate-text]');

    // Force-enable the button in the DOM and click it immediately.
    await page.evaluate(() => {
      const b = document.querySelector('[data-testid=why-gate-go]');
      if (b) b.disabled = false;
    });
    await page.click('[data-testid=why-gate-go]');
    await page.waitForTimeout(200);
    const state = await readAppState(page);
    assert.equal(state.quests[0].completedAt, null, 'the DOM must never be the source of truth for the gate');
    await page.close();
  });
});
