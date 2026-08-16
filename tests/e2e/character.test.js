/**
 * character.test.js — the figure, and the place you put what you did.
 *
 * These cover the answer to "where are the visuals / where do I track what I
 * accomplished": a drawn character at the top of the day, and a log button
 * that turns something you actually did into XP, a lit territory, and a line
 * in the Chronicle.
 */

import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPage, closeBrowser, onboard, nameIdentity, sealWhy,
  readAppState, assertNoErrors,
} from './helpers.mjs';

after(async () => { await closeBrowser(); });

/** How many pixels of the avatar canvas are actually lit, on one frame. */
function litOnce(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('avatar-canvas');
    if (!cv) return -1;
    const g = cv.getContext('2d');
    const { data } = g.getImageData(0, 0, cv.width, cv.height);
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 8 && (data[i] + data[i + 1] + data[i + 2]) > 40) lit++;
    }
    return lit;
  });
}

/**
 * The avatar animates, so a single frame is a noisy sample. Take the
 * brightest of several.
 */
async function litPixels(page, frames = 5) {
  let best = -1;
  for (let i = 0; i < frames; i++) {
    best = Math.max(best, await litOnce(page));
    await page.waitForTimeout(120);
  }
  return best;
}

/**
 * Wait until the avatar has actually been painted, rather than assuming a
 * fixed delay was long enough. Under a full-suite run the machine is busy and
 * a hard-coded wait is a coin flip.
 */
async function waitForPaintedAvatar(page, min = 5000, timeout = 10000) {
  const started = Date.now();
  let lit = -1;
  while (Date.now() - started < timeout) {
    lit = await litOnce(page);
    if (lit > min) return lit;
    await page.waitForTimeout(100);
  }
  return lit;
}

/** A cheap fingerprint of what the canvas is currently showing. */
function canvasHash(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('avatar-canvas');
    if (!cv) return null;
    const g = cv.getContext('2d');
    const { data } = g.getImageData(0, 0, cv.width, cv.height);
    let h = 2166136261;
    for (let i = 0; i < data.length; i += 97) {
      h ^= data[i];
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  });
}

/** Dismiss whatever modal is on top, and wait until it is really gone. */
async function dismissModal(page) {
  if (await page.locator('.modal-bg').count()) {
    await page.keyboard.press('Escape');
    await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 5000 });
  }
}

/** Log a deed through the real modal. */
async function logDeed(page, { text, domain = 'body', size = 'real' } = {}) {
  await page.click('[data-testid=nav-today]');
  await page.waitForSelector('[data-testid=btn-log-deed]');
  await page.click('[data-testid=btn-log-deed]');
  await page.waitForSelector('[data-testid=d-text]');
  await page.fill('[data-testid=d-text]', text);
  await page.selectOption('[data-testid=d-domain]', domain);
  await page.click(`[data-testid=size-${size}]`);
  await page.click('[data-testid=deed-save]');
  // The composer closes whether or not a level-up modal opens on top of it.
  await page.waitForSelector('[data-testid=d-text]', { state: 'detached' });
  await dismissModal(page);
}

describe('the character panel', () => {
  test('a brand new player meets a drawn figure before any words', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await page.click('[data-testid=nav-today]');
    await page.waitForSelector('[data-testid=character]');

    const lit = await waitForPaintedAvatar(page);
    assert.ok(lit > 5000, `the avatar canvas should be painted, got ${lit} lit pixels`);

    const stage = await page.locator('.char-stage').first().innerText();
    assert.match(stage, /EMBER/i, 'everyone starts at Ember');
    assert.match(stage, /1/, 'and at level 1');

    // The panel sits above the step, not below it.
    const order = await page.evaluate(() => {
      const ch = document.querySelector('[data-testid=character]');
      const step = document.querySelector('[data-testid=btn-complete], .step, [data-testid=step]');
      if (!ch || !step) return 'no-step';
      return ch.compareDocumentPosition(step) & Node.DOCUMENT_POSITION_FOLLOWING ? 'first' : 'later';
    });
    assert.notEqual(order, 'later', 'the figure should come before the words');

    assertNoErrors(page, assert, 'character panel');
  });

  test('shows one vital per territory, all dim until something is done', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await page.click('[data-testid=nav-today]');
    await page.waitForSelector('[data-testid=vitals]');

    const vitals = await page.locator('[data-testid=vitals] .vital').count();
    assert.equal(vitals, 6, 'six territories, six vitals');

    for (const key of ['faith', 'family', 'enterprise', 'body', 'global', 'brotherhood']) {
      await page.waitForSelector(`[data-testid=vital-${key}]`);
      const title = await page.locator(`[data-testid=vital-${key}]`).getAttribute('title');
      assert.match(title, /never tended/, `${key} should say it has never been tended`);
    }
  });

  test('a vital is a door — clicking it opens that territory', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=vital-enterprise]');
    await page.waitForSelector('.modal-bg');
    const body = await page.locator('.modal-bg').innerText();
    assert.match(body, /Enterprise/i);
    assertNoErrors(page, assert, 'territory from vital');
  });
});

