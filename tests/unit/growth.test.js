import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyRate, circleTerm, consistencyTerm, runGrowth, yieldTier,
  project, daysToYield, buildSeries, explainRate, displayTerms, GROWTH_CONFIG,
} from '../../src/core/growth.js';
import { dayRange } from '../../src/core/util.js';

describe('the two lines must be honest', () => {
  test('THE CENTRAL INVARIANT: with zero growth rate, Increase === Steps exactly', () => {
    const series = dayRange('2026-01-01', '2026-03-01').map((day) => ({
      day, steps: 2, terms: { consistency: 0, alignment: 0, circle: 0 },
    }));
    const r = runGrowth(series);
    assert.equal(r.increase, r.steps, 'an inconsistent player must see ONE line, not a fake curve');
    assert.equal(r.yield, 0);
  });

  test('with earned rate, Increase pulls away exponentially from Steps', () => {
    const series = dayRange('2026-01-01', '2026-06-01').map((day) => ({
      day, steps: 2, terms: { consistency: 1, alignment: 1, circle: 1 },
    }));
    const r = runGrowth(series);
    assert.ok(r.increase > r.steps * 2, `increase ${r.increase} should far exceed steps ${r.steps}`);
    assert.ok(r.yield > 1);
  });

  test('the gap is genuinely accelerating, not merely linear-with-a-bigger-slope', () => {
    const series = dayRange('2026-01-01', '2026-06-01').map((day) => ({
      day, steps: 1, terms: { consistency: 1, alignment: 1, circle: 0.5 },
    }));
    const { points } = runGrowth(series);
    const third = Math.floor(points.length / 3);
    const gap1 = points[third].gap - points[0].gap;
    const gap2 = points[third * 2].gap - points[third].gap;
    const gap3 = points[points.length - 1].gap - points[third * 2].gap;
    assert.ok(gap2 > gap1, 'second-period growth must exceed first');
    assert.ok(gap3 > gap2, 'third-period growth must exceed second — that is what exponential means');
  });

  test('linear track is exactly the sum of steps, always', () => {
    const series = dayRange('2026-01-01', '2026-02-01').map((day, i) => ({
      day, steps: i % 3, terms: { consistency: 0.9, alignment: 0.9, circle: 0.9 },
    }));
    const expected = series.reduce((a, s) => a + s.steps, 0);
    assert.equal(runGrowth(series).steps, expected);
  });

  test('zero steps forever yields zero on both tracks (no free growth)', () => {
    const series = dayRange('2026-01-01', '2026-04-01').map((day) => ({
      day, steps: 0, terms: { consistency: 1, alignment: 1, circle: 1 },
    }));
    const r = runGrowth(series);
    assert.equal(r.steps, 0);
    assert.equal(r.increase, 0, 'compounding nothing must stay nothing');
  });
});

describe('the earned rate', () => {
  test('rate is bounded by the configured ceiling', () => {
    const max = dailyRate({ consistency: 1, alignment: 1, circle: 1 });
    assert.ok(Math.abs(max - GROWTH_CONFIG.maxDailyRate) < 1e-9);
    assert.equal(dailyRate({}), 0);
  });

  test('out-of-range inputs are clamped, never trusted', () => {
    const r = dailyRate({ consistency: 99, alignment: -5, circle: 42 });
    assert.ok(r <= GROWTH_CONFIG.maxDailyRate + 1e-9);
    assert.ok(r >= 0);
  });

  test('consistency is the heaviest term — frequency beats intensity', () => {
    const consistencyOnly = dailyRate({ consistency: 1, alignment: 0, circle: 0 });
    const alignmentOnly = dailyRate({ consistency: 0, alignment: 1, circle: 0 });
    const circleOnly = dailyRate({ consistency: 0, alignment: 0, circle: 1 });
    assert.ok(consistencyOnly > alignmentOnly);
    assert.ok(alignmentOnly > circleOnly);
  });

  test('circle term saturates — a hundred shallow contacts do not beat five real ones', () => {
    assert.equal(circleTerm(0), 0);
    const five = circleTerm(5);
    const hundred = circleTerm(100);
    assert.ok(Math.abs(five - 1) < 1e-9, 'saturates at the configured point');
    assert.ok(hundred <= 1, 'and never exceeds it');
    assert.ok(circleTerm(2) < five);
  });

  test('consistency measures the trailing window correctly', () => {
    const all = dayRange('2026-08-01', '2026-08-14');
    assert.ok(Math.abs(consistencyTerm(all, '2026-08-14') - 1) < 1e-9);
    const half = all.filter((_, i) => i % 2 === 0);
    const c = consistencyTerm(half, '2026-08-14');
    assert.ok(c > 0.4 && c < 0.6, `expected ~0.5, got ${c}`);
    assert.equal(consistencyTerm([], '2026-08-14'), 0);
  });

  test('old activity outside the window does not prop up consistency', () => {
    const stale = dayRange('2026-01-01', '2026-01-14');
    assert.equal(consistencyTerm(stale, '2026-08-14'), 0);
  });
});

