/**
 * identity.js — BE > DO > HAVE.
 *
 * The world runs HAVE → DO → BE: "when I HAVE the money, I'll DO the things,
 * and then I'll BE free." That order never arrives, because the HAVE is the
 * gate and the gate never opens.
 *
 * Scripture runs it backwards, and so does the evidence:
 *
 *   BE   — God renames Abram "father of many nations" while he is childless
 *          (Gen 17:5), and calls Gideon "thou mighty man of valour" while he
 *          is hiding in a winepress (Judg 6:12). The name comes FIRST.
 *          "…calleth those things which be not as though they were." Rom 4:17
 *
 *   DO   — you then act from the name. Bem (1972) showed the self is INFERRED
 *          from observed behaviour, so every act is a vote you cast and then
 *          witness yourself casting. "Faith without works is dead." Jas 2:17
 *
 *   HAVE — the result is added, not chased. Deliberately demoted in the daily
 *          loop, because Pham & Taylor (1999) found outcome-simulation made
 *          students perform WORSE than controls. "…all these things shall be
 *          added unto you." Matt 6:33
 *
 * This module owns the vote ledger and the tier ladder.
 */

import { clamp, dayRange, pct, shiftBack } from './util.js';

/**
 * The ladder an identity climbs. Thresholds are evidence counts, and the top
 * rung is set at 66 deliberately: Lally et al. (2010) found a MEDIAN of 66
 * days for a behaviour to reach its automaticity plateau.
 */
export const IDENTITY_TIERS = [
  {
    key: 'called',
    name: 'Called',
    minVotes: 0,
    minRate: 0,
    ref: 'Judges 6:12',
    line: 'Named before the evidence exists. This is not pretending — it is the order God uses.',
  },
  {
    key: 'reckoned',
    name: 'Reckoned',
    minVotes: 3,
    minRate: 0.5,
    ref: 'Romans 6:11',
    line: '"Reckon" is an accounting word. It is on the books now, and you are beginning to live off the balance.',
  },
  {
    key: 'evidenced',
    name: 'Evidenced',
    minVotes: 12,
    minRate: 0.6,
    ref: 'Hebrews 11:1',
    line: 'There is now a body of evidence. Faith is the substance of things hoped for — and you are producing the substance.',
  },
  {
    key: 'established',
    name: 'Established',
    minVotes: 30,
    minRate: 0.7,
    ref: 'Proverbs 16:3',
    line: 'Your thoughts are established. This identity now survives days when you do not feel like it.',
  },
  {
    key: 'second_nature',
    name: 'Second Nature',
    minVotes: 66,
    minRate: 0.8,
    ref: '2 Corinthians 5:17',
    line: 'The plateau. Lally found a median of 66 days to automaticity; you are past it. Old things are passed away.',
  },
];

/** Words too vague to function as a possible self (Markus & Nurius 1986). */
const VAGUE_TERMS = [
  'successful', 'happy', 'better', 'rich', 'great', 'good', 'healthy',
  'wealthy', 'productive', 'motivated', 'disciplined', 'consistent',
  'amazing', 'winner', 'best', 'strong', 'fit', 'blessed', 'free',
];

/**
 * Validate an identity statement.
 *
 * Rejects abstractions on purpose. Markus & Nurius (1986) found that the
 * SPECIFICITY of a future-self representation predicts effort toward it —
 * "I am successful" is a mood, "I am a man who trains before sunrise" is a
 * blueprint. The gate is the mechanic.
 *
 * @param {string} statement e.g. "I am a man who trains before sunrise"
 */
export function validateIdentity(statement) {
  const errors = [];
  const raw = String(statement || '').trim();

  if (!raw) {
    return { ok: false, errors: [{ code: 'empty', message: 'Name who you are becoming.' }] };
  }

  const lower = raw.toLowerCase();

  if (!/^i\s+am\b/.test(lower)) {
    errors.push({
      code: 'not_present_tense',
      message: 'Begin with "I am". Not "I want to be", not "I will be" — the name comes before the evidence.',
      help: 'Romans 4:17 — God "calleth those things which be not as though they were."',
    });
  }

  if (/\b(want|trying|hope|wish|will be|going to|someday|one day)\b/.test(lower)) {
    errors.push({
      code: 'future_tense',
      message: 'Aspiration language postpones the identity. State it as already true.',
      help: 'Gideon was called a mighty man of valour while hiding in a winepress.',
    });
  }

  // Must contain an observable behaviour, not just an adjective.
  const hasWho = /\bwho\b|\bthat\b/.test(lower);
  const verbish = /\b\w+(s|es|ing)\b/.test(lower.replace(/^i\s+am\s+/, ''));
  if (!hasWho || !verbish) {
    errors.push({
      code: 'no_behaviour',
      message: 'Name a behaviour someone could watch you do. Try "I am a person who ___".',
      help: 'Markus & Nurius (1986): vague possible selves do not drive effort. Specific ones do.',
    });
  }

  const tail = lower.replace(/^i\s+am\s+(a|an|the)?\s*/, '').trim();
  const onlyVague = VAGUE_TERMS.some((t) => tail === t || tail === `${t} person` || tail === `${t} man` || tail === `${t} woman`);
  if (onlyVague) {
    errors.push({
      code: 'vague',
      message: `"${tail}" is a feeling, not a self. What does that person actually DO on a Tuesday?`,
      help: 'Possible-selves research: the concrete beats the aspirational every time.',
    });
  }

  if (raw.length < 12) {
    errors.push({ code: 'too_short', message: 'Say more. One clause with a real action in it.' });
  }

  return { ok: errors.length === 0, errors, normalized: raw };
}