describe('logging what you did', () => {
  test('a logged deed becomes XP, a lit territory, and a Chronicle entry', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await logDeed(page, { text: 'Trained legs for forty minutes', domain: 'body', size: 'real' });

    const state = await readAppState(page);
    assert.equal(state.deeds.length, 1);
    assert.equal(state.deeds[0].domain, 'body');
    assert.equal(state.deeds[0].xp, 25);
    assert.equal(state.deeds[0].text, 'Trained legs for forty minutes');

    const entry = state.chronicle.find((c) => c.kind === 'deed');
    assert.ok(entry, 'nothing completes silently — it should be in the Chronicle');
    assert.match(entry.title, /Trained legs/);

    // And the territory it fed is now lit rather than at the floor.
    const title = await page.locator('[data-testid=vital-body]').getAttribute('title');
    assert.match(title, /tended today/);

    assertNoErrors(page, assert, 'deed logged');
  });

  test('refuses an empty deed instead of logging a blank', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=btn-log-deed]');
    await page.waitForSelector('[data-testid=d-text]');
    await page.click('[data-testid=deed-save]');
    await page.waitForTimeout(200);

    assert.ok(await page.locator('[data-testid=d-text]').count(), 'the composer should stay open');
    const err = await page.locator('#deed-errors').innerText();
    assert.match(err, /Say what you did/);

    const state = await readAppState(page);
    assert.equal(state.deeds.length, 0);
  });

  test('the four sizes are worth what they say they are', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    for (const [size, xp] of [['small', 10], ['real', 25], ['big', 60], ['landmark', 150]]) {
      await logDeed(page, { text: `A ${size} thing`, domain: 'faith', size });
      const state = await readAppState(page);
      assert.equal(state.deeds[0].size, size);
      assert.equal(state.deeds[0].xp, xp, `${size} should be worth ${xp}`);
    }
  });

  test('enough evidence levels the figure and announces the new stage', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await page.click('[data-testid=nav-today]');
    await page.waitForSelector('[data-testid=character]');
    const before = await page.locator('.char-stage').first().innerText();

    // Two landmarks is 300 XP — comfortably past level 1.
    await page.click('[data-testid=btn-log-deed]');
    await page.waitForSelector('[data-testid=d-text]');
    await page.fill('[data-testid=d-text]', 'Signed the lease on the first building');
    await page.selectOption('[data-testid=d-domain]', 'enterprise');
    await page.click('[data-testid=size-landmark]');
    await page.click('[data-testid=deed-save]');
    await page.waitForTimeout(350);

    const modal = await page.locator('.modal-bg').count();
    assert.ok(modal, 'levelling up should be announced, not silent');
    const text = await page.locator('.modal-bg').innerText();
    assert.match(text, /Level \d+/i);
    // Landing on a level inside a stage must not replay the stage blurb —
    // "no evidence yet" to someone who just logged a landmark reads as the
    // game ignoring what they did.
    assert.doesNotMatch(text, /no evidence yet/i, 'the level line should describe the moment');
    assert.match(text, /XP to \w+/, 'and should point at the next thing');
    await dismissModal(page);

    const after = await page.locator('.char-stage').first().innerText();
    assert.notEqual(after, before, 'the figure should have changed');
    assertNoErrors(page, assert, 'level up');
  });

  test('logging against an identity also casts a vote for who you are becoming', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await nameIdentity(page, 'I am a man who trains before sunrise');
    await sealWhy(page);

    await page.click('[data-testid=nav-today]');
    await page.click('[data-testid=btn-log-deed]');
    await page.waitForSelector('[data-testid=d-text]');
    await page.fill('[data-testid=d-text]', 'Ran at 5:40am');
    const identityId = await page.evaluate(() => globalThis.__ACHIEVE.state.identities[0].id);
    await page.selectOption('[data-testid=d-identity]', identityId);
    await page.click('[data-testid=deed-save]');
    await page.waitForSelector('[data-testid=d-text]', { state: 'detached' });
    await dismissModal(page);

    const state = await readAppState(page);
    const vote = state.votes.find((v) => v.identityId === identityId);
    assert.ok(vote, 'a deed done as that person is a vote for that person');
    assert.equal(vote.for, true);
  });

  test('the figure redraws as the game changes rather than freezing on load', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await page.click('[data-testid=nav-today]');
    const litBefore = await waitForPaintedAvatar(page);
    assert.ok(litBefore > 5000, `the canvas should be painted to begin with, got ${litBefore}`);
    const hashBefore = await canvasHash(page);

    // One deed through the real UI: does doing something actually change the
    // picture? Comparing the drawings is the claim; total brightness was a
    // proxy for it, and a noisy one.
    await logDeed(page, { text: 'Trained hard', domain: 'body', size: 'landmark' });
    await page.click('[data-testid=nav-today]');
    const litAfter = await waitForPaintedAvatar(page);
    const hashAfter = await canvasHash(page);

    assert.ok(litAfter > 5000, `the canvas should still be painted, got ${litAfter}`);
    assert.notEqual(hashAfter, hashBefore, 'the figure should not be frozen on its first frame');
    assertNoErrors(page, assert, 'avatar redraw');
  });

  test('a fully tended world draws differently from a neglected one', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await page.click('[data-testid=nav-today]');
    await waitForPaintedAvatar(page);
    const neglected = await canvasHash(page);

    // Injected rather than driven through six UI flows: the claim here is
    // about the DRAWING, and the deed-logging path already has its own tests.
    await page.evaluate(() => {
      const A = globalThis.__ACHIEVE;
      const day = () => { const x = new Date();
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
      for (const d of ['faith', 'family', 'enterprise', 'body', 'global', 'brotherhood']) {
        A.state.deeds.push({ id: 'seed_' + d, text: 'Work', domain: d, identityId: null,
          size: 'landmark', xp: 150, day: day(), ts: Date.now() });
      }
    });
    await page.click('[data-testid=nav-growth]');
    await page.click('[data-testid=nav-today]');
    await waitForPaintedAvatar(page);
    const tended = await canvasHash(page);

    assert.notEqual(tended, neglected, 'six lit territories should not draw the same as none');

    // And the six hills are the six vitals, so every one should now read as
    // tended rather than as never touched.
    for (const key of ['faith', 'family', 'enterprise', 'body', 'global', 'brotherhood']) {
      const title = await page.locator(`[data-testid=vital-${key}]`).getAttribute('title');
      assert.match(title, /tended today/, `${key} should be lit`);
    }
    assertNoErrors(page, assert, 'tended world');
  });

  test('deeds survive a reload — the figure is not rebuilt from nothing', async () => {
    const page = await newPage();
    await onboard(page, 'Niolo');
    await logDeed(page, { text: 'Read to the kids', domain: 'family', size: 'big' });

    await page.reload();
    await page.waitForSelector('[data-testid=character]');
    await page.waitForTimeout(300);

    const state = await readAppState(page);
    assert.equal(state.deeds.length, 1);
    assert.equal(state.deeds[0].text, 'Read to the kids');
    const title = await page.locator('[data-testid=vital-family]').getAttribute('title');
    assert.match(title, /tended today/);
    assertNoErrors(page, assert, 'after reload');
  });
});
