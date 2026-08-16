/**
 * guide.js — The Shepherd's lamp.
 *
 * This is what makes ACHIEVE a guidance system rather than a tracker. On
 * every open it reads the whole state, decides WHERE THE PLAYER ACTUALLY IS,
 * and returns exactly one next step, the Word that meets that state, and the
 * mechanism note explaining why this step and not another.
 *
 * A deliberate design constraint: ONE step. Not a list, not a dashboard of
 * competing priorities.
 *
 * The design follows the image in Psalm 119:105 (printed in full in the UI):
 * a lamp at the feet lights the next step, not the whole road.
 *
 * On the guide's voice: it never speaks AS Christ and never puts words in
 * His mouth. It carries the lamp — it surfaces His actual words and points
 * at the next piece of ground. The Shepherd leads; this is just the light.
 */

import { dayKey, daysBetween, hashStr } from './util.js';
import { verseFor, versesFor } from '../data/scripture.js';
import { principle } from '../data/neuro.js';
import { computeStreak, calibrate, sabbathState, stoneProgress, restorationFraming, difficulty } from './engine.js';
import { tallyIdentity, evidenceStatement } from './identity.js';

/**
 * Read the room.
 * @returns {object} a full situational read used by every other function here
 */
export function readState(state, today = dayKey()) {
  const completed = state.quests.filter((q) => q.completedAt);
  const activeDays = [...new Set(completed.map((q) => dayKey(new Date(q.completedAt))))].sort();
  const streak = computeStreak(activeDays, today);
  const sabbath = sabbathState(state.settings, today);

  const recentOutcomes = state.quests
    .filter((q) => q.completedAt || q.failedAt)
    .sort((a, b) => (a.completedAt || a.failedAt) - (b.completedAt || b.failedAt))
    .map((q) => Boolean(q.completedAt));
  const calibration = calibrate(recentOutcomes);

  const doneToday = completed.filter((q) => dayKey(new Date(q.completedAt)) === today).length;
  const lastActive = activeDays[activeDays.length - 1] || null;
  const gap = lastActive ? daysBetween(lastActive, today) : null;

  const openQuests = state.quests.filter((q) => !q.completedAt && !q.archived);
  const veiledStones = state.stones.filter((s) => !s.woopComplete);
  const readyStones = state.stones.filter((s) => s.woopComplete && !s.completedAt);

  return {
    today,
    streak,
    sabbath,
    calibration,
    doneToday,
    lastActive,
    gap,
    activeDays,
    openQuests,
    veiledStones,
    readyStones,
    hasIdentity: state.identities.length > 0,
    hasBoard: state.boards.length > 0 || state.stones.length > 0,
    hasStones: state.stones.length > 0,
    hasCircle: Boolean(state.circle.code),
    totalSteps: completed.length,
    returning: gap !== null && gap >= 2,
  };
}

/**
 * The single next step.
 *
 * The order of these branches IS the game's opinion about what matters. It
 * runs strictly Be → Do → Have: no quests are offered before an identity
 * exists, and no stone is playable before it has been contrasted.
 */
