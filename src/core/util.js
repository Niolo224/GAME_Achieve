/**
 * util.js — small, dependency-free helpers shared by every engine.
 */

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/** Deterministic 32-bit string hash — used to seed daily-stable choices. */
export function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry32 — tiny seeded PRNG so tests are deterministic. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local-calendar day key, e.g. "2026-08-12". Local, not UTC — days are lived locally. */
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dayK, n) {
  const d = parseDayKey(dayK);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Day key n days before the given one. */
export function shiftBack(dayK, n) {
  return addDays(dayK, -n);
}

/** Whole days between two day keys (b - a). */
export function daysBetween(a, b) {
  const MS = 86400000;
  return Math.round((parseDayKey(b) - parseDayKey(a)) / MS);
}

/** Inclusive list of day keys from a to b. */
export function dayRange(a, b) {
  const out = [];
  const n = daysBetween(a, b);
  for (let i = 0; i <= n; i++) out.push(addDays(a, i));
  return out;
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(dayK) {
  return parseDayKey(dayK).getDay();
}

export function pct(n) {
  return Math.round(n * 100);
}

/** Sum of a numeric field across an array. */
export function sumBy(arr, fn) {
  return arr.reduce((acc, x) => acc + (fn(x) || 0), 0);
}

export function groupBy(arr, fn) {
  const out = new Map();
  for (const item of arr) {
    const k = fn(item);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(item);
  }
  return out;
}

/** Escape untrusted text before it touches innerHTML. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Human-friendly relative time. */
export function ago(ts, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
