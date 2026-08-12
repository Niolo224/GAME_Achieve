/**
 * growth.js — Linear and exponential, running at the same time.
 *
 * This is the module that answers the design brief directly: the player must
 * move linearly AND exponentially simultaneously, and must be able to SEE
 * both at once.
 *
 * ── THE TWO LINES ────────────────────────────────────────────────────────
 *
 * STEPS (linear).  L(t) = Σ steps.  One faithful act = one step. Nothing
 * clever. This is obedience, counted plainly.
 *     "Who hath despised the day of small things?"  — Zechariah 4:10
 *
 * INCREASE (exponential).  A compounding balance:
 *
 *     I(t) = I(t-1) × (1 + g_t) + steps_t
 *
 * Identical in form to compound interest: yesterday's balance grows by rate
 * g, then today's deposit lands on top. The honesty of this model is the
 * point — g is not a decoration, it is EARNED, and when it collapses to zero
 * the two lines lie exactly on top of each other:
 *
 *     g_t = 0  ⟹  I(t) = Σ steps = L(t)
 *
 * So an inconsistent player literally sees one line. There is no exponential
 * without consistency, and the graph refuses to lie about it.
 *
 * ── WHERE g COMES FROM ───────────────────────────────────────────────────
 * Three earned terms, all bounded:
 *   consistency — share of the recent window with at least one step
 *                 (Lally 2010: automaticity is built by frequency, not intensity)
 *   alignment   — share of actions that voted for the declared identity
 *                 (Bem 1972: the self is inferred from accumulated behaviour)
 *   circle      — a genuine network term from the Covenant Circle
 *                 (Christakis & Fowler 2007: behaviour spreads through networks)
 *
 * The network term is what makes this properly exponential rather than merely
 * accelerating: it is the only input that can grow without the player
 * personally spending more hours.
 *     "some thirty, and some sixty, and some an hundred."  — Mark 4:8
 *
 * ── THE YIELD ────────────────────────────────────────────────────────────
 * Yield = (Increase − Steps) / Steps. It is everything compounding gave that
 * raw effort did not, and it is reported in the parable's own units:
 * thirtyfold, sixtyfold, hundredfold.
 */

import { clamp, dayRange, shiftBack } from './util.js';

export const GROWTH_CONFIG = {
  /** Ceiling on the daily compounding rate. 4.5%/day sustained is dramatic but not absurd. */
  maxDailyRate: 0.045,
  /** Days of history the consistency term looks back over. */
  consistencyWindow: 14,
  /** Weight of each earned term in g. Must sum to 1. */
  weights: { consistency: 0.5, alignment: 0.3, circle: 0.2 },
  /** Covenant partners at which the network term saturates. */
  circleSaturation: 5,
  /** Yield thresholds, in the units of Mark 4:8. */
  yieldTiers: [
    { at: 1.0, label: 'Hundredfold', ref: 'Mark 4:8' },
    { at: 0.6, label: 'Sixtyfold', ref: 'Mark 4:8' },
    { at: 0.3, label: 'Thirtyfold', ref: 'Mark 4:8' },
    { at: 0.0, label: 'Sown', ref: 'Mark 4:8' },
  ],
};

/**
 * Daily compounding rate for one day.
 * @param {{consistency:number, alignment:number, circle:number}} terms — each 0..1
 * @returns {number} rate in 0..maxDailyRate
 */
export function dailyRate(terms, cfg = GROWTH_CONFIG) {
  const w = cfg.weights;
  const consistency = clamp(terms.consistency ?? 0, 0, 1);
  const alignment = clamp(terms.alignment ?? 0, 0, 1);
  const circle = clamp(terms.circle ?? 0, 0, 1);
  const composite = consistency * w.consistency + alignment * w.alignment + circle * w.circle;
  return clamp(composite, 0, 1) * cfg.maxDailyRate;
}

/**
 * Network term from the Covenant Circle. Saturating, not linear — a hundred
 * shallow contacts do not beat five real ones.
 * @param {number} activePartners partners who moved in the window
 */
export function circleTerm(activePartners, cfg = GROWTH_CONFIG) {
  if (!activePartners || activePartners <= 0) return 0;
  return clamp(
    Math.log(1 + activePartners) / Math.log(1 + cfg.circleSaturation),
    0,
    1,
  );
}

/**
 * Consistency over a trailing window ending at `today`.
 * @param {Set<string>|Array<string>} activeDays day keys with >=1 step
 */
export function consistencyTerm(activeDays, today, cfg = GROWTH_CONFIG) {
  const set = activeDays instanceof Set ? activeDays : new Set(activeDays);
  if (!set.size) return 0;
  const window = cfg.consistencyWindow;
  let hits = 0;
  const days = dayRange(shiftBack(today, window - 1), today);
  for (const d of days) if (set.has(d)) hits++;
  return clamp(hits / window, 0, 1);
}

/**
 * Run both tracks across a span of days.
 *
 * @param {Array<{day:string, steps:number, terms:{consistency:number,alignment:number,circle:number}}>} series
 * @returns {{points:Array, steps:number, increase:number, yield:number, tier:object}}
 */
