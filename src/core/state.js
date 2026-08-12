/**
 * state.js — the model, and the rules that guard it.
 *
 * One hard architectural rule lives in this file:
 *
 *   THE WHY VAULT IS NEVER PART OF THE SHAREABLE STATE.
 *
 * It is not a flag on a record, it is a separate object under a separate
 * storage key, and `shareable()` is the only thing sync is ever handed. A
 * privacy promise enforced by a boolean is one refactor away from being
 * broken; one enforced by structure is not.
 *
 *   "…pray to thy Father which is in secret; and thy Father which seeth in
 *    secret shall reward thee openly."  — Matthew 6:6
 */

import { uid, dayKey } from './util.js';

export const SCHEMA_VERSION = 1;

/** The six territories of the Promised Land map. */
export const DOMAINS = [
  { key: 'body', name: 'Body', ref: '1 Corinthians 9:27', line: 'I keep under my body, and bring it into subjection.', hue: 8 },
  { key: 'provision', name: 'Provision', ref: 'Deuteronomy 8:18', line: 'He giveth thee power to get wealth.', hue: 42 },
  { key: 'household', name: 'Household', ref: 'Joshua 24:15', line: 'As for me and my house, we will serve the LORD.', hue: 152 },
  { key: 'assignment', name: 'Assignment', ref: 'Esther 4:14', line: 'For such a time as this.', hue: 262 },
  { key: 'craft', name: 'Craft', ref: 'Proverbs 22:29', line: 'A man diligent in his business shall stand before kings.', hue: 200 },
  { key: 'communion', name: 'Communion', ref: 'John 15:5', line: 'He that abideth in me bringeth forth much fruit.', hue: 320 },
];

export function domain(key) {
  return DOMAINS.find((d) => d.key === key) || DOMAINS[0];
}

/** A fresh, empty game. */
export function emptyState() {
  return {
    version: SCHEMA_VERSION,
    player: {
      id: uid('plr'),
      name: '',
      newName: '',
      archetype: null,
      createdAt: Date.now(),
    },
    identities: [],
    boards: [],
    stones: [],
    quests: [],
    votes: [],
    pings: [],
    focusBlocks: [],
    manna: [],
    chronicle: [],
    letters: [],
    circle: { code: null, joinedAt: null, members: [], messages: [] },
    settings: {
      sabbathEnabled: true,
      sabbathDay: 0,          // Sunday
      difficultyLevel: 2,
      syncMode: 'local',      // 'local' | 'supabase'
      supabaseUrl: '',
      supabaseKey: '',
      displayName: '',
    },
    meta: {
      lastOpen: null,
      onboarded: false,
      seenPillars: false,
    },
  };
}

/** The Why Vault. Separate object, separate key, never handed to sync. */
export function emptyVault() {
  return { version: SCHEMA_VERSION, entries: {}, updatedAt: null };
}

/**
 * Produce the ONLY object sync is ever allowed to see.
 *
 * Note what is absent: the vault is not passed in, so it cannot leak. Board
 * images are stripped too — they are large and personal, and the Circle sees
 * progress, not your private collage.
 */
export function shareable(state) {
  return {
    version: state.version,
    player: {
      id: state.player.id,
      name: state.player.name,
      newName: state.player.newName,
      archetype: state.player.archetype,
    },
    // Identity statements are shareable; the WHY behind them is not.
    identities: state.identities.map((i) => ({
      id: i.id, statement: i.statement, domain: i.domain, createdAt: i.createdAt,
    })),
    stones: state.stones.map((s) => ({
      id: s.id, title: s.title, domain: s.domain, identityId: s.identityId,
      woopComplete: s.woopComplete, createdAt: s.createdAt, completedAt: s.completedAt,
    })),
    quests: state.quests.map((q) => ({
      id: q.id, stoneId: q.stoneId, identityId: q.identityId,
      text: q.sealed ? q.text : null,      // unsealed quests stay private
      sealed: Boolean(q.sealed), level: q.level,
      createdAt: q.createdAt, completedAt: q.completedAt,
    })),
    votes: state.votes.map((v) => ({ id: v.id, identityId: v.identityId, day: v.day, for: v.for })),
    stats: summarize(state),
  };
}

/** Compact public snapshot used by the Circle roster and the recap. */
export function summarize(state) {
  const completed = state.quests.filter((q) => q.completedAt);
  const days = new Set(completed.map((q) => dayKey(new Date(q.completedAt))));
  return {
    steps: completed.length,
    stones: state.stones.length,
    stonesComplete: state.stones.filter((s) => s.completedAt).length,
    identities: state.identities.length,
    activeDays: days.size,
    focusMinutes: state.focusBlocks.reduce((a, b) => a + (b.minutes || 0), 0),
    since: state.player.createdAt,
  };
}

