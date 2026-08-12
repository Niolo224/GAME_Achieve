/**
 * storage.js — persistence and the Covenant Circle transport.
 *
 * Two adapters behind one interface:
 *
 *   LocalAdapter     — everything on this device. Always available, works
 *                      offline, needs no account. The default.
 *   SupabaseAdapter  — a live Covenant Circle shared across devices, driven
 *                      by plain REST + polling. No SDK, no CDN script, no
 *                      build step, so it survives a strict CSP.
 *
 * The Why Vault is written under its own key and is never passed to any
 * adapter's `pushSnapshot`. See state.js for why that is structural.
 *
 *   "Two are better than one… a threefold cord is not quickly broken."
 *                                                    — Ecclesiastes 4:9,12
 */

import { uid, dayKey } from './util.js';

const KEY_STATE = 'achieve.state.v1';
const KEY_VAULT = 'achieve.vault.v1';   // private. never synced. never exported.

// ── device persistence ────────────────────────────────────────────────────

/**
 * In-memory fallback for environments where localStorage is blocked
 * (sandboxed iframes, private-mode quirks). The game keeps working for the
 * session instead of failing on every save; the player is warned once that
 * it will not survive a reload.
 */
const memory = new Map();
let storageBroken = false;
let warnedOnce = false;

function backing() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    // Probe: some embeds expose the object but throw on write.
    ls.setItem('achieve.probe', '1');
    ls.removeItem('achieve.probe');
    return ls;
  } catch {
    storageBroken = true;
    return null;
  }
}

export function loadLocal(key, fallback) {
  try {
    const ls = backing();
    const raw = ls ? ls.getItem(key) : memory.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal(key, value) {
  const json = JSON.stringify(value);
  const ls = backing();

  if (!ls) {
    memory.set(key, json);
    if (storageBroken && !warnedOnce) {
      warnedOnce = true;
      return { ok: false, error: 'This browser is blocking local storage, so your progress will not survive a reload. Export a save to keep it.' };
    }
    return { ok: true, memoryOnly: true };
  }

  try {
    ls.setItem(key, json);
    return { ok: true };
  } catch (err) {
    // Quota is the realistic failure here — vision board images are large.
    memory.set(key, json);
    return {
      ok: false,
      error: err && err.name === 'QuotaExceededError'
        ? 'Storage is full — try a smaller vision board image, or export and clear old data.'
        : 'Could not save to this device. Your work is held in memory for now.',
    };
  }
}

export const STATE_KEY = KEY_STATE;
export const VAULT_KEY = KEY_VAULT;

export function loadState() { return loadLocal(KEY_STATE, null); }
export function saveState(s) { return saveLocal(KEY_STATE, s); }
export function loadVault() { return loadLocal(KEY_VAULT, null); }
export function saveVault(v) { return saveLocal(KEY_VAULT, v); }

/**
 * Wipe the vault only. Offered explicitly because a private thing the user
 * cannot delete is not actually private.
 */
export function destroyVault() {
  try { globalThis.localStorage?.removeItem(KEY_VAULT); return true; } catch { return false; }
}

// ── circle codes ──────────────────────────────────────────────────────────

/**
 * Codes are long and random on purpose: with the Supabase adapter, the code
 * IS the access control (a secret-link model). Short codes would be
 * guessable, and a guessed code means a stranger in your circle.
 */
export function makeCircleCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — spoken aloud
  let out = '';
  const bytes = new Uint8Array(16);
  (globalThis.crypto || {}).getRandomValues?.(bytes);
  for (let i = 0; i < 16; i++) {
    const b = bytes[i] || Math.floor(Math.random() * 256);
    out += alphabet[b % alphabet.length];
    if (i === 3 || i === 7 || i === 11) out += '-';
  }
  return out;
}

export function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
}

// ── adapter interface ─────────────────────────────────────────────────────

/**
 * Local circle: a real, working circle that never leaves the device. Useful
 * on its own (a solo covenant with your own history) and the honest fallback
 * when live sync is not configured.
 */
export class LocalAdapter {
  constructor(state) {
    this.mode = 'local';
    this.live = false;
    this.state = state;
  }

  get label() { return 'On this device'; }