export function runGrowth(series, cfg = GROWTH_CONFIG) {
  let linear = 0;
  let increase = 0;
  const points = [];

  for (const day of series) {
    const steps = Math.max(0, day.steps || 0);
    const g = dailyRate(day.terms || {}, cfg);

    linear += steps;
    // Compound yesterday's balance, then deposit today's steps.
    increase = increase * (1 + g) + steps;

    points.push({
      day: day.day,
      steps,
      rate: g,
      linear: round2(linear),
      increase: round2(increase),
      gap: round2(increase - linear),
    });
  }

  const y = linear > 0 ? (increase - linear) / linear : 0;
  return {
    points,
    steps: round2(linear),
    increase: round2(increase),
    yield: round2(y),
    tier: yieldTier(y, cfg),
  };
}

export function yieldTier(y, cfg = GROWTH_CONFIG) {
  return cfg.yieldTiers.find((t) => y >= t.at) || cfg.yieldTiers[cfg.yieldTiers.length - 1];
}

/**
 * Project the curve forward under an assumed steady rate — used by the
 * "if you hold this pace" panel. Honest about being a projection.
 */
export function project(fromLinear, fromIncrease, stepsPerDay, rate, days) {
  let L = fromLinear;
  let I = fromIncrease;
  const out = [];
  for (let i = 1; i <= days; i++) {
    L += stepsPerDay;
    I = I * (1 + rate) + stepsPerDay;
    out.push({ dayOffset: i, linear: round2(L), increase: round2(I) });
  }
  return out;
}

/**
 * Days until the Increase curve reaches a multiple of the linear line at a
 * held pace. Returns null if the pace can never get there.
 */
export function daysToYield(targetYield, stepsPerDay, rate, maxDays = 3650) {
  if (rate <= 0 || stepsPerDay <= 0) return null;
  let L = 0;
  let I = 0;
  for (let d = 1; d <= maxDays; d++) {
    L += stepsPerDay;
    I = I * (1 + rate) + stepsPerDay;
    if (L > 0 && (I - L) / L >= targetYield) return d;
  }
  return null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Build the day-series the growth model needs from raw event logs.
 *
 * @param {object} args
 * @param {Array<{day:string, identityId?:string, aligned?:boolean}>} args.completions
 * @param {string} args.from first day key
 * @param {string} args.to   last day key
 * @param {(day:string)=>number} args.activePartnersOn
 */
export function buildSeries({ completions, from, to, activePartnersOn = () => 0 }, cfg = GROWTH_CONFIG) {
  const byDay = new Map();
  for (const c of completions) {
    if (!byDay.has(c.day)) byDay.set(c.day, []);
    byDay.get(c.day).push(c);
  }
  const activeDays = new Set(byDay.keys());

  return dayRange(from, to).map((day) => {
    const todays = byDay.get(day) || [];
    const steps = todays.length;
    const aligned = todays.filter((c) => c.aligned !== false).length;

    return {
      day,
      steps,
      terms: {
        consistency: consistencyTerm(activeDays, day, cfg),
        // No actions today ⇒ no alignment signal; carry 0 rather than inventing one.
        alignment: steps > 0 ? aligned / steps : 0,
        circle: circleTerm(activePartnersOn(day), cfg),
      },
    };
  });
}

/**
 * Terms to SHOW the player, as opposed to the terms used to compound a
 * single day.
 *
 * Today's alignment is 0 until today's first rep lands, so reading the last
 * day alone would tell someone at 9am that identity alignment is their
 * weakest link when in fact they simply have not gone yet. The panel instead
 * averages alignment across recent days that actually had actions.
 */
export function displayTerms(series, cfg = GROWTH_CONFIG) {
  if (!series.length) return { consistency: 0, alignment: 0, circle: 0 };
  const last = series[series.length - 1];
  const window = series.slice(-cfg.consistencyWindow);
  const acted = window.filter((d) => d.steps > 0);
  const alignment = acted.length
    ? acted.reduce((a, d) => a + (d.terms.alignment || 0), 0) / acted.length
    : 0;
  return {
    consistency: last.terms.consistency,
    alignment,
    circle: last.terms.circle,
  };
}

/**
 * Plain-language explanation of why the curve is doing what it is doing.
 * Shown under the chart — the player should never wonder where the number came from.
 */
export function explainRate(terms, cfg = GROWTH_CONFIG) {
  const w = cfg.weights;
  const parts = [
    {
      key: 'consistency',
      label: 'Consistency',
      value: clamp(terms.consistency ?? 0, 0, 1),
      weight: w.consistency,
      why: `Days moved in the last ${cfg.consistencyWindow}. Frequency builds automaticity; intensity does not (Lally 2010).`,
    },
    {
      key: 'alignment',
      label: 'Identity alignment',
      value: clamp(terms.alignment ?? 0, 0, 1),
      weight: w.alignment,
      why: 'Share of your actions that voted for who you said you are (Bem 1972).',
    },
    {
      key: 'circle',
      label: 'Covenant circle',
      value: clamp(terms.circle ?? 0, 0, 1),
      weight: w.circle,
      why: 'Partners moving alongside you. Behaviour spreads through networks (Christakis & Fowler 2007).',
    },
  ];
  const rate = dailyRate(terms, cfg);
  return {
    rate,
    ratePct: Math.round(rate * 10000) / 100,
    parts: parts.map((p) => ({
      ...p,
      contribution: Math.round(p.value * p.weight * cfg.maxDailyRate * 10000) / 100,
    })),
    weakest: parts.slice().sort((a, b) => a.value - b.value)[0],
  };
}