describe('yield reported in the units of Mark 4:8', () => {
  test('tiers map to thirty, sixty, hundredfold', () => {
    assert.equal(yieldTier(0.05).label, 'Sown');
    assert.equal(yieldTier(0.35).label, 'Thirtyfold');
    assert.equal(yieldTier(0.75).label, 'Sixtyfold');
    assert.equal(yieldTier(1.4).label, 'Hundredfold');
  });

  test('a real consistent run reaches a named tier', () => {
    const series = dayRange('2026-01-01', '2026-04-01').map((day) => ({
      day, steps: 1, terms: { consistency: 1, alignment: 0.9, circle: 0.6 },
    }));
    const r = runGrowth(series);
    assert.ok(['Thirtyfold', 'Sixtyfold', 'Hundredfold'].includes(r.tier.label), `got ${r.tier.label}`);
  });
});

describe('projection and targets', () => {
  test('projection extends both lines', () => {
    const p = project(100, 140, 2, 0.03, 30);
    assert.equal(p.length, 30);
    assert.ok(p[29].increase > p[29].linear);
    assert.ok(p[29].linear === 100 + 60);
  });

  test('daysToYield returns null when the pace can never get there', () => {
    assert.equal(daysToYield(0.3, 2, 0), null);
    assert.equal(daysToYield(0.3, 0, 0.04), null);
  });

  test('daysToYield finds a real horizon at a healthy pace', () => {
    const d = daysToYield(0.3, 1, GROWTH_CONFIG.maxDailyRate);
    assert.ok(d && d > 0 && d < 365, `expected a reachable horizon, got ${d}`);
  });
});

describe('buildSeries from raw logs', () => {
  test('turns completions into a day series with derived terms', () => {
    const completions = [
      { day: '2026-08-10', aligned: true },
      { day: '2026-08-10', aligned: false },
      { day: '2026-08-11', aligned: true },
    ];
    const s = buildSeries({ completions, from: '2026-08-09', to: '2026-08-12' });
    assert.equal(s.length, 4);
    assert.equal(s[0].steps, 0);
    assert.equal(s[1].steps, 2);
    assert.equal(s[1].terms.alignment, 0.5, 'half the votes aligned');
    assert.equal(s[2].terms.alignment, 1);
    assert.equal(s[3].terms.alignment, 0, 'no actions means no alignment signal, not an invented one');
  });

  test('respects the partner lookup for the network term', () => {
    const s = buildSeries({
      completions: [{ day: '2026-08-10', aligned: true }],
      from: '2026-08-10', to: '2026-08-10',
      activePartnersOn: () => 5,
    });
    assert.ok(Math.abs(s[0].terms.circle - 1) < 1e-9);
  });
});

describe('explainRate — the player must never wonder where the number came from', () => {
  test('breaks the rate into named, weighted contributions', () => {
    const e = explainRate({ consistency: 0.8, alignment: 0.5, circle: 0.2 });
    assert.equal(e.parts.length, 3);
    assert.ok(e.ratePct > 0);
    for (const p of e.parts) {
      assert.ok(p.why && p.why.length > 10, 'every term must explain itself');
      assert.ok(typeof p.contribution === 'number');
    }
  });

  test('identifies the weakest term so the player knows what to fix', () => {
    const e = explainRate({ consistency: 0.9, alignment: 0.8, circle: 0.1 });
    assert.equal(e.weakest.key, 'circle');
  });
});

describe('displayTerms — what the player is shown', () => {
  test('does NOT read alignment as zero just because today is unstarted', () => {
    const series = [
      { day: '2026-08-10', steps: 2, terms: { consistency: .8, alignment: 1, circle: .2 } },
      { day: '2026-08-11', steps: 2, terms: { consistency: .8, alignment: 1, circle: .2 } },
      { day: '2026-08-12', steps: 0, terms: { consistency: .8, alignment: 0, circle: .2 } },
    ];
    const d = displayTerms(series);
    assert.equal(d.alignment, 1, 'must average days that actually had actions');
    assert.equal(d.consistency, .8, 'consistency still comes from today');
  });

  test('a genuinely poor alignment still reads as poor', () => {
    const series = [
      { day: '2026-08-10', steps: 2, terms: { consistency: .5, alignment: .2 } },
      { day: '2026-08-11', steps: 2, terms: { consistency: .5, alignment: .4 } },
    ];
    assert.ok(Math.abs(displayTerms(series).alignment - 0.3) < 1e-9);
  });

  test('empty history is safe', () => {
    assert.deepEqual(displayTerms([]), { consistency: 0, alignment: 0, circle: 0 });
  });
});
