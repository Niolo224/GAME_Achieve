/**
 * engine.js — the rules of play.
 *
 * Five subsystems, each one traceable to a study and a verse:
 *   1. The WOOP Gate         — Oettingen (2012)      / Luke 14:28
 *   2. If-then quests        — Gollwitzer & Sheeran  / Ecclesiastes 3:1
 *   3. The Calibration Engine— Wilson et al. (2019)  / Luke 16:10
 *   4. XP, goal gradient, Manna — Schultz (1997), Kivetz (2006) / Exodus 16
 *   5. Grace & restoration   — Lally (2010), Cochran & Tesser / Proverbs 24:16
 */

import { clamp, seededRandom, hashStr, dayKey, addDays, daysBetween, weekdayOf } from './util.js';

// ─────────────────────────────────────────────────────────────────────────
// 1. THE WOOP GATE
//    A vision Stone stays veiled and inert until it has been contrasted.
//    This is the hardest gate in the game, and it is the most important one.
//    Oettingen's finding is blunt: positive fantasy ALONE predicts LOWER
//    attainment. An uncontrasted vision board is not neutral — it is a
//    documented de-motivator, because indulging the feeling of having
//    arrived discharges the energy needed to go.
//    Christ said it first: sit down FIRST and count the cost. (Luke 14:28)
// ─────────────────────────────────────────────────────────────────────────

/** Obstacles that point outward. WOOP requires the INNER one. */
const EXTERNAL_OBSTACLE_HINTS = [
  'no time', 'no money', 'economy', 'my boss', 'my job', 'my wife', 'my husband',
  'my parents', 'the government', 'other people', 'they ', 'nobody ', 'everyone ',
  'not enough time', 'too busy', 'the market',
];

