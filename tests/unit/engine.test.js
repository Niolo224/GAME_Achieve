import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWoop, validateIfThen, composeIfThen,
  calibrate, adjustDifficulty, difficulty,
  gradientMultiplier, awardFor, decayManna,
  computeStreak, restorationFraming, sabbathState,
  focusCredit, canStartFocus, stoneProgress, GRACE, REWARD,
} from '../../src/core/engine.js';

describe('WOOP gate', () => {
  test('rejects an empty vision outright', () => {
    const r = validateWoop({});
    assert.equal(r.ok, false);
    assert.ok(r.errors.length >= 3);
  });

  test('rejects an EXTERNAL obstacle — the whole point of WOOP is the inner one', () => {
    const r = validateWoop({
      wish: 'Launch the business',
      outcome: 'I feel free and I am providing for my household without fear',
      obstacle: 'I have no time because my boss keeps me late',
      plan: 'When I get home, I will work for one hour',
    });
    assert.equal(r.ok, false);
    const obstacleErr = r.errors.find((e) => e.field === 'obstacle');
    assert.ok(obstacleErr, 'should flag the obstacle');
    assert.equal(obstacleErr.code, 'external');
  });

  test('accepts a properly contrasted, internal, if-then WOOP', () => {
    const r = validateWoop({
      wish: 'Launch the business',
      outcome: 'I feel free and I am providing for my household without fear',
      obstacle: 'I tell myself I am too tired and I open my phone instead',
      plan: 'When I reach for my phone after dinner, I will open the laptop instead at the kitchen table',
    });
    assert.equal(r.ok, true, JSON.stringify(r.errors, null, 2));
  });

  test('rejects a plan that is not if-then even when everything else is good', () => {
    const r = validateWoop({
      wish: 'Run a half marathon',
      outcome: 'I cross the line strong and my kids are watching',
      obstacle: 'I convince myself one skipped run does not matter',
      plan: 'Run more often',
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.field === 'plan'));
  });
});

describe('if-then validation (Gollwitzer)', () => {
  test('rejects a bare goal intention', () => {
    const r = validateIfThen('Go to the gym');
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'no_cue'));
    assert.ok(r.errors.some((e) => e.code === 'no_action'));
  });

  test('accepts a cue + committed action', () => {
    const r = validateIfThen('When I put my keys down after work, I will change into my running shoes');
    assert.equal(r.ok, true);
    assert.equal(r.hasCue, true);
    assert.equal(r.hasAction, true);
  });

  test('a bare time also counts as a cue', () => {
    const r = validateIfThen('At 6:00 I will read one chapter at the desk');
    assert.equal(r.ok, true);
    assert.equal(r.hasTime, true);
  });

  test('detects place binding for context-dependent memory', () => {
    const r = validateIfThen('When I finish breakfast, I will write at the desk');
    assert.equal(r.hasPlace, true);
  });

  test('composeIfThen builds something that passes its own validator', () => {
    const s = composeIfThen({ cue: 'I sit down after dinner', action: 'write 200 words', place: 'the kitchen table' });
    assert.match(s, /^When /);
    assert.equal(validateIfThen(s).ok, true);
  });

  test('composeIfThen strips duplicate lead-ins', () => {
    const s = composeIfThen({ cue: 'When I wake', action: 'I will pray', place: '' });
    assert.equal(s, 'When I wake, I will pray.');
  });
});

describe('calibration engine (85% rule)', () => {
  test('holds and admits low confidence on a small sample', () => {
    const r = calibrate([true, false]);
    assert.equal(r.action, 'hold');
    assert.equal(r.confident, false);
  });

  test('increases difficulty when the player never fails', () => {
    const r = calibrate(Array(10).fill(true));
    assert.equal(r.action, 'increase');
    assert.equal(r.delta, 1);
  });

  test('decreases difficulty when the player is drowning', () => {
    const r = calibrate([true, false, false, false, false, false]);
    assert.equal(r.action, 'decrease');
    assert.equal(r.delta, -1);
  });

  test('holds inside the training band', () => {
    // 8 of 10 = 80%, inside [0.6, 0.9]
    const r = calibrate([true, true, true, true, true, true, true, true, false, false]);
    assert.equal(r.action, 'hold');
    assert.equal(r.confident, true);
  });

  test('difficulty ladder clamps at both ends', () => {
    assert.equal(adjustDifficulty(1, -1), 1);
    assert.equal(adjustDifficulty(5, +1), 5);
    assert.equal(difficulty(99).level, 5);
    assert.equal(difficulty(-3).level, 1);
  });
});

