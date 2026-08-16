import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, xpForLevel, levelFromXp, stageFor, nextStage,
  vitalFor, readCharacter, characterMood, levelUpLine, DEED_SIZES, deedSize,
} from '../../src/core/character.js';
import { DOMAINS, emptyState, addDeed } from '../../src/core/state.js';

/** A situational read of the shape guide.js hands to readCharacter. */
function read({ today = '2026-03-10', streak = 0, tokens = 1, locked = false } = {}) {
  return { today, streak: { current: streak, tokens }, sabbath: { locked } };
}

describe('the level curve', () => {
  test('level 1 costs nothing — you start as somebody', () => {
    assert.equal(xpForLevel(1), 0);
    assert.equal(levelFromXp(0), 1);
  });

  test('is strictly increasing, so no two levels share a threshold', () => {
    for (let n = 1; n < 60; n++) {
      assert.ok(xpForLevel(n + 1) > xpForLevel(n), `level ${n + 1} must cost more than ${n}`);
    }
  });

  test('accelerates — later levels cost more than earlier ones', () => {
    const early = xpForLevel(6) - xpForLevel(5);
    const late = xpForLevel(31) - xpForLevel(30);
    assert.ok(late > early * 3, `late gap ${late} should dwarf early gap ${early}`);
  });

  test('the first level is reachable in a couple of days of real work', () => {
    // Four "real" deeds (25 XP) should be enough to see level 2. If the first
    // level took a fortnight nobody would ever meet the second stage.
    assert.ok(xpForLevel(2) <= 4 * 25, `level 2 costs ${xpForLevel(2)} XP`);
  });

  test('levelFromXp is the exact inverse of xpForLevel at every boundary', () => {
    for (let n = 1; n < 50; n++) {
      const need = xpForLevel(n);
      assert.equal(levelFromXp(need), n, `exactly ${need} XP should be level ${n}`);
      if (n > 1) assert.equal(levelFromXp(need - 1), n - 1, `one short of ${need} is still level ${n - 1}`);
    }
  });

  test('terminates on absurd input instead of spinning', () => {
    assert.ok(levelFromXp(Number.MAX_SAFE_INTEGER) <= 200);
  });
});

describe('stages', () => {
  test('every stage is reachable and they are ordered', () => {
    for (let i = 1; i < STAGES.length; i++) {
      assert.ok(STAGES[i].at > STAGES[i - 1].at, `${STAGES[i].key} must come after ${STAGES[i - 1].key}`);
      assert.equal(stageFor(STAGES[i].at).key, STAGES[i].key);
    }
  });

  test('level 1 is Ember — nobody is shown an empty slot', () => {
    assert.equal(stageFor(1).key, 'ember');
    assert.equal(stageFor(0).key, 'ember');
  });

  test('a level between thresholds keeps the stage it earned', () => {
    assert.equal(stageFor(5).key, 'lamp');   // lamp at 3, runner at 6
    assert.equal(stageFor(6).key, 'runner');
  });

  test('the last stage has nothing after it, and that is not an error', () => {
    assert.equal(nextStage(999), null);
    assert.equal(nextStage(1).key, 'lamp');
  });
});