  async status() {
    return { ok: true, live: false, mode: 'local', message: 'Everything is stored on this device only.' };
  }

  async joinCircle(code, profile) {
    const c = normalizeCode(code) || makeCircleCode();
    this.state.circle.code = c;
    this.state.circle.joinedAt = Date.now();
    const me = this.state.circle.members.find((m) => m.playerId === profile.playerId);
    if (!me) this.state.circle.members.push({ ...profile, joinedAt: Date.now(), local: true });
    return { ok: true, code: c, live: false };
  }

  async leaveCircle() {
    this.state.circle = { code: null, joinedAt: null, members: [], messages: [] };
    return { ok: true };
  }

  async pushSnapshot() { return { ok: true, live: false }; }

  async fetchMembers() { return this.state.circle.members; }

  async fetchMessages() { return this.state.circle.messages; }

  async sendMessage(body, profile) {
    const msg = {
      id: uid('msg'),
      playerId: profile.playerId,
      displayName: profile.displayName,
      newName: profile.newName,
      body: String(body),
      createdAt: Date.now(),
      local: true,
    };
    this.state.circle.messages.push(msg);
    if (this.state.circle.messages.length > 500) this.state.circle.messages.shift();
    return { ok: true, message: msg };
  }
}

/**
 * Live circle over Supabase REST.
 *
 * Deliberately no SDK: a <script src="cdn…"> would be blocked outright under
 * the artifact CSP, and pinning an SDK version is a maintenance cost this
 * app does not need. Everything here is fetch + JSON.
 */
export class SupabaseAdapter {
  constructor({ url, key, state }) {
    this.mode = 'supabase';
    this.live = true;
    this.url = String(url || '').replace(/\/+$/, '');
    this.key = String(key || '');
    this.state = state;
    this.lastError = null;
  }

  get label() { return 'Live circle'; }

  headers(extra = {}) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  /**
   * Every call is an RPC. The tables themselves are unreadable with the anon
   * key by design — see supabase/schema.sql. This is what stops a holder of
   * the publishable key from simply omitting a filter and reading every
   * circle on the server.
   */
  async rpc(fn, args = {}) {
    if (!this.url || !this.key) {
      return { ok: false, error: 'Live sync is not configured.' };
    }
    try {
      const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(args),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.lastError = friendlyError(res.status, text);
        return { ok: false, error: this.lastError, status: res.status };
      }
      const text = await res.text();
      return { ok: true, data: text ? JSON.parse(text) : null };
    } catch (err) {
      this.lastError = String(err);
      return { ok: false, error: 'Cannot reach the circle server.', offline: true };
    }
  }

  async status() {
    if (!this.state.circle.code) {
      // Nothing to read yet; a reachable host is the most we can confirm.
      const r = await this.rpc('get_members', { p_code: 'CONNECTIVITY-PROBE' });
      // An "invalid circle code" rejection still proves the server answered.
      const reachable = r.ok || (r.status && r.status < 500);
      return reachable
        ? { ok: true, live: true, mode: 'supabase', message: 'Live sync ready. Start or join a circle.' }
        : { ok: false, live: false, mode: 'supabase', message: this.lastError || 'Cannot reach the circle server.' };
    }
    const r = await this.rpc('get_members', { p_code: this.state.circle.code });
    if (!r.ok) {
      return { ok: false, live: false, mode: 'supabase', message: r.error };
    }
    return { ok: true, live: true, mode: 'supabase', message: 'Live circle connected.' };
  }

  async joinCircle(code, profile) {
    const c = normalizeCode(code) || makeCircleCode();
    const r = await this.rpc('join_circle', {
      p_code: c,
      p_player_id: profile.playerId,
      p_display_name: profile.displayName,
      p_new_name: profile.newName || null,
      p_snapshot: profile.snapshot || {},
    });
    if (!r.ok) return { ok: false, error: r.error };

    this.state.circle.code = c;
    this.state.circle.joinedAt = Date.now();
    return { ok: true, code: c, live: true };
  }

  async leaveCircle(profile) {
    const c = this.state.circle.code;
    if (c) await this.rpc('leave_circle', { p_code: c, p_player_id: profile.playerId });
    this.state.circle = { code: null, joinedAt: null, members: [], messages: [] };
    return { ok: true };
  }

  /** Publish the shareable snapshot — never the vault, never board images. */
  async pushSnapshot(profile, snapshot) {
    const c = this.state.circle.code;
    if (!c) return { ok: false, error: 'Not in a circle.' };
    return this.rpc('join_circle', {
      p_code: c,
      p_player_id: profile.playerId,
      p_display_name: profile.displayName,
      p_new_name: profile.newName || null,
      p_snapshot: snapshot,
    });
  }

  async fetchMembers() {
    const c = this.state.circle.code;
    if (!c) return [];
    const r = await this.rpc('get_members', { p_code: c });
    if (!r.ok) return this.state.circle.members;
    const members = (r.data || []).map((m) => ({
      playerId: m.player_id,
      displayName: m.display_name,
      newName: m.new_name,
      snapshot: m.snapshot || {},
      joinedAt: Date.parse(m.joined_at) || Date.now(),
      updatedAt: Date.parse(m.updated_at) || null,
    }));
    this.state.circle.members = members;
    return members;
  }

  async fetchMessages() {
    const c = this.state.circle.code;
    if (!c) return [];
    const r = await this.rpc('get_messages', { p_code: c, p_limit: 200 });
    if (!r.ok) return this.state.circle.messages;
    const messages = (r.data || []).map((m) => ({
      id: m.id,
      playerId: m.player_id,
      displayName: m.display_name,
      newName: m.new_name,
      body: m.body,
      createdAt: Date.parse(m.created_at) || Date.now(),
    }));
    this.state.circle.messages = messages;
    return messages;
  }

  async sendMessage(body, profile) {
    const c = this.state.circle.code;
    if (!c) return { ok: false, error: 'Not in a circle.' };
    const r = await this.rpc('post_message', {
      p_code: c,
      p_player_id: profile.playerId,
      p_display_name: profile.displayName,
      p_body: String(body).slice(0, 2000),
      p_new_name: profile.newName || null,
    });
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, id: r.data || null };
  }
}

