import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTURE, MOMENTS, verseFor, versesFor, verseByRef } from '../../src/data/scripture.js';
import { PRINCIPLES, PILLARS, principle, principlesForPillar } from '../../src/data/neuro.js';

describe('scripture bank integrity', () => {
  test('every verse has a reference, text and at least one moment', () => {
    for (const v of SCRIPTURE) {
      assert.ok(v.ref, 'missing ref');
      assert.ok(v.text && v.text.length > 15, `suspiciously short text for ${v.ref}`);
      assert.ok(Array.isArray(v.moments) && v.moments.length, `${v.ref} has no moments`);
    }
  });

  test('no duplicate references', () => {
    const refs = SCRIPTURE.map((v) => v.ref);
    assert.equal(new Set(refs).size, refs.length, 'duplicate verse reference in the bank');
  });

  test('references are well-formed book chapter:verse', () => {
    for (const v of SCRIPTURE) {
      assert.match(v.ref, /^[1-3]?\s?[A-Za-z ]+\s\d+:\d+$/, `malformed ref: ${v.ref}`);
    }
  });

  test('the bank is substantial enough not to repeat within a week', () => {
    assert.ok(SCRIPTURE.length >= 60, `only ${SCRIPTURE.length} verses`);
  });

  test('verseFor is deterministic for a given seed', () => {
    const a = verseFor('daily_open', 7);
    const b = verseFor('daily_open', 7);
    assert.deepEqual(a, b);
  });

  test('verseFor rotates across seeds', () => {
    const pool = SCRIPTURE.filter((v) => v.moments.includes('daily_open'));
    const seen = new Set();
    for (let i = 0; i < 40; i++) seen.add(verseFor('daily_open', i).ref);
    assert.ok(seen.size > 1, 'must not serve the same verse forever');
    assert.ok(seen.size <= pool.length);
  });

  test('verseFor returns null for an unknown moment rather than throwing', () => {
    assert.equal(verseFor('not_a_real_moment', 0), null);
  });

  test('versesFor ranks by specificity', () => {
    const list = versesFor(['circle', 'chat']);
    assert.ok(list.length > 0);
    const top = list[0];
    const topHits = top.moments.filter((m) => ['circle', 'chat'].includes(m)).length;
    assert.ok(topHits >= 2, 'the most specific match should sort first');
  });

  test('verseByRef finds and misses cleanly', () => {
    assert.ok(verseByRef('Habakkuk 2:2'));
    assert.equal(verseByRef('Nowhere 1:1'), null);
  });

  test('the load-bearing verses of the design are all present', () => {
    const required = [
      'Habakkuk 2:2',    // write the vision
      'Romans 4:17',     // Be > Do > Have
      'Judges 6:12',     // named before the evidence
      'Luke 14:28',      // count the cost / WOOP
      'Exodus 16:4',     // manna, daily
      'Proverbs 24:16',  // falleth seven times / grace
      'Mark 4:8',        // thirty, sixty, hundredfold
      'Ecclesiastes 4:12', // threefold cord / circle
      '1 Samuel 7:12',   // Ebenezer / the ping on the map
      'Joshua 1:3',      // treading ground / the real map
      'Matthew 6:6',     // the secret Why
      'Matthew 6:33',    // added, not chased
      'Exodus 20:8',     // sabbath lock
      'John 10:27',      // the Shepherd guides
    ];
    for (const ref of required) {
      assert.ok(verseByRef(ref), `design depends on ${ref} but it is missing`);
    }
  });

  test('MOMENTS is derived and non-trivial', () => {
    assert.ok(MOMENTS.length > 30);
    assert.ok(MOMENTS.includes('daily_open'));
  });
});

describe('neuroscience registry integrity', () => {
  test('CRITICAL: every principle cites a verse that actually exists in the bank', () => {
    for (const p of PRINCIPLES) {
      assert.ok(p.verse, `${p.id} cites no verse`);
      assert.ok(verseByRef(p.verse), `${p.id} cites ${p.verse}, which is not in the scripture bank`);
    }
  });

  test('CRITICAL: every principle names a real source with a year', () => {
    for (const p of PRINCIPLES) {
      assert.ok(p.source && p.source.length > 25, `${p.id} has no usable citation`);
      assert.match(p.source, /\(\d{4}\)/, `${p.id} citation has no year: ${p.source}`);
    }
  });

  test('CRITICAL: every principle changes a mechanic — nothing decorative survives', () => {
    for (const p of PRINCIPLES) {
      assert.ok(p.mechanic && p.mechanic.length > 40, `${p.id} does not describe a mechanic`);
      assert.ok(p.finding && p.finding.length > 40, `${p.id} does not state a finding`);
      assert.ok(p.system, `${p.id} names no brain system or mechanism`);
    }
  });

  test('every principle belongs to a real pillar', () => {
    for (const p of PRINCIPLES) {
      assert.ok(PILLARS[p.pillar], `${p.id} has bad pillar ${p.pillar}`);
    }
  });

  test('no duplicate principle ids', () => {
    const ids = PRINCIPLES.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('all three pillars are populated', () => {
    for (const key of ['BE', 'DO', 'HAVE']) {
      assert.ok(principlesForPillar(key).length > 0, `pillar ${key} is empty`);
    }
  });

  test('the variable-ratio mechanic carries an explicit ethics note', () => {
    const vr = principle('variable_ratio');
    assert.ok(vr.ethics, 'the most exploitable mechanic in the game must justify itself');
    assert.match(vr.ethics, /cap/i);
  });

  test('pillars teach the Be>Do>Have inversion', () => {
    assert.match(PILLARS.BE.blurb, /HAVE\s*→\s*DO\s*→\s*BE/);
    assert.equal(PILLARS.BE.verse, 'Romans 4:17');
    assert.equal(PILLARS.HAVE.verse, 'Matthew 6:33');
  });

  test('principle() misses cleanly', () => {
    assert.equal(principle('nope'), null);
  });

  test('the registry is substantial', () => {
    assert.ok(PRINCIPLES.length >= 20, `only ${PRINCIPLES.length} principles`);
  });
});
