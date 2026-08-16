/**
 * character.js — the figure you are becoming, made visible.
 *
 * The complaint this answers is a fair one: a wall of text does not feel like
 * a game. So the top of the daily screen is now a living figure that changes
 * as you do — it levels, it gains gear, its ground greens, and its six vitals
 * dim when a part of your life goes untended.
 *
 * It is not a pet. It is you — the person the identity statements name. That
 * is the whole Be > Do > Have idea rendered instead of described: you can
 * literally watch the evidence accumulate into a figure.
 *
 * ── THE ONE RULE THIS FILE KEEPS ─────────────────────────────────────────
 * Neglect DIMS. It never kills, starves, or scolds.
 *
 * A Tamagotchi that dies is using loss aversion, and loss aversion applied to
 * a person's own life goals is the what-the-hell effect waiting to happen
 * (Cochran & Tesser) — one bad week and the whole thing gets abandoned. So a
 * vital fades toward a floor and waits. Coming back lifts it immediately.
 */

import { clamp, daysBetween, dayKey } from './util.js';

/**
 * Stages the figure passes through. Thresholds are levels, and the gear is
 * cumulative — each stage keeps what the last one carried.
 */
export const STAGES = [
  { at: 1, key: 'ember', name: 'Ember', line: 'A spark, and no evidence yet. Everyone starts here.' },
  { at: 3, key: 'lamp', name: 'Lamp', line: 'Enough light for the next step.' },
  { at: 6, key: 'runner', name: 'Runner', line: 'Moving, and it shows.' },
  { at: 11, key: 'builder', name: 'Builder', line: 'Things now exist that did not before.' },
  { at: 18, key: 'steward', name: 'Steward', line: 'Trusted with more than your own.' },
  { at: 27, key: 'watchman', name: 'Watchman', line: 'You see further than your own ground.' },
  { at: 40, key: 'elder', name: 'Elder', line: 'Others are running because you did.' },
];

/** XP needed to reach a level. Gentle early, steepening — a normal RPG curve. */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 2; n <= level; n++) total += Math.round(60 * Math.pow(n - 1, 1.35));
  return total;
}