/** Turn PostgREST noise into something a person can act on. */
function friendlyError(status, text) {
  if (/slow down/i.test(text)) return 'Slow down a moment — too many messages at once.';
  if (/invalid circle code/i.test(text)) return 'That circle code is not valid.';
  if (status === 404) return 'The circle functions are missing. Run supabase/schema.sql in your project.';
  if (status === 401 || status === 403) return 'That key was rejected. Check you used the anon (publishable) key.';
  return `Circle server error (${status}).`;
}

/** Pick the adapter the settings ask for. */
export function createAdapter(state) {
  const s = state.settings || {};
  if (s.syncMode === 'supabase' && s.supabaseUrl && s.supabaseKey) {
    return new SupabaseAdapter({ url: s.supabaseUrl, key: s.supabaseKey, state });
  }
  return new LocalAdapter(state);
}

// ── export / import (the offline covenant file) ───────────────────────────

/**
 * A portable save. `includeVault` defaults to FALSE — the private Why is not
 * swept into a file you might hand to someone else by accident. Including it
 * has to be a deliberate act.
 */
export function exportSave(state, vault, { includeVault = false } = {}) {
  const payload = {
    kind: 'achieve.save',
    version: state.version,
    exportedAt: new Date().toISOString(),
    state,
    vault: includeVault ? vault : undefined,
    vaultIncluded: Boolean(includeVault),
  };
  return JSON.stringify(payload, null, 2);
}

export function parseSave(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.kind !== 'achieve.save' || !parsed.state) {
      return { ok: false, error: 'That file is not an ACHIEVE save.' };
    }
    return { ok: true, state: parsed.state, vault: parsed.vault || null, vaultIncluded: Boolean(parsed.vaultIncluded) };
  } catch (err) {
    return { ok: false, error: 'Could not read that file.' };
  }
}

/** A shareable recap card — public by design, so it is built from stats only. */
export function recapPayload(state, summary) {
  return {
    kind: 'achieve.recap',
    player: state.player.newName || state.player.name || 'A runner',
    since: state.player.createdAt,
    generatedAt: Date.now(),
    day: dayKey(),
    stats: summary,
  };
}