/**
 * Tally the evidence for one identity.
 *
 * @param {Array<{identityId:string, day:string, for:boolean}>} votes
 * @param {string} identityId
 * @param {object} opts
 * @param {number} opts.window rolling window in days for the RATE (default 30)
 * @param {string} opts.today
 */
export function tallyIdentity(votes, identityId, { window = 30, today } = {}) {
  const mine = votes.filter((v) => v.identityId === identityId);
  const forVotes = mine.filter((v) => v.for !== false);
  const againstVotes = mine.filter((v) => v.for === false);

  let windowed = mine;
  if (today) {
    const days = new Set(dayRange(shiftBack(today, window - 1), today));
    windowed = mine.filter((v) => days.has(v.day));
  }
  const winFor = windowed.filter((v) => v.for !== false).length;
  const winTotal = windowed.length;
  const rate = winTotal > 0 ? winFor / winTotal : 0;

  const tier = tierFor(forVotes.length, rate);
  const next = IDENTITY_TIERS[IDENTITY_TIERS.indexOf(tier) + 1] || null;

  return {
    identityId,
    votesFor: forVotes.length,
    votesAgainst: againstVotes.length,
    total: mine.length,
    windowFor: winFor,
    windowTotal: winTotal,
    /** 0..1 — the share of recent actions that voted FOR this self. */
    rate,
    ratePct: pct(rate),
    tier,
    nextTier: next,
    votesToNext: next ? Math.max(0, next.minVotes - forVotes.length) : 0,
    rateToNext: next ? Math.max(0, next.minRate - rate) : 0,
    /** Lally's asymptotic automaticity curve, plateau ~66 reps. */
    automaticity: automaticityAt(forVotes.length),
  };
}

export function tierFor(votesFor, rate) {
  let current = IDENTITY_TIERS[0];
  for (const t of IDENTITY_TIERS) {
    if (votesFor >= t.minVotes && rate >= t.minRate) current = t;
  }
  return current;
}

/**
 * Habit automaticity as an asymptotic curve (Lally et al. 2010).
 * a(n) = 1 − e^(−n/k), k chosen so a(66) ≈ 0.80 — the observed median plateau.
 */
export function automaticityAt(reps) {
  const k = 41; // −66 / ln(0.2)  ≈ 41
  // Ceiling below 1: the curve is asymptotic, and at large rep counts the
  // exponential underflows to exactly 0 in floating point, which would
  // display a habit as "100% automatic". Lally's curve never gets there.
  return clamp(1 - Math.exp(-Math.max(0, reps) / k), 0, 0.999);
}

/**
 * The sentence the game says instead of "task complete".
 * This IS the Be>Do>Have mechanic surfacing — never report a task, always
 * report what the action proved about the person.
 */
export function evidenceStatement(identity, tally) {
  const name = identity?.statement || 'this self';
  if (tally.total === 0) {
    return {
      headline: `${name} — called, not yet witnessed.`,
      body: 'No evidence has been cast yet. Gideon was hiding in a winepress, threshing wheat in fear, when the angel called him a mighty man of valour. The name came first. The evidence came after.',
      ref: 'Judges 6:12',
    };
  }
  return {
    headline: `The evidence says: ${name} — ${tally.ratePct}% of the time.`,
    body:
      tally.rate >= 0.8
        ? 'You are not deciding to be this person any more. You are watching yourself be them.'
        : tally.rate >= 0.5
          ? 'The ledger is tipping in your favour. Keep casting votes.'
          : 'The evidence is currently voting for the old self. That is information, not condemnation — one vote today changes the tally.',
    ref: tally.tier.ref,
  };
}

/**
 * The BE>DO>HAVE chain for one vision Stone: which identity does this HAVE
 * belong to, and what is the next vote available today?
 */
export function chainFor(stone, identities, quests) {
  const identity = identities.find((i) => i.id === stone.identityId) || null;
  const linked = quests.filter((q) => q.stoneId === stone.id && !q.archived);
  const open = linked.filter((q) => !q.completedAt);
  return {
    be: identity,
    do: open,
    have: stone,
    ready: Boolean(identity) && open.length > 0,
    missing: !identity ? 'be' : open.length === 0 ? 'do' : null,
  };
}

/** Suggested new-name archetypes. Renaming is the oldest identity technology in the book. */
export const NAME_ARCHETYPES = [
  { name: 'Caleb', meaning: 'wholehearted', ref: 'Numbers 13:30', line: 'Stilled the people and said, let us go up at once — while ten others reported giants.' },
  { name: 'Gideon', meaning: 'mighty man of valour', ref: 'Judges 6:12', line: 'Called by the name before the courage arrived.' },
  { name: 'Abraham', meaning: 'father of many', ref: 'Genesis 17:5', line: 'Renamed for a future that had not begun.' },
  { name: 'Israel', meaning: 'one who prevails', ref: 'Genesis 32:28', line: 'Renamed after wrestling until daybreak.' },
  { name: 'Peter', meaning: 'the rock', ref: 'John 1:42', line: 'Named "rock" while still the most unstable man in the room.' },
  { name: 'Barnabas', meaning: 'son of consolation', ref: 'Acts 4:36', line: 'Renamed for the effect he had on other people.' },
  { name: 'Deborah', meaning: 'one who judges and leads', ref: 'Judges 4:4', line: 'Led a nation from under a palm tree.' },
  { name: 'Esther', meaning: 'for such a time as this', ref: 'Esther 4:14', line: 'Positioned before she understood the assignment.' },
];