export function levelFromXp(xp) {
  let level = 1;
  while (level < 200 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function stageFor(level) {
  let s = STAGES[0];
  for (const st of STAGES) if (level >= st.at) s = st;
  return s;
}

export function nextStage(level) {
  return STAGES.find((s) => s.at > level) || null;
}

/**
 * A territory's vital: how tended this part of your life is right now.
 *
 * Half-life decay from the last time you did something there, lifted by how
 * much you have done there overall. Floors at 0.12 — dim, never dark, never
 * gone. Coming back after a month lifts it the moment you act.
 */
export function vitalFor({ lastDay, total, today = dayKey(), halfLife = 6 }) {
  if (!lastDay || !total) return { value: 0.12, days: null, state: 'untouched' };
  const days = Math.max(0, daysBetween(lastDay, today));
  const freshness = Math.pow(0.5, days / halfLife);
  // Depth: a territory you have worked twenty times holds its colour longer.
  const depth = clamp(Math.log(1 + total) / Math.log(1 + 20), 0, 1);
  const value = clamp(0.12 + (0.88 * freshness) * (0.55 + 0.45 * depth), 0.12, 1);
  return {
    value,
    days,
    total,
    state: days === 0 ? 'tended' : days <= 3 ? 'warm' : days <= 10 ? 'cooling' : 'waiting',
  };
}

/**
 * Read the whole character from game state.
 *
 * @param {object} state
 * @param {object} read situational read from guide.js
 */
export function readCharacter(state, read, DOMAINS) {
  const completed = state.quests.filter((q) => q.completedAt);
  const deeds = state.deeds || [];

  // XP: steps carry the most, focus minutes and logged deeds carry real weight.
  const stepXp = completed.reduce((a, q) => a + (q.xpAwarded || 20), 0);
  const focusXp = state.focusBlocks.reduce((a, b) => a + Math.round((b.minutes || 0) * 0.8), 0);
  const deedXp = deeds.reduce((a, d) => a + (d.xp || 15), 0);
  const stoneXp = state.stones.filter((s) => s.completedAt).length * 150;
  const xp = stepXp + focusXp + deedXp + stoneXp;

  const level = levelFromXp(xp);
  const stage = stageFor(level);
  const next = nextStage(level);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);

  // Vitals, one per territory, from steps AND logged deeds.
  const vitals = {};
  for (const d of DOMAINS) {
    const events = [
      ...completed
        .map((q) => ({ day: dayKey(new Date(q.completedAt)), domain: domainOfQuest(q, state) }))
        .filter((e) => e.domain === d.key),
      ...deeds.filter((x) => x.domain === d.key).map((x) => ({ day: x.day })),
    ].sort((a, b) => (a.day < b.day ? 1 : -1));

    vitals[d.key] = {
      ...vitalFor({ lastDay: events[0]?.day, total: events.length, today: read.today }),
      domain: d,
    };
  }

  const values = Object.values(vitals).map((v) => v.value);
  const wholeness = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const weakest = Object.values(vitals).sort((a, b) => a.value - b.value)[0];

  return {
    xp,
    level,
    stage,
    nextStage: next,
    intoLevel: xp - floor,
    levelSpan: Math.max(1, ceil - floor),
    levelProgress: clamp((xp - floor) / Math.max(1, ceil - floor), 0, 1),
    xpToNext: Math.max(0, ceil - xp),
    vitals,
    wholeness,
    weakest,
    streak: read.streak.current,
    grace: read.streak.tokens,
    resting: Boolean(read.sabbath.locked),
    name: state.player.newName || state.player.name || 'Runner',
    breakdown: { stepXp, focusXp, deedXp, stoneXp },
  };
}

/** Which territory a completed quest belongs to, via its stone. */
function domainOfQuest(quest, state) {
  const stone = state.stones.find((s) => s.id === quest.stoneId);
  if (stone) return stone.domain;
  const identity = state.identities.find((i) => i.id === quest.identityId);
  return identity?.domain || null;
}

/**
 * What the figure has to say about its own condition. One line, in its own
 * voice, chosen from the state — never a scolding.
 */
export function characterMood(ch) {
  if (ch.resting) return { tone: 'rest', line: 'Resting. The lamp is still lit.' };
  if (ch.streak >= 21) return { tone: 'strong', line: `${ch.streak} days standing. This is who you are now.` };
  if (ch.streak >= 7) return { tone: 'strong', line: `${ch.streak} days standing.` };
  if (ch.weakest && ch.weakest.state === 'waiting') {
    return { tone: 'waiting', line: `${ch.weakest.domain.name} has been waiting ${ch.weakest.days} days. It is still there.` };
  }
  if (ch.wholeness > 0.7) return { tone: 'strong', line: 'Every territory is tended.' };
  if (ch.xp === 0) return { tone: 'new', line: 'No evidence yet. That is exactly where Gideon was standing.' };
  return { tone: 'steady', line: 'Steady. One step moves the whole figure.' };
}

/**
 * What to say when the level went up but the stage did not.
 *
 * The stage line is a description of the stage, not of the moment — showing
 * Ember's "no evidence yet" to someone who has just logged a landmark reads
 * as the game ignoring what they did. So a level inside a stage gets its own
 * line, and it always points at the next thing (goal-gradient: the pull is
 * strongest when the remaining distance is visible).
 */
export function levelUpLine(ch) {
  const next = ch.nextStage;
  if (next) return `The figure stands a little taller. ${ch.xpToNext} XP to ${next.name}.`;
  return `The figure stands a little taller. ${ch.xpToNext} XP to level ${ch.level + 1}.`;
}

/** XP a logged deed is worth, by how big the player says it was. */
export const DEED_SIZES = [
  { key: 'small', label: 'Small', xp: 10, line: 'A rep. It counts.' },
  { key: 'real', label: 'Real', xp: 25, line: 'A proper piece of work.' },
  { key: 'big', label: 'Big', xp: 60, line: 'A day that moved something.' },
  { key: 'landmark', label: 'Landmark', xp: 150, line: 'You will remember this one.' },
];

export function deedSize(key) {
  return DEED_SIZES.find((d) => d.key === key) || DEED_SIZES[0];
}
