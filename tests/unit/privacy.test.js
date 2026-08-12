/**
 * privacy.test.js
 *
 * The Why is the one thing the player was promised stays theirs. These tests
 * exist so that promise survives future refactors — if anyone ever widens
 * `shareable()`, this file fails loudly.
 *
 *   "…pray to thy Father which is in secret."  — Matthew 6:6
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState, emptyVault, shareable, setWhy, getWhy, addIdentity,
  addStone, addQuest, migrate, summarize,
} from '../../src/core/state.js';
import { exportSave, parseSave, makeCircleCode, normalizeCode, STATE_KEY, VAULT_KEY } from '../../src/core/storage.js';

function seeded() {
  const state = emptyState();
  const vault = emptyVault();
  const identity = addIdentity(state, { statement: 'I am a man who trains before sunrise', domain: 'body' });
  setWhy(vault, identity.id, 'Because my father died at 54 and I refuse to leave my kids the same way.');
  const stone = addStone(state, { title: 'Run the half marathon', domain: 'body', identityId: identity.id });
  addQuest(state, { stoneId: stone.id, identityId: identity.id, text: 'When I wake, I will run at the park', sealed: false });
  addQuest(state, { stoneId: stone.id, identityId: identity.id, text: 'When I finish work, I will stretch at home', sealed: true });
  return { state, vault, identity, stone };
}

const SECRET = 'my father died at 54';

describe('THE WHY VAULT MUST NEVER LEAVE THE DEVICE', () => {
  test('the vault lives under a different storage key than the state', () => {
    assert.notEqual(STATE_KEY, VAULT_KEY);
  });

  test('shareable() does not even accept the vault as an argument', () => {
    // Structural guarantee: one parameter. There is no way to pass it in.
    assert.equal(shareable.length, 1);
  });

  test('the private Why never appears in the shareable snapshot', () => {
    const { state, vault } = seeded();
    const json = JSON.stringify(shareable(state));
    assert.ok(!json.includes(SECRET), 'THE PRIVATE WHY LEAKED INTO SYNC');
    assert.ok(!json.includes('vault'));
    assert.ok(!json.includes('whyVault'));
  });

  test('even if a Why is smuggled onto the state object, shareable() drops it', () => {
    const { state } = seeded();
    // Simulate a careless future refactor stashing the why on the identity.
    state.identities[0].why = SECRET;
    state.player.why = SECRET;
    const json = JSON.stringify(shareable(state));
    assert.ok(!json.includes(SECRET), 'shareable() must allow-list fields, not deny-list them');
  });

  test('board images are stripped from the snapshot too', () => {
    const { state } = seeded();
    state.boards.push({ id: 'b1', image: 'data:image/png;base64,AAAAVERYLONGPRIVATEIMAGE', name: 'board' });
    const json = JSON.stringify(shareable(state));
    assert.ok(!json.includes('VERYLONGPRIVATEIMAGE'), 'the circle sees progress, not your collage');
  });

  test('unsealed quest text stays private; sealed quest text is shared', () => {
    const { state } = seeded();
    const snap = shareable(state);
    const unsealed = snap.quests.find((q) => !q.sealed);
    const sealed = snap.quests.find((q) => q.sealed);
    assert.equal(unsealed.text, null, 'an unsealed quest must not broadcast its text');
    assert.ok(sealed.text && sealed.text.length > 0, 'a sealed quest is a public commitment by choice');
  });
});

describe('export safety', () => {
  test('export EXCLUDES the vault by default', () => {
    const { state, vault } = seeded();
    const out = exportSave(state, vault);
    assert.ok(!out.includes(SECRET), 'default export must not carry the private Why');
    assert.match(out, /"vaultIncluded": false/);
  });

  test('export includes the vault only on a deliberate opt-in', () => {
    const { state, vault } = seeded();
    const out = exportSave(state, vault, { includeVault: true });
    assert.ok(out.includes(SECRET), 'an explicit backup should carry it');
    assert.match(out, /"vaultIncluded": true/);
  });

  test('round-trips a save', () => {
    const { state, vault } = seeded();
    const parsed = parseSave(exportSave(state, vault, { includeVault: true }));
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state.identities.length, 1);
    assert.equal(parsed.vaultIncluded, true);
  });

  test('rejects a file that is not an ACHIEVE save', () => {
    assert.equal(parseSave('{"kind":"something-else"}').ok, false);
    assert.equal(parseSave('not json at all').ok, false);
  });
});

describe('vault read/write', () => {
  test('stores and retrieves by identity', () => {
    const vault = emptyVault();
    setWhy(vault, 'i1', 'my reason');
    assert.equal(getWhy(vault, 'i1').text, 'my reason');
    assert.equal(getWhy(vault, 'nope'), null);
  });

  test('stamps an updated time so the UI can show freshness', () => {
    const vault = emptyVault();
    setWhy(vault, 'i1', 'x');
    assert.ok(vault.updatedAt > 0);
  });
});

describe('circle codes are the access control, so they must be strong', () => {
  test('codes are long and high-entropy', () => {
    const code = makeCircleCode();
    const stripped = code.replace(/-/g, '');
    assert.equal(stripped.length, 16, 'short codes are guessable, and a guessed code is a stranger in your circle');
  });

  test('codes avoid characters that are ambiguous when spoken', () => {
    for (let i = 0; i < 50; i++) {
      assert.ok(!/[IO01]/.test(makeCircleCode()), 'no I/O/0/1 — these get misheard');
    }
  });

  test('codes are not repeated', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(makeCircleCode());
    assert.equal(seen.size, 200);
  });

  test('normalizeCode is forgiving of how a human types it', () => {
    assert.equal(normalizeCode(' abcd-efgh '), 'ABCD-EFGH');
    assert.equal(normalizeCode('ab!cd@ef'), 'ABCDEF');
    assert.equal(normalizeCode(null), '');
  });
});

describe('state migration is non-destructive', () => {
  test('fills in missing fields from a partial save', () => {
    const out = migrate({ player: { name: 'Sam' }, stones: [{ id: 's1' }] });
    assert.equal(out.player.name, 'Sam');
    assert.ok(out.player.id, 'a missing id is generated');
    assert.equal(out.stones.length, 1);
    assert.ok(Array.isArray(out.quests));
    assert.equal(out.settings.sabbathEnabled, true);
  });

  test('repairs corrupted array fields instead of crashing', () => {
    const out = migrate({ quests: 'not an array', circle: { members: null } });
    assert.ok(Array.isArray(out.quests));
    assert.ok(Array.isArray(out.circle.members));
  });

  test('garbage in yields a clean new game, not an exception', () => {
    assert.ok(migrate(null).player.id);
    assert.ok(migrate('nonsense').player.id);
  });
});

describe('summary stats', () => {
  test('counts completed steps and active days', () => {
    const { state } = seeded();
    state.quests[0].completedAt = Date.now();
    const s = summarize(state);
    assert.equal(s.steps, 1);
    assert.equal(s.activeDays, 1);
    assert.equal(s.identities, 1);
  });
});