export function validateWoop(woop = {}) {
  const errors = [];
  const f = (k) => String(woop[k] || '').trim();

  if (f('wish').length < 4) {
    errors.push({ field: 'wish', message: 'Name the wish in your own words.' });
  }
  if (f('outcome').length < 8) {
    errors.push({
      field: 'outcome',
      message: 'Describe the best outcome vividly — what does it actually feel like?',
      help: 'The vivid outcome is what generates the energy that contrasting then aims.',
    });
  }

  const obstacle = f('obstacle');
  if (obstacle.length < 8) {
    errors.push({
      field: 'obstacle',
      message: 'Name the obstacle INSIDE you. This is the step people skip, and skipping it is what makes vision boards fail.',
      help: 'Oettingen (2012): fantasy without contrasting predicts LOWER attainment.',
    });
  } else {
    const lower = obstacle.toLowerCase();
    const external = EXTERNAL_OBSTACLE_HINTS.find((h) => lower.includes(h));
    if (external) {
      errors.push({
        field: 'obstacle',
        code: 'external',
        message: `"${external.trim()}" is outside you. WOOP only works on the inner obstacle — the habit, the fear, the story you tell at the moment of choice.`,
        help: 'Try: "I tell myself I will do it later, and then I do not."',
      });
    }
  }

  const plan = f('plan');
  const planCheck = validateIfThen(plan);
  if (!planCheck.ok) {
    errors.push({
      field: 'plan',
      message: 'The plan must be if-then: "When [obstacle appears], I will [specific response]."',
      help: 'Gollwitzer & Sheeran (2006), 94 studies, d = 0.65 — if-then roughly doubles attainment.',
      detail: planCheck.errors,
    });
  }

  return { ok: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. IF-THEN QUESTS
//    The composer refuses a bare verb. "Go to the gym" is a goal intention.
//    "When I put my keys down after work, I will change into my shoes
//    immediately" is an implementation intention, and it hands control from
//    effortful prefrontal deliberation to an automatic cue-driven response.
// ─────────────────────────────────────────────────────────────────────────

const CUE_MARKERS = /\b(when|after|before|as soon as|the moment|once|if|every time|upon)\b/i;
const TIME_MARKERS = /\b(\d{1,2}\s*(am|pm)|\d{1,2}:\d{2}|morning|noon|evening|night|sunrise|sunset|breakfast|lunch|dinner|bed|wake|waking)\b/i;

export function validateIfThen(text) {
  const errors = [];
  const raw = String(text || '').trim();

  if (!raw) {
    return { ok: false, errors: [{ code: 'empty', message: 'Write the quest as an if-then.' }] };
  }

  const hasCue = CUE_MARKERS.test(raw) || TIME_MARKERS.test(raw);
  if (!hasCue) {
    errors.push({
      code: 'no_cue',
      message: 'No cue. Start with "When…", "After…", or a specific time.',
      help: 'A cue is what fires the behaviour without you having to decide again.',
    });
  }

  const hasAction = /\bi\s+will\b|\bi'?ll\b/i.test(raw);
  if (!hasAction) {
    errors.push({
      code: 'no_action',
      message: 'No committed action. The second half must be "…I will [do the specific thing]."',
    });
  }

  if (raw.length < 15) {
    errors.push({ code: 'too_vague', message: 'Too short to be specific enough to fire automatically.' });
  }

  return {
    ok: errors.length === 0,
    errors,
    hasCue,
    hasAction,
    hasTime: TIME_MARKERS.test(raw),
    hasPlace: /\bat\s+(the\s+)?\w+|\bin\s+(the\s+)?\w+/i.test(raw),
  };
}

/** Compose a valid if-then from structured parts. */
export function composeIfThen({ cue, action, place }) {
  const c = String(cue || '').trim().replace(/^when\s+/i, '');
  const a = String(action || '').trim().replace(/^i\s+will\s+/i, '');
  const p = String(place || '').trim();
  if (!c || !a) return '';
  return `When ${c}, I will ${a}${p ? ` at ${p}` : ''}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. THE CALIBRATION ENGINE
//    Wilson et al. (2019) put the optimal training point near 85% success —
//    hard enough to generate an error signal, easy enough to remain
//    trainable. The game therefore watches your real completion rate and
//    resizes the ask, out loud. "Faithful in that which is least." Luke 16:10
// ─────────────────────────────────────────────────────────────────────────

export const CALIBRATION = {
  target: 0.85,
  band: [0.6, 0.9],
  minSample: 4,
  window: 12,
};

export function calibrate(recentOutcomes, cfg = CALIBRATION) {
  const sample = recentOutcomes.slice(-cfg.window);
  const n = sample.length;

  if (n < cfg.minSample) {
    return {
      action: 'hold',
      rate: n ? sample.filter(Boolean).length / n : 0,
      sample: n,
      confident: false,
      message: `Still learning your real capacity — ${cfg.minSample - n} more rep${cfg.minSample - n === 1 ? '' : 's'} before the game starts resizing your steps.`,
      ref: 'Luke 16:10',
    };
  }

  const rate = sample.filter(Boolean).length / n;
  const [lo, hi] = cfg.band;

  if (rate > hi) {
    return {
      action: 'increase',
      rate,
      sample: n,
      confident: true,
      delta: +1,
      message: `You are completing ${Math.round(rate * 100)}% — above the ${Math.round(hi * 100)}% ceiling. The step is too small to teach you anything. Making the next one bigger.`,
      why: 'Learning needs an error signal. A task you never fail produces none (Wilson et al. 2019).',
      ref: 'Matthew 25:21',
    };
  }
  if (rate < lo) {
    return {
      action: 'decrease',
      rate,
      sample: n,
      confident: true,
      delta: -1,
      message: `You are completing ${Math.round(rate * 100)}% — under the ${Math.round(lo * 100)}% floor. That is not a character problem, it is a sizing problem. Shrinking the next step.`,
      why: 'Below the band, failure stops carrying information and starts carrying shame.',
      ref: 'Zechariah 4:10',
    };
  }
  return {
    action: 'hold',
    rate,
    sample: n,
    confident: true,
    delta: 0,
    message: `${Math.round(rate * 100)}% completion — inside the training band. This is exactly where learning is fastest. Holding the size.`,
    why: 'Optimal learning sits near 85% success (Wilson et al. 2019).',
    ref: 'Psalm 37:23',
  };
}

/** Quest difficulty ladder the calibrator moves you along. */
export const DIFFICULTY = [
  { level: 1, name: 'Seed', minutes: 5, xp: 10, line: 'A grain of mustard seed.' },
  { level: 2, name: 'Step', minutes: 15, xp: 20, line: 'One ordered step.' },
  { level: 3, name: 'Stretch', minutes: 30, xp: 35, line: 'Beyond comfortable.' },
  { level: 4, name: 'Climb', minutes: 60, xp: 60, line: 'A real ascent.' },
  { level: 5, name: 'Siege', minutes: 120, xp: 100, line: 'Walls come down slowly.' },
];

export function adjustDifficulty(current, delta) {
  return clamp(current + delta, 1, DIFFICULTY.length);
}

export function difficulty(level) {
  return DIFFICULTY[clamp(level, 1, DIFFICULTY.length) - 1];
}

// ─────────────────────────────────────────────────────────────────────────
// 4. XP, GOAL GRADIENT, AND MANNA
//    Schultz (1997): dopamine encodes reward MINUS expectation. A fully
//    predicted reward teaches nothing. So the predictable payout is kept
//    modest and honest, and the learning signal comes from Manna landing on
//    a variable-ratio schedule (Ferster & Skinner 1957) — the schedule with
//    the highest persistence and the greatest resistance to extinction.
//
//    Manna cannot be hoarded. Exodus 16:20: what was kept overnight "bred
//    worms, and stank." Unspent Manna decays, which is both the scripture
//    and the correct anti-addiction design.
// ─────────────────────────────────────────────────────────────────────────

export const REWARD = {
  mannaChance: 0.25,          // average 1 in 4 — variable ratio, never fixed
  mannaDailyCap: 3,           // hard ceiling. This is a person's life, not a casino.
  mannaDecayDays: 2,          // unspent manna spoils
  gradientMax: 1.6,           // XP multiplier at the very edge of completion
  focusBonus: 0.5,            // attention-gated plasticity premium
  sealedBonus: 0.15,          // public commitment premium (Cialdini)
};

/**
 * Goal-gradient multiplier. Effort accelerates as the goal nears, so the
 * reward should too (Kivetz et al. 2006).
 * @param {number} progress 0..1 completion of the parent Stone
 */
export function gradientMultiplier(progress, cfg = REWARD) {
  const p = clamp(progress || 0, 0, 1);
  return 1 + (cfg.gradientMax - 1) * Math.pow(p, 1.5);
}

/**
 * Award for one completed quest.
 *
 * @param {object} args
 * @param {number} args.level difficulty level 1..5
 * @param {number} args.stoneProgress 0..1
 * @param {boolean} args.focused completed inside an Upper Room focus block
 * @param {boolean} args.sealed sealed to the Covenant Circle
 * @param {number} args.mannaToday manna already granted today
 * @param {string} args.seed deterministic seed (questId + day)
 */
export function awardFor({ level = 1, stoneProgress = 0, focused = false, sealed = false, mannaToday = 0, seed = '' }, cfg = REWARD) {
  const base = difficulty(level).xp;
  const gradient = gradientMultiplier(stoneProgress, cfg);
  let xp = base * gradient;
  const bonuses = [];

  if (focused) {
    xp *= 1 + cfg.focusBonus;
    bonuses.push({ key: 'focus', label: 'Upper Room', why: 'Plasticity is gated by attention (Recanzone/Merzenich 1993).' });
  }
  if (sealed) {
    xp *= 1 + cfg.sealedBonus;
    bonuses.push({ key: 'sealed', label: 'Sealed to the Circle', why: 'Witnessed commitments are kept more often (Cialdini).' });
  }

  // Variable-ratio Manna, hard-capped per day.
  const rng = seededRandom(hashStr(String(seed)));
  const roll = rng();
  const manna = mannaToday < cfg.mannaDailyCap && roll < cfg.mannaChance;

  return {
    xp: Math.round(xp),
    baseXp: base,
    gradient: Math.round(gradient * 100) / 100,
    bonuses,
    manna,
    mannaRoll: Math.round(roll * 1000) / 1000,
    /** True when the payout exceeded the plain expectation — the RPE moment. */
    surprise: manna || gradient > 1.25,
  };
}

/** Expire manna older than the decay window. Exodus 16:20. */
export function decayManna(mannaGrants, today, cfg = REWARD) {
  const kept = [];
  const spoiled = [];
  for (const g of mannaGrants) {
    if (g.spent) { kept.push(g); continue; }
    const age = daysBetween(g.day, today);
    if (age > cfg.mannaDecayDays) spoiled.push(g);
    else kept.push(g);
  }
  return { kept, spoiled, spoiledCount: spoiled.length };
}

// ─────────────────────────────────────────────────────────────────────────
// 5. GRACE, STREAKS AND RESTORATION
//    The most common mechanic in habit apps is also the most destructive:
//    miss one day, lose everything. Lally (2010) found a single missed day
//    did NOT measurably harm the automaticity trajectory — so zeroing the
//    streak is not just cruel, it is factually wrong. And the all-or-nothing
//    framing triggers the what-the-hell effect: the lapse does little damage,
//    the interpretation does.
//
//    See Proverbs 24:16 and Lamentations 3:23, both printed in full in the UI.
// ─────────────────────────────────────────────────────────────────────────

export const GRACE = {
  maxTokens: 3,
  /** You begin with grace already in hand. It is not earned first — that is the point of it. */
  startingTokens: 1,
  earnEveryNActiveDays: 7,
  momentumPenalty: 0.25,   // a covered miss costs momentum, not the streak
};

/**
 * Walk the calendar and produce the streak state.
 *
 * @param {Array<string>} activeDays day keys with >=1 completion
 * @param {string} today
 */
export function computeStreak(activeDays, today, cfg = GRACE) {
  const set = new Set(activeDays);
  if (!set.size) {
    return {
      current: 0, longest: 0, tokens: cfg.startingTokens, tokensSpent: 0,
      state: 'unbegun', momentum: 0, missedDays: [],
      message: 'Nothing counted yet. The first vote is the whole game.',
      ref: 'Zechariah 4:10',
    };
  }

  const sorted = [...set].sort();
  const first = sorted[0];

  let current = 0;
  let longest = 0;
  let tokens = cfg.startingTokens;
  let tokensSpent = 0;
  let activeCount = 0;
  const missedDays = [];
  let cursor = first;
  let todayPending = false;

  while (true) {
    const active = set.has(cursor);

    // Today is not over. An unfinished today is not a missed day — the game
    // must never tell someone at 9am that their run has ended.
    if (!active && cursor === today) {
      todayPending = true;
      break;
    }

    if (active) {
      current += 1;
      activeCount += 1;
      if (activeCount % cfg.earnEveryNActiveDays === 0) {
        tokens = Math.min(cfg.maxTokens, tokens + 1);
      }
    } else {
      missedDays.push(cursor);
      if (tokens > 0) {
        // Grace covers the gap. The streak survives; momentum takes the hit.
        tokens -= 1;
        tokensSpent += 1;
      } else {
        // No token left — the run ends, but lifetime totals are never erased.
        longest = Math.max(longest, current);
        current = 0;
      }
    }

    longest = Math.max(longest, current);
    if (cursor === today) break;
    cursor = addDays(cursor, 1);
    // Safety: never walk past today.
    if (daysBetween(cursor, today) < 0) break;
  }

  const coveredRecently = missedDays.filter((d) => daysBetween(d, today) <= 7).length;
  const momentum = clamp(1 - coveredRecently * cfg.momentumPenalty, 0, 1);

  let state = 'running';
  let message = `${current} day${current === 1 ? '' : 's'} standing.`;
  let ref = 'Psalm 1:3';

  if (todayPending && current > 0) {
    message = `${current} day${current === 1 ? '' : 's'} standing. Today is still open.`;
  } else if (current === 0) {
    state = 'restoration';
    message = 'The run ended — but nothing you built was erased. This is a return, not a restart.';
    ref = 'Isaiah 43:19';
  } else if (tokensSpent > 0 && missedDays.some((d) => daysBetween(d, today) <= 2)) {
    state = 'graced';
    message = 'You missed, and grace covered it. The streak stands. Momentum is lighter — earn it back today.';
    ref = 'Lamentations 3:23';
  }

  return {
    current,
    longest,
    tokens,
    tokensSpent,
    state,
    momentum,
    missedDays,
    todayPending,
    message,
    ref,
  };
}

/**
 * The fresh-start framing after a break (Dai, Milkman & Riis 2014).
 * A return is dated as a NEW SEASON, never as a resumed failure.
 */
export function restorationFraming(lastActiveDay, today) {
  const gap = lastActiveDay ? daysBetween(lastActiveDay, today) : 0;
  return {
    gap,
    title: gap >= 14 ? 'A new thing' : gap >= 3 ? 'A new season' : 'A new morning',
    body:
      gap >= 14
        ? 'It has been a while. Scripture does not treat that as disqualification — it treats it as the setting for a new thing. Nothing you built has been deleted.'
        : gap >= 3
          ? 'A few days passed. The evidence you already banked is still on the books. Cast one vote and the tally moves today.'
          : 'Yesterday is closed. His compassions are new this morning.',
    ref: gap >= 14 ? 'Isaiah 43:19' : 'Lamentations 3:23',
    /** Deliberately tiny — re-entry must be easy or it will not happen. */
    suggestedLevel: 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 6. THE SABBATH LOCK
//    A game that refuses to let you play. Sonnentag & Fritz (2007) found
//    psychological DETACHMENT predicts recovery better than rest alone,
//    so the lock has to actually withhold the quests.
//    See Exodus 20:8, printed in full in the UI.
// ─────────────────────────────────────────────────────────────────────────

export function sabbathState(settings, today) {
  if (!settings?.sabbathEnabled) return { locked: false, enabled: false };
  const dow = weekdayOf(today);
  const locked = dow === (settings.sabbathDay ?? 0);
  return {
    enabled: true,
    locked,
    day: settings.sabbathDay ?? 0,
    message: locked
      ? 'The Sabbath lock is on. No quests today — this is not the game breaking, it is the game working. Detachment is what makes the next six days possible.'
      : null,
    ref: 'Exodus 20:8',
    allowed: locked ? ['reflect', 'circle', 'recap', 'chronicle'] : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 7. THE UPPER ROOM — focus blocks with mandatory stillness
// ─────────────────────────────────────────────────────────────────────────

export const FOCUS_PRESETS = [
  { minutes: 25, rest: 5, name: 'Watch', ref: 'Matthew 26:40', line: 'Could ye not watch with me one hour?' },
  { minutes: 50, rest: 10, name: 'Ascent', ref: 'Psalm 24:3', line: 'Who shall ascend into the hill of the LORD?' },
  { minutes: 90, rest: 20, name: 'Upper Room', ref: 'Acts 1:13', line: 'They went up into an upper room, and continued.' },
];

/**
 * Growth credit for a focus block. Skipping the stillness window forfeits
 * part of it — Foster & Wilson (2006) showed post-training quiet rest
 * produces the compressed replay that predicts later performance.
 */
export function focusCredit({ minutes, restTaken, restRequired }) {
  const base = minutes;
  const restRatio = restRequired > 0 ? clamp((restTaken || 0) / restRequired, 0, 1) : 1;
  const consolidation = 0.7 + 0.3 * restRatio;
  return {
    raw: base,
    credited: Math.round(base * consolidation),
    consolidation: Math.round(consolidation * 100) / 100,
    forfeited: Math.round(base * (1 - consolidation)),
    message:
      restRatio >= 1
        ? 'Full consolidation credit. The stillness is where the replay happens.'
        : `Partial credit — you skipped ${Math.round((1 - restRatio) * 100)}% of the stillness. Quiet rest right after practice is when the sequence replays.`,
    ref: 'Psalm 46:10',
  };
}

/** Refuse to chain more than two blocks without real recovery (ultradian limit). */
export function canStartFocus(blocksToday, lastBlockEndedAt, now = Date.now()) {
  const recent = blocksToday.filter((b) => now - b.endedAt < 3 * 3600 * 1000);
  if (recent.length < 2) return { ok: true };
  const sinceLast = lastBlockEndedAt ? now - lastBlockEndedAt : Infinity;
  if (sinceLast < 20 * 60 * 1000) {
    return {
      ok: false,
      message: 'Two blocks back to back is the ceiling. Vigilance is already degrading; take twenty minutes properly.',
      ref: 'Isaiah 40:31',
      waitMs: 20 * 60 * 1000 - sinceLast,
    };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// 8. STONE PROGRESS — the HAVE, unlocked by evidence rather than stared at
// ─────────────────────────────────────────────────────────────────────────

export function stoneProgress(stone, quests) {
  const linked = quests.filter((q) => q.stoneId === stone.id && !q.archived);
  if (!linked.length) return { progress: 0, done: 0, total: 0, veiled: !stone.woopComplete };
  const done = linked.filter((q) => q.completedAt).length;
  const progress = done / linked.length;
  return {
    progress,
    done,
    total: linked.length,
    veiled: !stone.woopComplete,
    /** Distance remaining, per the goal-gradient framing — never a raw count. */
    remaining: linked.length - done,
    /**
     * Kivetz (2006) is about proximity to the goal, not the ratio: one step
     * left is maximum proximity however many there were to begin with.
     */
    nearing: progress >= 0.7 || linked.length - done <= 1,
  };
}
