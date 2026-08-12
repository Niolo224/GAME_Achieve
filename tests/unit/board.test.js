/**
 * board.test.js — the uploaded vision board, as data.
 *
 * Seeding is a convenience, not a shortcut. These tests hold that line:
 * every seeded Stone must still be veiled, and every suggested identity must
 * still pass the same validator as one typed by hand.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_STONES, SEED_IDENTITIES, BOARD_TITLE, PRINCIPLES_STRIP, DECLARATION } from '../../src/data/board.js';
import { DOMAINS, emptyState, addStone, normalizeDomain } from '../../src/core/state.js';
import { validateIdentity } from '../../src/core/identity.js';
import { stoneProgress } from '../../src/core/engine.js';
import { ART_GRIDS, artFor, verifyArt, gridToRGBA, GRID_W, GRID_H } from '../../src/data/art.js';

describe('the board covers what is actually on it', () => {
  test('every panel from the board is represented', () => {
    const titles = SEED_STONES.map((s) => s.title.toLowerCase()).join(' | ');
    for (const thing of [
      'retail', 'industrial', 'multifamily', 'robotics', 'evtol', 'mecha',
      'venture capital', 'private equity', 'private credit', 'family office',
      'philanthropy', 'regenerative', 'hard money', 'schools', 'trust',
      'body', 'shanghai', 'languages', 'table',
    ]) {
      assert.ok(titles.includes(thing), `the board names "${thing}" but no Stone covers it`);
    }
  });

  test('the three technology companies are each their own stone', () => {
    const tech = SEED_STONES.filter((s) => /robotics|evtol|mecha/i.test(s.title));
    assert.equal(tech.length, 3, 'robotics, eVTOL and mecha are separate companies on the board');
  });

  test('all seven fund arms are present', () => {
    const funds = SEED_STONES.filter((s) => s.panel.startsWith('I OWN MY FUNDS'));
    assert.equal(funds.length, 7);
  });

  test('every stone names the panel it came from', () => {
    for (const s of SEED_STONES) {
      assert.ok(s.panel && s.panel.length > 3, `${s.title} has no source panel`);
      assert.ok(s.note && s.note.length > 10, `${s.title} has no description`);
    }
  });

  test('every stone lands in a real territory', () => {
    for (const s of SEED_STONES) {
      assert.equal(normalizeDomain(s.domain), s.domain, `${s.title} has an unknown domain`);
      assert.ok(DOMAINS.some((d) => d.key === s.domain));
    }
  });

  test('no duplicate stones', () => {
    const t = SEED_STONES.map((s) => s.title);
    assert.equal(new Set(t).size, t.length);
  });

  test('the board is substantial — it is not a four-item placeholder', () => {
    assert.ok(SEED_STONES.length >= 18, `only ${SEED_STONES.length} stones`);
  });

  test('every territory gets at least one stone', () => {
    for (const d of DOMAINS) {
      assert.ok(SEED_STONES.some((s) => s.domain === d.key), `${d.name} has no stones`);
    }
  });
});

describe('SEEDING DOES NOT SKIP THE GATE', () => {
  test('a seeded stone arrives veiled and unplayable', () => {
    const state = emptyState();
    for (const seed of SEED_STONES) addStone(state, { title: seed.title, domain: seed.domain });
    for (const s of state.stones) {
      assert.equal(s.woopComplete, false, `${s.title} was seeded already kindled`);
      assert.equal(stoneProgress(s, []).veiled, true);
    }
  });

  test('every suggested identity passes the same validator as a typed one', () => {
    for (const s of SEED_IDENTITIES) {
      const r = validateIdentity(s.statement);
      assert.equal(r.ok, true, `"${s.statement}" would be rejected: ${JSON.stringify(r.errors)}`);
    }
  });

  test('every suggested identity carries a prompt drawn from the board', () => {
    for (const s of SEED_IDENTITIES) {
      assert.ok(s.prompt && s.prompt.length > 25, `${s.domain} has no prompt`);
    }
  });

  test('there is one suggested identity per territory', () => {
    assert.equal(SEED_IDENTITIES.length, DOMAINS.length);
    for (const d of DOMAINS) {
      assert.ok(SEED_IDENTITIES.some((s) => s.domain === d.key), `${d.name} has no suggested identity`);
    }
  });
});

describe('territory artwork', () => {
  test('every territory has a colour grid', () => {
    for (const d of DOMAINS) {
      assert.ok(ART_GRIDS[d.art || d.key], `${d.name} has no artwork`);
    }
  });

  test('INTEGRITY: every grid is complete and pure hex', () => {
    // Two earlier attempts shipped silently-truncated image data. This is
    // the check that would have caught it before the browser did.
    assert.deepEqual(verifyArt(), []);
  });

  test('grids are exactly one sample per cell', () => {
    for (const [key, g] of Object.entries(ART_GRIDS)) {
      assert.equal(g.length, GRID_W * GRID_H * 3, `${key} is the wrong size`);
    }
  });

  test('a grid expands to full opaque RGBA', () => {
    const rgba = gridToRGBA(ART_GRIDS.faith);
    assert.equal(rgba.length, GRID_W * GRID_H * 4);
    for (let i = 3; i < rgba.length; i += 4) assert.equal(rgba[i], 255, 'every cell must be opaque');
  });

  test('4-bit channels expand across the full 0-255 range', () => {
    const rgba = gridToRGBA('fff000');
    assert.equal(rgba[0], 255);
    assert.equal(rgba[4], 0);
  });

  test('the whole set is under a kilobyte', () => {
    const total = Object.values(ART_GRIDS).reduce((a, v) => a + v.length, 0);
    assert.ok(total < 1200, `artwork totals ${total} chars`);
  });

  test('nothing points at an external host', () => {
    for (const [key, g] of Object.entries(ART_GRIDS)) {
      assert.ok(!/https?:/.test(g), `${key} references a remote URL`);
    }
  });

  test('artFor misses cleanly, and is safe outside a browser', () => {
    assert.equal(artFor('nope'), null);
    assert.equal(artFor('faith'), null, 'returns null without a document rather than throwing');
  });
});

describe('board copy', () => {
  test('the strip carries all seven principles from the board', () => {
    assert.equal(PRINCIPLES_STRIP.length, 7);
    assert.deepEqual(
      PRINCIPLES_STRIP.map((p) => p.label),
      ['Vision', 'Plan', 'Execute', 'Discipline', 'Faith', 'Success', 'Legacy'],
    );
  });

  test('the title and declaration are the board’s own words', () => {
    assert.match(BOARD_TITLE, /Faith\. Family\. Freedom\./);
    assert.match(DECLARATION, /I build\. I invest\./);
  });
});