describe('reward: goal gradient + manna', () => {
  test('gradient multiplier rises toward the goal', () => {
    assert.equal(gradientMultiplier(0), 1);
    assert.ok(gradientMultiplier(0.9) > gradientMultiplier(0.4));
    assert.ok(Math.abs(gradientMultiplier(1) - REWARD.gradientMax) < 1e-9);
  });

  test('awards more XP for the same act nearer completion', () => {
    const early = awardFor({ level: 2, stoneProgress: 0.05, seed: 'a' });
    const late = awardFor({ level: 2, stoneProgress: 0.95, seed: 'a' });
    assert.ok(late.xp > early.xp, `${late.xp} should exceed ${early.xp}`);
  });

  test('focus block pays a plasticity premium', () => {
    const plain = awardFor({ level: 3, seed: 'x' });
    const focused = awardFor({ level: 3, focused: true, seed: 'x' });
    assert.ok(focused.xp > plain.xp);
    assert.ok(focused.bonuses.some((b) => b.key === 'focus'));
  });

  test('manna is capped per day — no infinite slot machine', () => {
    const atCap = awardFor({ level: 1, mannaToday: REWARD.mannaDailyCap, seed: 'guaranteed-drop' });
    assert.equal(atCap.manna, false);
  });

  test('manna is variable-ratio, not fixed — drops vary across seeds', () => {
    const results = Array.from({ length: 200 }, (_, i) => awardFor({ level: 1, seed: `q${i}` }).manna);
    const hits = results.filter(Boolean).length;
    // Expect roughly 25%; assert it is genuinely stochastic and near target.
    assert.ok(hits > 20 && hits < 80, `expected ~50/200 manna drops, got ${hits}`);
  });

  test('manna is deterministic for the same seed (same day = same outcome)', () => {
    const a = awardFor({ level: 1, seed: 'quest-7|2026-08-12' });
    const b = awardFor({ level: 1, seed: 'quest-7|2026-08-12' });
    assert.equal(a.manna, b.manna);
    assert.equal(a.xp, b.xp);
  });

  test('unspent manna spoils, Exodus 16:20', () => {
    const grants = [
      { id: 'm1', day: '2026-08-01', spent: false },
      { id: 'm2', day: '2026-08-11', spent: false },
      { id: 'm3', day: '2026-08-01', spent: true },
    ];
    const r = decayManna(grants, '2026-08-12');
    assert.equal(r.spoiledCount, 1);
    assert.equal(r.spoiled[0].id, 'm1');
    assert.ok(r.kept.find((g) => g.id === 'm3'), 'spent manna is never spoiled');
    assert.ok(r.kept.find((g) => g.id === 'm2'), 'fresh manna survives');
  });
});