describe('vitals — neglect dims, it never kills', () => {
  test('an untouched territory sits at the floor, not at zero', () => {
    const v = vitalFor({ lastDay: null, total: 0 });
    assert.equal(v.value, 0.12);
    assert.equal(v.state, 'untouched');
  });

  test('never falls below the floor no matter how long you are away', () => {
    for (const days of [30, 180, 3650]) {
      const v = vitalFor({ lastDay: '2020-01-01', total: 40, today: shift('2020-01-01', days) });
      assert.ok(v.value >= 0.12, `${days} days away gave ${v.value}`);
      assert.ok(v.value <= 1);
    }
  });

  test('tending it today puts it near full', () => {
    const v = vitalFor({ lastDay: '2026-03-10', total: 20, today: '2026-03-10' });
    assert.ok(v.value > 0.9, `same-day vital was ${v.value}`);
    assert.equal(v.state, 'tended');
  });

  test('decays monotonically as the days pass', () => {
    let prev = Infinity;
    for (let d = 0; d <= 40; d++) {
      const v = vitalFor({ lastDay: '2026-01-01', total: 10, today: shift('2026-01-01', d) });
      assert.ok(v.value <= prev + 1e-9, `day ${d} rose instead of falling`);
      prev = v.value;
    }
  });

  test('depth matters — long practice holds its colour longer than a single visit', () => {
    const shallow = vitalFor({ lastDay: '2026-01-01', total: 1, today: '2026-01-08' });
    const deep = vitalFor({ lastDay: '2026-01-01', total: 60, today: '2026-01-08' });
    assert.ok(deep.value > shallow.value);
  });

  test('coming back after a long absence lifts it immediately', () => {
    const gone = vitalFor({ lastDay: '2026-01-01', total: 8, today: '2026-04-01' });
    const back = vitalFor({ lastDay: '2026-04-01', total: 9, today: '2026-04-01' });
    assert.ok(back.value > gone.value * 3, 'one day back should undo months of dimming');
  });

  test('labels the state the player is actually in', () => {
    const at = (d) => vitalFor({ lastDay: '2026-01-01', total: 5, today: shift('2026-01-01', d) }).state;
    assert.equal(at(0), 'tended');
    assert.equal(at(2), 'warm');
    assert.equal(at(7), 'cooling');
    assert.equal(at(30), 'waiting');
  });
});

describe('readCharacter', () => {
  test('a brand new player is level 1 with every territory at the floor', () => {
    const ch = readCharacter(emptyState(), read(), DOMAINS);
    assert.equal(ch.xp, 0);
    assert.equal(ch.level, 1);
    assert.equal(ch.stage.key, 'ember');
    assert.equal(Object.keys(ch.vitals).length, DOMAINS.length);
    for (const d of DOMAINS) assert.equal(ch.vitals[d.key].value, 0.12);
    assert.ok(ch.xpToNext > 0);
  });

  test('logged deeds are evidence — they raise XP and light their territory', () => {
    const s = emptyState();
    addDeed(s, { text: 'Trained', domain: 'body', size: 'real', xp: 25 });
    const ch = readCharacter(s, read({ today: todayKey() }), DOMAINS);
    assert.equal(ch.xp, 25);
    assert.ok(ch.vitals.body.value > 0.5, 'the territory worked today should be lit');
    assert.equal(ch.vitals.faith.value, 0.12, 'untouched territories stay at the floor');
  });

  test('XP comes from steps, focus, deeds and finished stones — and adds up', () => {
    const s = emptyState();
    s.quests.push({ id: 'q1', stoneId: null, identityId: null, completedAt: Date.now(), xpAwarded: 20 });
    s.focusBlocks.push({ minutes: 25 });
    s.stones.push({ id: 's1', domain: 'faith', completedAt: Date.now() });
    addDeed(s, { text: 'Called my brother', domain: 'brotherhood', size: 'small', xp: 10 });
    const ch = readCharacter(s, read({ today: todayKey() }), DOMAINS);
    const b = ch.breakdown;
    assert.equal(b.stepXp + b.focusXp + b.deedXp + b.stoneXp, ch.xp);
    assert.equal(b.stepXp, 20);
    assert.equal(b.focusXp, 20);   // 25 minutes × 0.8
    assert.equal(b.deedXp, 10);
    assert.equal(b.stoneXp, 150);
  });

  test('level progress stays inside the bar', () => {
    for (const n of [0, 1, 59, 60, 61, 5000, 250000]) {
      const s = emptyState();
      addDeed(s, { text: 'x', domain: 'faith', size: 'landmark', xp: n });
      const ch = readCharacter(s, read(), DOMAINS);
      assert.ok(ch.levelProgress >= 0 && ch.levelProgress <= 1, `progress ${ch.levelProgress} at ${n} XP`);
      assert.ok(ch.intoLevel >= 0);
      assert.ok(ch.xpToNext >= 0);
    }
  });

  test('the weakest territory is the one actually most neglected', () => {
    const s = emptyState();
    for (const d of DOMAINS) addDeed(s, { text: 'x', domain: d.key, size: 'small', xp: 10 });
    // Everything tended today except one, which was never touched at all.
    s.deeds = s.deeds.filter((d) => d.domain !== 'global');
    const ch = readCharacter(s, read({ today: todayKey() }), DOMAINS);
    assert.equal(ch.weakest.domain.key, 'global');
    assert.ok(ch.wholeness > 0.12 && ch.wholeness < 1);
  });

  test('falls back to a name rather than rendering an empty figure', () => {
    const ch = readCharacter(emptyState(), read(), DOMAINS);
    assert.ok(ch.name.length > 0);
  });
});