export function nextStep(state, read = readState(state)) {
  const seed = hashStr(read.today + state.player.id);

  // 1. BE — nothing can be built before a name exists.
  if (!read.hasIdentity) {
    return {
      kind: 'name_identity',
      title: 'Before anything else: who are you becoming?',
      body: 'Not what you want to have. Who you are. The name comes first — that is the order God uses, and it is the order the evidence supports.',
      action: { view: 'identity', label: 'Name it' },
      verse: verseFor('be_teaching', seed),
      why: principle('self_perception'),
      tone: 'foundational',
    };
  }

  // 2. HAVE — the vision has to be written and made plain before it can be run with.
  if (!read.hasStones) {
    return {
      kind: 'write_vision',
      title: 'Write the vision. Make it plain.',
      body: 'Upload your vision board and tap each thing on it, or describe them one at a time. Each one becomes a goal you can actually work toward.',
      action: { view: 'vision', label: 'Write it' },
      verse: verseFor('vision_created', seed),
      why: principle('possible_selves'),
      tone: 'foundational',
    };
  }

  // 3. THE WOOP GATE — a stone stays inert until it is contrasted.
  if (read.veiledStones.length && !read.readyStones.length) {
    const stone = read.veiledStones[0];
    return {
      kind: 'woop',
      title: `"${stone.title}" is still veiled.`,
      body: 'A vision you only picture is worse than no vision at all — fantasy alone measurably lowers attainment. Count the cost: name the outcome, the honest inner obstacle, and the if-then plan. Then it kindles.',
      action: { view: 'vision', label: 'Count the cost', stoneId: stone.id },
      verse: verseFor('woop', seed),
      why: principle('mental_contrasting'),
      tone: 'gate',
    };
  }

  // 4. THE SABBATH LOCK — withholds the work, not the preparation.
  //
  // It sits below the setup branches deliberately. Naming who you are,
  // writing the vision and counting a cost are reflection, not labour, and
  // a person opening this for the first time on a Sunday should not be met
  // with a closed door before they have done anything at all. What the
  // Sabbath withholds is the quest.
  if (read.sabbath.locked) {
    return {
      kind: 'sabbath',
      title: 'Today the game is closed.',
      body: read.sabbath.message,
      action: null,
      verse: verseFor('sabbath', seed),
      why: principle('sabbath_recovery'),
      tone: 'rest',
    };
  }

  // 5. RETURNING after a gap — fresh start framing, never a scolding.
  if (read.returning && read.doneToday === 0) {
    const framing = restorationFraming(read.lastActive, read.today);
    return {
      kind: 'restore',
      title: framing.title,
      body: framing.body,
      action: { view: 'today', label: 'Take one small step' },
      verse: verseFor(framing.ref === 'Isaiah 43:19' ? 'restoration' : 'missed_day', seed),
      why: principle('fresh_start_effect'),
      tone: 'mercy',
      suggestedLevel: framing.suggestedLevel,
    };
  }

  // 6. DO — there is a stone ready but no next action bound to it.
  if (read.readyStones.length && !read.openQuests.length) {
    const stone = read.readyStones[0];
    return {
      kind: 'make_quest',
      title: 'A vision without a next action is a wish.',
      body: `"${stone.title}" is kindled but has no next step. Write one as an if-then — that alone roughly doubles the odds you do it.`,
      action: { view: 'today', label: 'Write the if-then', stoneId: stone.id },
      verse: verseFor('if_then', seed),
      why: principle('implementation_intentions'),
      tone: 'action',
    };
  }

  // 7. The daily rep.
  if (read.openQuests.length) {
    const quest = pickQuest(read.openQuests, state, read);
    const stone = state.stones.find((s) => s.id === quest.stoneId);
    const prog = stone ? stoneProgress(stone, state.quests) : { progress: 0, nearing: false };
    return {
      kind: 'do_quest',
      title: read.doneToday > 0 ? 'One more, if there is one more in you.' : 'One step. This one.',
      body: quest.text,
      quest,
      stone,
      action: { view: 'today', label: 'Begin', questId: quest.id },
      verse: verseFor(prog.nearing ? 'exponential' : 'quest_start', seed),
      why: principle(prog.nearing ? 'goal_gradient' : 'implementation_intentions'),
      tone: prog.nearing ? 'nearing' : 'action',
      nearing: prog.nearing,
    };
  }

  // 8. Everything open is done — consolidate rather than manufacture more work.
  return {
    kind: 'consolidate',
    title: read.doneToday > 0 ? 'Today is accounted for.' : 'Nothing is open.',
    body:
      read.doneToday > 0
        ? 'Do not immediately reach for more. Review the one rep that mattered before you sleep — material reviewed before sleep is preferentially consolidated.'
        : 'Write the next if-then, or sit with the Chronicle and read where you have come from.',
    action: { view: read.doneToday > 0 ? 'chronicle' : 'today', label: read.doneToday > 0 ? 'Evening Altar' : 'Write a step' },
    verse: verseFor(read.doneToday > 0 ? 'evening' : 'planning', seed),
    why: principle(read.doneToday > 0 ? 'sleep_consolidation' : 'implementation_intentions'),
    tone: 'rest',
  };
}

/**
 * Choose which open quest to serve.
 * Goal-gradient first: the stone closest to completion gets priority, because
 * that is where effort accelerates naturally (Kivetz 2006). Ties break toward
 * the identity with the weakest evidence — the self that most needs a vote.
 */