describe('grace and streaks — the streak must never zero out unjustly', () => {
  test('a brand new player already holds grace', () => {
    const s = computeStreak([], '2026-08-12');
    assert.equal(s.tokens, GRACE.startingTokens);
    assert.equal(s.state, 'unbegun');
  });

  test('counts a clean run', () => {
    const days = ['2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12'];
    const s = computeStreak(days, '2026-08-12');
    assert.equal(s.current, 5);
    assert.equal(s.longest, 5);
    assert.equal(s.state, 'running');
  });

  test('one missed day spends grace and the streak SURVIVES', () => {
    // miss 08-10
    const days = ['2026-08-08', '2026-08-09', '2026-08-11', '2026-08-12'];
    const s = computeStreak(days, '2026-08-12');
    assert.ok(s.current >= 4, `streak should survive a graced miss, got ${s.current}`);
    assert.equal(s.tokensSpent, 1);
    assert.equal(s.state, 'graced');
  });

  test('a graced miss costs momentum, not the run', () => {
    const days = ['2026-08-08', '2026-08-09', '2026-08-11', '2026-08-12'];
    const s = computeStreak(days, '2026-08-12');
    assert.ok(s.momentum < 1, 'momentum should be reduced');
    assert.ok(s.momentum > 0, 'momentum should not be annihilated');
  });

  test('running out of grace ends the run but never erases the longest', () => {
    // Long gap with only the starting token available.
    const days = ['2026-08-01', '2026-08-02', '2026-08-03'];
    const s = computeStreak(days, '2026-08-12');
    assert.equal(s.current, 0);
    assert.ok(s.longest >= 3, 'lifetime best is preserved');
    assert.equal(s.state, 'restoration');
  });

  test('tokens accrue every 7 active days and never exceed the cap', () => {
    const days = [];
    for (let i = 0; i < 40; i++) {
      const d = new Date(2026, 6, 1 + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    const s = computeStreak(days, days[days.length - 1]);
    assert.equal(s.current, 40);
    assert.ok(s.tokens <= GRACE.maxTokens, `tokens ${s.tokens} must not exceed cap`);
  });

  test('restoration is framed as a new season, never as failure', () => {
    const r = restorationFraming('2026-07-01', '2026-08-12');
    assert.equal(r.title, 'A new thing');
    assert.equal(r.suggestedLevel, 1, 're-entry must be tiny');
    assert.match(r.body, /nothing you built has been deleted/i);
  });
});

describe('sabbath lock', () => {
  test('is off when disabled', () => {
    assert.equal(sabbathState({ sabbathEnabled: false }, '2026-08-12').locked, false);
  });

  test('locks the configured day and withholds quests', () => {
    // 2026-08-16 is a Sunday.
    const s = sabbathState({ sabbathEnabled: true, sabbathDay: 0 }, '2026-08-16');
    assert.equal(s.locked, true);
    assert.ok(Array.isArray(s.allowed));
    assert.ok(!s.allowed.includes('quest'), 'quests must actually be withheld');
  });

  test('does not lock other days', () => {
    const s = sabbathState({ sabbathEnabled: true, sabbathDay: 0 }, '2026-08-12');
    assert.equal(s.locked, false);
  });
});

describe('focus blocks and consolidation', () => {
  test('full stillness earns full credit', () => {
    const c = focusCredit({ minutes: 50, restTaken: 10, restRequired: 10 });
    assert.equal(c.credited, 50);
    assert.equal(c.forfeited, 0);
  });

  test('skipping stillness forfeits consolidation credit', () => {
    const c = focusCredit({ minutes: 50, restTaken: 0, restRequired: 10 });
    assert.ok(c.credited < 50);
    assert.ok(c.forfeited > 0);
    assert.match(c.message, /stillness/i);
  });

  test('refuses a third back-to-back block', () => {
    const now = Date.now();
    const blocks = [{ endedAt: now - 60 * 60 * 1000 }, { endedAt: now - 5 * 60 * 1000 }];
    const r = canStartFocus(blocks, now - 5 * 60 * 1000, now);
    assert.equal(r.ok, false);
    assert.ok(r.waitMs > 0);
  });

  test('allows a block after real recovery', () => {
    const now = Date.now();
    const blocks = [{ endedAt: now - 60 * 60 * 1000 }, { endedAt: now - 40 * 60 * 1000 }];
    const r = canStartFocus(blocks, now - 40 * 60 * 1000, now);
    assert.equal(r.ok, true);
  });
});

describe('stone progress (the HAVE)', () => {
  test('an uncontrasted stone stays veiled', () => {
    const p = stoneProgress({ id: 's1', woopComplete: false }, []);
    assert.equal(p.veiled, true);
  });

  test('reports distance remaining, per goal-gradient framing', () => {
    const quests = [
      { id: 'q1', stoneId: 's1', completedAt: 1 },
      { id: 'q2', stoneId: 's1', completedAt: 1 },
      { id: 'q3', stoneId: 's1', completedAt: null },
    ];
    const p = stoneProgress({ id: 's1', woopComplete: true }, quests);
    assert.equal(p.done, 2);
    assert.equal(p.total, 3);
    assert.equal(p.remaining, 1);
    assert.ok(p.nearing);
  });

  test('ignores archived quests', () => {
    const quests = [
      { id: 'q1', stoneId: 's1', completedAt: 1 },
      { id: 'q2', stoneId: 's1', completedAt: null, archived: true },
    ];
    const p = stoneProgress({ id: 's1', woopComplete: true }, quests);
    assert.equal(p.total, 1);
    assert.equal(p.progress, 1);
  });
});

describe('an unfinished TODAY is not a missed day', () => {
  test('a clean run through yesterday still reads as running before today is done', () => {
    const days = ['2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11'];
    const s = computeStreak(days, '2026-08-12');
    assert.equal(s.current, 4, 'yesterday-through must survive an unfinished today');
    assert.equal(s.state, 'running');
    assert.equal(s.todayPending, true);
    assert.match(s.message, /still open/i);
  });

  test('an unfinished today never spends a grace token', () => {
    const days = ['2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11'];
    const s = computeStreak(days, '2026-08-12');
    assert.equal(s.tokensSpent, 0, 'the day is not over — do not charge grace for it');
  });

  test('finishing today extends the same run', () => {
    const s = computeStreak(['2026-08-08','2026-08-09','2026-08-10','2026-08-11','2026-08-12'], '2026-08-12');
    assert.equal(s.current, 5);
    assert.equal(s.todayPending, false);
  });

  test('yesterday missed still costs grace — only TODAY is exempt', () => {
    const days = ['2026-08-08', '2026-08-09', '2026-08-10'];
    const s = computeStreak(days, '2026-08-12'); // 08-11 missed, 08-12 pending
    assert.equal(s.tokensSpent, 1, 'a completed missed day must still be accounted');
  });
});