describe('the character never scolds', () => {
  const forbidden = /fail|lazy|behind|disappoint|should have|wasted|guilt|shame|dying|starv/i;

  test('no mood line in any reachable state blames the player', () => {
    const states = [
      { resting: true, streak: 0, wholeness: 0.12, xp: 0, weakest: null, grace: 1 },
      { resting: false, streak: 0, wholeness: 0.12, xp: 0, weakest: null, grace: 1 },
      { resting: false, streak: 0, wholeness: 0.2, xp: 500, grace: 0,
        weakest: { state: 'waiting', days: 90, domain: { name: 'Body' } } },
      { resting: false, streak: 8, wholeness: 0.6, xp: 900, weakest: null, grace: 1 },
      { resting: false, streak: 40, wholeness: 0.95, xp: 9000, weakest: null, grace: 3 },
      { resting: false, streak: 2, wholeness: 0.8, xp: 300, weakest: null, grace: 1 },
    ];
    for (const st of states) {
      const m = characterMood(st);
      assert.ok(m.line && m.line.length > 0, 'every state gets a line');
      assert.ok(!forbidden.test(m.line), `scolding line: "${m.line}"`);
    }
  });

  test('a long absence is named as waiting, not as failure', () => {
    const m = characterMood({
      resting: false, streak: 0, wholeness: 0.2, xp: 500,
      weakest: { state: 'waiting', days: 41, domain: { name: 'Family & Legacy' } },
    });
    assert.match(m.line, /waiting 41 days/);
    assert.match(m.line, /still there/);
  });

  test('an empty game points at Gideon rather than at the player', () => {
    const m = characterMood({ resting: false, streak: 0, wholeness: 0.12, xp: 0, weakest: null });
    assert.equal(m.tone, 'new');
    assert.match(m.line, /Gideon/);
  });
});

describe('deed sizes', () => {
  test('bigger is worth more, and nothing is worth nothing', () => {
    for (let i = 0; i < DEED_SIZES.length; i++) {
      assert.ok(DEED_SIZES[i].xp > 0);
      if (i) assert.ok(DEED_SIZES[i].xp > DEED_SIZES[i - 1].xp);
    }
  });

  test('an unknown size falls back to the smallest rather than to undefined', () => {
    assert.equal(deedSize('nonsense').key, 'small');
    assert.equal(deedSize(undefined).key, 'small');
    assert.equal(deedSize('landmark').xp, 150);
  });

  test('the largest deed cannot buy a stage on its own', () => {
    // Landmark is 150 XP; the Lamp stage is level 3. One good day should not
    // vault a player two stages — the figure has to be earned over days.
    assert.ok(levelFromXp(150) < 3, `one landmark reached level ${levelFromXp(150)}`);
  });
});

// ── helpers ───────────────────────────────────────────────────────────────

function shift(day, days) {
  const d = new Date(day + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('the level-up line', () => {
  test('describes the moment, not the stage the player is still in', () => {
    const s = emptyState();
    addDeed(s, { text: 'Signed the lease', domain: 'enterprise', size: 'landmark', xp: 150 });
    const ch = readCharacter(s, read(), DOMAINS);
    assert.equal(ch.level, 2);
    assert.equal(ch.stage.key, 'ember', 'level 2 is still inside Ember');

    const line = levelUpLine(ch);
    assert.doesNotMatch(line, /no evidence yet/i, 'never tell a player who just did something that there is no evidence');
    assert.match(line, /XP to Lamp/, 'point at the next stage — the pull is in the remaining distance');
  });

  test('still says something sensible past the last stage', () => {
    const s = emptyState();
    addDeed(s, { text: 'x', domain: 'faith', size: 'landmark', xp: 5_000_000 });
    const ch = readCharacter(s, read(), DOMAINS);
    assert.equal(ch.nextStage, null);
    assert.match(levelUpLine(ch), /XP to level \d+/);
  });
});