export function pickQuest(openQuests, state, read) {
  const scored = openQuests.map((q) => {
    const stone = state.stones.find((s) => s.id === q.stoneId);
    const prog = stone ? stoneProgress(stone, state.quests).progress : 0;
    const tally = q.identityId
      ? tallyIdentity(state.votes, q.identityId, { today: read.today })
      : { rate: 0.5, total: 0 };
    // Nearer the goal is better; weaker evidence is better; sealed is better.
    const score = prog * 2 + (1 - tally.rate) * 0.8 + (q.sealed ? 0.3 : 0);
    return { quest: q, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].quest;
}

/**
 * The Word for the step — a verse chosen for today's actual condition,
 * stable across a single day so a person can sit with one thing.
 */
export function wordForToday(state, read = readState(state)) {
  const moments = [];
  if (read.sabbath.locked) moments.push('sabbath', 'rest');
  else if (read.returning) moments.push('restoration', 'missed_day');
  else if (read.streak.state === 'graced') moments.push('grace_token', 'missed_day');
  else if (read.streak.current >= 7) moments.push('compounding', 'streak');
  else if (read.doneToday > 0) moments.push('quest_complete', 'small_step');
  else if (!read.hasIdentity) moments.push('onboarding', 'be_teaching');
  else moments.push('daily_open');

  const pool = versesFor(moments);
  const seed = hashStr(read.today + (state.player.id || ''));
  const verse = pool.length ? pool[seed % pool.length] : verseFor('daily_open', seed);
  return { verse, moments };
}

/**
 * The Chronicle note written after an accomplishment.
 * "After each, add some notes of what was accomplished." Nothing completes
 * silently — Amabile & Kramer found noticing progress IS part of its effect.
 */
export function accomplishmentNote({ quest, stone, identity, award, tally, read }) {
  const bits = [];
  bits.push(`Completed: ${quest.text}`);
  if (stone) bits.push(`Took ground toward "${stone.title}".`);
  if (award?.manna) bits.push('Manna fell — an unearned surplus on top of the expected reward.');
  if (award?.gradient > 1.2) bits.push(`Goal-gradient bonus ×${award.gradient} — you are close enough that effort is accelerating.`);
  if (read?.streak?.current) bits.push(`${read.streak.current} day${read.streak.current === 1 ? '' : 's'} standing.`);

  const identityLine = identity && tally
    ? evidenceStatement(identity, tally).headline
    : null;

  return {
    kind: 'accomplishment',
    title: identityLine || 'A vote was cast.',
    body: bits.join(' '),
    refs: [
      { ref: 'Hebrews 11:1', why: 'Hebrews describes faith as the evidence of what is not yet seen.' },
      ...(award?.manna ? [{ ref: 'Exodus 16:4', why: 'God promised bread from heaven, to be gathered daily as a test of obedience.' }] : []),
    ],
    meta: { questId: quest.id, stoneId: stone?.id || null, identityId: identity?.id || null, xp: award?.xp || 0 },
  };
}

/**
 * The recap: from where they started, to where they are now.
 * Revelation 12:11 — "by the word of their testimony." Rehearsing the road is
 * not nostalgia; it is how a person keeps hold of what is true on a bad day.
 */
export function buildRecap(state, read = readState(state)) {
  const completed = state.quests.filter((q) => q.completedAt).sort((a, b) => a.completedAt - b.completedAt);
  const first = completed[0];
  const started = state.player.createdAt;
  const daysIn = Math.max(1, Math.round((Date.now() - started) / 86400000));

  const identityGrowth = state.identities.map((i) => {
    const tally = tallyIdentity(state.votes, i.id, { today: read.today });
    const earliest = state.votes.filter((v) => v.identityId === i.id).sort((a, b) => a.ts - b.ts)[0];
    return {
      identity: i,
      tally,
      firstVoteAt: earliest?.ts || null,
      tier: tally.tier,
    };
  });

  const milestones = [];
  if (started) milestones.push({ ts: started, kind: 'origin', title: 'The vision was written', ref: 'Habakkuk 2:2' });
  for (const i of state.identities) {
    milestones.push({ ts: i.createdAt, kind: 'identity', title: `Named: ${i.statement}`, ref: 'Romans 4:17' });
  }
  if (first) milestones.push({ ts: first.completedAt, kind: 'first_step', title: 'First vote cast', ref: 'Zechariah 4:10' });
  for (const s of state.stones.filter((x) => x.completedAt)) {
    milestones.push({ ts: s.completedAt, kind: 'stone', title: `Took ground: ${s.title}`, ref: 'Matthew 25:21' });
  }
  for (const g of identityGrowth) {
    if (g.tier.key !== 'called') {
      milestones.push({ ts: Date.now(), kind: 'tier', title: `${g.identity.statement} — ${g.tier.name}`, ref: g.tier.ref });
    }
  }
  milestones.sort((a, b) => a.ts - b.ts);

  return {
    started,
    daysIn,
    steps: completed.length,
    stonesTaken: state.stones.filter((s) => s.completedAt).length,
    stonesTotal: state.stones.length,
    longestStreak: read.streak.longest,
    focusMinutes: state.focusBlocks.reduce((a, b) => a + (b.minutes || 0), 0),
    identityGrowth,
    milestones,
    verse: verseFor('recap', hashStr(read.today)),
  };
}