// ── migrations ────────────────────────────────────────────────────────────

/** Bring any older saved state up to the current schema, non-destructively. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyState();
  const base = emptyState();
  const out = {
    ...base,
    ...raw,
    player: { ...base.player, ...(raw.player || {}) },
    settings: { ...base.settings, ...(raw.settings || {}) },
    meta: { ...base.meta, ...(raw.meta || {}) },
    circle: { ...base.circle, ...(raw.circle || {}) },
  };
  // Arrays must be arrays even if a save was truncated or hand-edited.
  for (const k of ['identities', 'boards', 'stones', 'quests', 'votes', 'pings', 'focusBlocks', 'manna', 'chronicle', 'letters']) {
    if (!Array.isArray(out[k])) out[k] = [];
  }
  if (!Array.isArray(out.circle.members)) out.circle.members = [];
  if (!Array.isArray(out.circle.messages)) out.circle.messages = [];
  out.version = SCHEMA_VERSION;
  return out;
}

// ── mutations (pure; each returns a new list) ─────────────────────────────

export function addIdentity(state, { statement, domain: dom }) {
  const identity = {
    id: uid('idn'),
    statement: String(statement).trim(),
    domain: dom || 'assignment',
    vestment: '',
    createdAt: Date.now(),
  };
  state.identities.push(identity);
  return identity;
}

export function addStone(state, { title, domain: dom, identityId, boardId, x, y, crop }) {
  const stone = {
    id: uid('stn'),
    title: String(title || '').trim(),
    domain: dom || 'assignment',
    identityId: identityId || null,
    boardId: boardId || null,
    x: typeof x === 'number' ? x : null,   // 0..1 relative to board image
    y: typeof y === 'number' ? y : null,
    crop: crop || null,
    woop: { wish: '', outcome: '', obstacle: '', plan: '' },
    woopComplete: false,
    createdAt: Date.now(),
    completedAt: null,
  };
  state.stones.push(stone);
  return stone;
}

export function addQuest(state, { stoneId, identityId, text, cue, action, place, level, sealed, geo }) {
  const quest = {
    id: uid('qst'),
    stoneId: stoneId || null,
    identityId: identityId || null,
    text: String(text || '').trim(),
    cue: cue || '',
    action: action || '',
    place: place || '',
    level: level || state.settings.difficultyLevel || 2,
    sealed: Boolean(sealed),
    geo: geo || null,
    createdAt: Date.now(),
    completedAt: null,
    attempts: 0,
    archived: false,
  };
  state.quests.push(quest);
  return quest;
}

export function castVote(state, { identityId, questId, isFor, day }) {
  const vote = {
    id: uid('vot'),
    identityId,
    questId: questId || null,
    day: day || dayKey(),
    for: isFor !== false,
    ts: Date.now(),
  };
  state.votes.push(vote);
  return vote;
}

export function addPing(state, { kind, lat, lng, label, note, questId }) {
  const ping = {
    id: uid('png'),
    kind: kind || 'ebenezer',
    lat, lng,
    label: label || '',
    note: note || '',
    questId: questId || null,
    day: dayKey(),
    ts: Date.now(),
  };
  state.pings.push(ping);
  return ping;
}

/**
 * The Chronicle — "after each, notes of what was accomplished."
 * Amabile & Kramer (2011): progress in meaningful work is the strongest
 * driver of inner work life, and NOTICING it is part of the effect.
 * Nothing in this game completes silently.
 */
export function chronicle(state, { kind, title, body, refs, meta }) {
  const entry = {
    id: uid('chr'),
    ts: Date.now(),
    day: dayKey(),
    kind: kind || 'note',
    title: String(title || ''),
    body: String(body || ''),
    refs: refs || [],
    meta: meta || null,
  };
  state.chronicle.unshift(entry);
  if (state.chronicle.length > 500) state.chronicle.length = 500;
  return entry;
}

// ── the Why Vault ─────────────────────────────────────────────────────────

export function setWhy(vault, identityId, text) {
  vault.entries[identityId] = { text: String(text || ''), updatedAt: Date.now() };
  vault.updatedAt = Date.now();
  return vault.entries[identityId];
}

export function getWhy(vault, identityId) {
  return vault.entries?.[identityId] || null;
}
