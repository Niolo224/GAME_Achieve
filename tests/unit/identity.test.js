import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateIdentity, tallyIdentity, tierFor, automaticityAt,
  evidenceStatement, chainFor, IDENTITY_TIERS,
} from '../../src/core/identity.js';

describe('identity statement validation (Be)', () => {
  test('rejects empty', () => {
    assert.equal(validateIdentity('').ok, false);
  });

  test('rejects future/aspirational tense — the name comes BEFORE the evidence', () => {
    const r = validateIdentity('I want to be a person who trains every morning');
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'future_tense' || e.code === 'not_present_tense'));
  });

  test('rejects "I will be" — that is postponement', () => {
    const r = validateIdentity('I will be a man who writes daily');
    assert.equal(r.ok, false);
  });

  test('rejects vague adjectives with no observable behaviour', () => {
    const r = validateIdentity('I am successful');
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === 'vague' || e.code === 'no_behaviour'));
  });

  test('accepts a concrete possible self', () => {
    const r = validateIdentity('I am a man who trains before sunrise');
    assert.equal(r.ok, true, JSON.stringify(r.errors));
  });

  test('accepts another concrete form', () => {
    const r = validateIdentity('I am a woman who ships work she is proud of every week');
    assert.equal(r.ok, true, JSON.stringify(r.errors));
  });

  test('every rejection explains itself — the gate must teach, not just block', () => {
    const r = validateIdentity('I want to be rich');
    assert.equal(r.ok, false);
    assert.ok(r.errors.every((e) => e.message && e.message.length > 10));
    assert.ok(r.errors.some((e) => e.help), 'at least one error cites the reasoning');
  });
});

describe('the vote ledger (Do)', () => {
  const votes = [
    { identityId: 'i1', day: '2026-08-01', for: true },
    { identityId: 'i1', day: '2026-08-02', for: true },
    { identityId: 'i1', day: '2026-08-03', for: false },
    { identityId: 'i2', day: '2026-08-03', for: true },
  ];

  test('counts only this identity’s votes', () => {
    const t = tallyIdentity(votes, 'i1');
    assert.equal(t.total, 3);
    assert.equal(t.votesFor, 2);
    assert.equal(t.votesAgainst, 1);
  });

  test('rate is the share of recent actions voting FOR the self', () => {
    const t = tallyIdentity(votes, 'i1', { today: '2026-08-03', window: 30 });
    assert.ok(Math.abs(t.rate - 2 / 3) < 1e-9);
    assert.equal(t.ratePct, 67);
  });

  test('the rolling window excludes ancient history', () => {
    const old = [
      { identityId: 'i1', day: '2026-01-01', for: true },
      { identityId: 'i1', day: '2026-08-12', for: false },
    ];
    const t = tallyIdentity(old, 'i1', { today: '2026-08-12', window: 30 });
    assert.equal(t.windowTotal, 1);
    assert.equal(t.rate, 0);
    assert.equal(t.votesFor, 1, 'lifetime votes still count toward the tier');
  });

  test('an untouched identity is Called, not failed', () => {
    const t = tallyIdentity([], 'ghost', { today: '2026-08-12' });
    assert.equal(t.tier.key, 'called');
    assert.equal(t.total, 0);
  });
});

describe('the tier ladder', () => {
  test('climbs only when BOTH volume and rate qualify', () => {
    assert.equal(tierFor(0, 0).key, 'called');
    assert.equal(tierFor(5, 0.9).key, 'reckoned');
    assert.equal(tierFor(20, 0.65).key, 'evidenced');
    assert.equal(tierFor(40, 0.75).key, 'established');
    assert.equal(tierFor(80, 0.85).key, 'second_nature');
  });

  test('high volume with a poor rate does NOT promote', () => {
    assert.equal(tierFor(100, 0.3).key, 'called');
  });

  test('the top rung sits at Lally’s 66-rep median', () => {
    const top = IDENTITY_TIERS[IDENTITY_TIERS.length - 1];
    assert.equal(top.minVotes, 66);
  });

  test('every tier carries a verse', () => {
    for (const t of IDENTITY_TIERS) assert.ok(t.ref && t.line);
  });
});

describe('automaticity curve (Lally 2010)', () => {
  test('starts at zero and rises monotonically', () => {
    assert.equal(automaticityAt(0), 0);
    assert.ok(automaticityAt(10) < automaticityAt(30));
    assert.ok(automaticityAt(30) < automaticityAt(66));
  });

  test('reaches ~80% at the observed 66-day median plateau', () => {
    const a = automaticityAt(66);
    assert.ok(a > 0.75 && a < 0.85, `expected ~0.80 at 66 reps, got ${a}`);
  });

  test('is asymptotic — never reaches or exceeds 1', () => {
    assert.ok(automaticityAt(10000) < 1);
  });
});

describe('evidence statements — never "task complete"', () => {
  test('speaks to identity, not to tasks', () => {
    const t = tallyIdentity(
      [{ identityId: 'i1', day: '2026-08-01', for: true }],
      'i1', { today: '2026-08-01' },
    );
    const s = evidenceStatement({ statement: 'I am a man who trains before sunrise' }, t);
    assert.match(s.headline, /evidence says/i);
    assert.ok(!/task/i.test(s.headline));
  });

  test('a zero-evidence identity gets Gideon, not condemnation', () => {
    const t = tallyIdentity([], 'i1', { today: '2026-08-01' });
    const s = evidenceStatement({ statement: 'I am a man who trains' }, t);
    assert.equal(s.ref, 'Judges 6:12');
    assert.match(s.body, /winepress/i);
  });

  test('a losing tally is framed as information, never as shame', () => {
    const votes = [
      { identityId: 'i1', day: '2026-08-01', for: false },
      { identityId: 'i1', day: '2026-08-02', for: false },
      { identityId: 'i1', day: '2026-08-03', for: true },
    ];
    const t = tallyIdentity(votes, 'i1', { today: '2026-08-03' });
    const s = evidenceStatement({ statement: 'I am a man who trains' }, t);
    assert.match(s.body, /information, not condemnation/i);
  });
});

describe('the Be>Do>Have chain', () => {
  const identities = [{ id: 'i1', statement: 'I am a man who trains before sunrise' }];
  const stone = { id: 's1', identityId: 'i1' };

  test('reports a broken chain when no identity is attached', () => {
    const c = chainFor({ id: 's2', identityId: null }, identities, []);
    assert.equal(c.ready, false);
    assert.equal(c.missing, 'be');
  });

  test('reports a broken chain when there is no next action', () => {
    const c = chainFor(stone, identities, []);
    assert.equal(c.ready, false);
    assert.equal(c.missing, 'do');
  });

  test('is ready when Be and Do are both present', () => {
    const quests = [{ id: 'q1', stoneId: 's1', completedAt: null }];
    const c = chainFor(stone, identities, quests);
    assert.equal(c.ready, true);
    assert.equal(c.be.id, 'i1');
    assert.equal(c.do.length, 1);
    assert.equal(c.have.id, 's1');
  });

  test('completed quests do not count as an open next action', () => {
    const quests = [{ id: 'q1', stoneId: 's1', completedAt: 123 }];
    const c = chainFor(stone, identities, quests);
    assert.equal(c.missing, 'do');
  });
});
