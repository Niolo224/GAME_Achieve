/**
 * app.js — ACHIEVE: Write The Vision.
 *
 * The controller. Loads state, decides what to show, draws the maps and the
 * chart, and owns every user action.
 */

import { esc, dayKey, uid, clamp, pct, hashStr, daysBetween, addDays } from './core/util.js';
import {
  emptyState, emptyVault, migrate, shareable, summarize, DOMAINS, domain, normalizeDomain,
  addIdentity, addStone, addQuest, castVote, addPing, chronicle, setWhy, getWhy, addDeed,
} from './core/state.js';
import {
  loadState, saveState, loadVault, saveVault, destroyVault,
  createAdapter, makeCircleCode, normalizeCode, exportSave, parseSave,
} from './core/storage.js';
import {
  validateWoop, validateIfThen, composeIfThen, calibrate, adjustDifficulty,
  difficulty, awardFor, decayManna, computeStreak, focusCredit, canStartFocus,
  stoneProgress, sabbathState, FOCUS_PRESETS, DIFFICULTY,
} from './core/engine.js';
import { validateIdentity, tallyIdentity, evidenceStatement, automaticityAt } from './core/identity.js';
import { readState, nextStep, wordForToday, accomplishmentNote, buildRecap } from './core/guide.js';
import { runGrowth, buildSeries, explainRate, displayTerms } from './core/growth.js';
import { verseFor, verseByRef } from './data/scripture.js';
import { SEED_STONES, SEED_IDENTITIES, BOARD_TITLE, DECLARATION } from './data/board.js';
import { artFor } from './data/art.js';
import { readCharacter, deedSize, levelUpLine, DEED_SIZES } from './core/character.js';
import { animateAvatar } from './ui/avatar.js';
import { principle } from './data/neuro.js';
import * as V from './ui/views.js';

// ── app singleton ─────────────────────────────────────────────────────────

const App = {
  state: null,
  vault: null,
  adapter: null,
  view: 'today',
  mapTab: 'land',
  picking: false,
  modal: null,
  focus: null,
  focusTimer: null,
  chatTimer: null,
  syncStatus: { ok: true, live: false, message: '' },
  members: [],
  messages: [],
  toasts: [],
  pendingQuest: null,
  whyGate: null,
  whyGateTimer: null,
  avatarStop: null,
};

globalThis.__ACHIEVE = App; // test hook

// ── boot ──────────────────────────────────────────────────────────────────

function boot() {
  App.state = migrate(loadState());
  App.vault = loadVault() || emptyVault();
  App.adapter = createAdapter(App.state);

  // Rewards expire if they are hoarded. Exodus 16:20.
  const decayed = decayManna(App.state.manna, dayKey());
  if (decayed.spoiledCount > 0) {
    App.state.manna = decayed.kept;
    chronicle(App.state, {
      kind: 'manna_spoiled',
      title: `${decayed.spoiledCount} rewards expired`,
      body: 'Gathered but never spent. What was kept overnight bred worms — the daily portion is meant to be used.',
      refs: [{ ref: 'Exodus 16:20', why: 'Israel was told to gather only a day\'s portion; what was kept overnight spoiled.' }],
    });
  }

  App.state.meta.lastOpen = Date.now();
  persist();
  render();
  refreshCircle();
  startChatPolling();
}

function persist() {
  const r = saveState(App.state);
  if (!r.ok) toast(r.error || 'Could not save.', 'bad');
}

function persistVault() {
  const r = saveVault(App.vault);
  if (!r.ok) toast(r.error || 'Could not save the vault.', 'bad');
}

// ── derived context ───────────────────────────────────────────────────────

function context() {
  const state = App.state;
  const read = readState(state);
  const step = nextStep(state, read);
  const word = wordForToday(state, read);

  const tallies = {};
  for (const i of state.identities) {
    tallies[i.id] = tallyIdentity(state.votes, i.id, { today: read.today });
  }

  const completions = state.quests
    .filter((q) => q.completedAt)
    .map((q) => {
      const t = tallies[q.identityId];
      return { day: dayKey(new Date(q.completedAt)), identityId: q.identityId, aligned: true };
    });

  const from = completions.length
    ? completions.map((c) => c.day).sort()[0]
    : dayKey(new Date(state.player.createdAt));
  const partners = Math.max(0, App.members.length - 1);
  const series = buildSeries({
    completions,
    from,
    to: read.today,
    activePartnersOn: () => partners,
  });
  const growth = runGrowth(series);
  const explain = explainRate(displayTerms(series));

  const areas = {};
  for (const d of DOMAINS) {
    const stones = state.stones.filter((s) => s.domain === d.key);
    areas[d.key] = {
      total: stones.length,
      done: stones.filter((s) => s.completedAt).length,
      kindled: stones.filter((s) => s.woopComplete).length,
      stones,
    };
  }

  const character = readCharacter(state, read, DOMAINS);

  return {
    state, read, step, word, tallies, growth, explain, areas, character,
    mapTab: App.mapTab,
    picking: App.picking,
    syncStatus: App.syncStatus,
    members: App.members,
    messages: App.messages,
    me: profile(),
    recap: buildRecap(state, read),
    stoneProgressOf: (s) => stoneProgress(s, state.quests),
    hasWhy: (id) => Boolean(getWhy(App.vault, id)),
  };
}

function profile() {
  return {
    playerId: App.state.player.id,
    displayName: App.state.settings.displayName || App.state.player.name || 'A runner',
    newName: App.state.player.newName || '',
    snapshot: shareable(App.state),
  };
}

// ── render ────────────────────────────────────────────────────────────────

const NAV = [
  { key: 'today', ico: '◉', label: 'Today' },
  { key: 'vision', ico: '▣', label: 'Vision' },
  { key: 'identity', ico: '◈', label: 'Be' },
  { key: 'map', ico: '⌖', label: 'Map' },
  { key: 'growth', ico: '◢', label: 'Growth' },
  { key: 'circle', ico: '◎', label: 'Circle' },
  { key: 'chronicle', ico: '❋', label: 'Story' },
  { key: 'codex', ico: '✦', label: 'Codex' },
  { key: 'settings', ico: '⚙', label: 'Set' },
];

function render() {
  const root = document.getElementById('root');
  if (!App.state.meta.onboarded) {
    root.innerHTML = `<div class="app">${V.onboardingView()}</div>${toastHtml()}`;
    return;
  }

  const ctx = context();
  let body = '';
  switch (App.view) {
    case 'vision': body = V.visionView(ctx); break;
    case 'identity': body = V.identityView(ctx); break;
    case 'map': body = V.mapView(ctx); break;
    case 'growth': body = V.growthView(ctx); break;
    case 'circle': body = V.circleView(ctx); break;
    case 'chronicle': body = V.chronicleView(ctx); break;
    case 'codex': body = V.codexView(); break;
    case 'settings': body = V.settingsView(ctx); break;
    default: body = V.todayView(ctx);
  }

  root.innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="brand">Achieve <small>Write the vision</small></div>
        <div class="topbar-right">
          <div class="hud">
            ${ctx.read.streak.current ? `<span class="hud-chip gold">▲ <b>${ctx.read.streak.current}</b></span>` : ''}
            <span class="hud-chip">✦ <b>${ctx.read.streak.tokens}</b></span>
            ${App.state.player.newName ? `<span class="hud-chip">${esc(App.state.player.newName)}</span>` : ''}
          </div>
        </div>
      </header>
      ${body}
    </div>
    <nav class="nav">
      ${NAV.map((n) => `<button data-act="nav" data-view="${n.key}" aria-current="${App.view === n.key}" data-testid="nav-${n.key}">
        <span class="ico">${n.ico}</span>${n.label}</button>`).join('')}
    </nav>
    ${App.modal ? `<div class="modal-bg" data-act="modal-bg"><div class="modal">${App.modal}</div></div>` : ''}
    ${toastHtml()}
  `;

  // The figure breathes while its view is on screen.
  if (App.avatarStop) { App.avatarStop(); App.avatarStop = null; }
  const avatarEl = document.getElementById('avatar-canvas');
  if (avatarEl) {
    App.avatarStop = animateAvatar(avatarEl, () => context().character, DOMAINS);
  }

  // Canvas passes have to happen after the DOM exists.
  if (App.view === 'map' && App.mapTab === 'land') drawLand(ctx);
  if (App.view === 'map' && App.mapTab === 'earth') drawEarth(ctx);
  if (App.view === 'growth') drawGrowth(ctx);
  if (App.view === 'circle') {
    const el = document.getElementById('chat-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }
}

function toastHtml() {
  // Only ever show the newest few. A stack of eight buries the interface.
  const visible = App.toasts.slice(-3);
  return `<div class="toast-wrap">${visible.map((t) => `<div class="toast ${t.kind}">${esc(t.msg)}</div>`).join('')}</div>`;
}

function toast(msg, kind = '') {
  const t = { id: uid('t'), msg, kind };
  App.toasts.push(t);
  if (App.toasts.length > 3) App.toasts = App.toasts.slice(-3);
  render();
  setTimeout(() => {
    App.toasts = App.toasts.filter((x) => x.id !== t.id);
    render();
  }, 3400);
}

function openModal(html) { App.modal = html; render(); }
function closeModal() {
  App.modal = null;
  App.pendingQuest = null;
  App.whyGate = null;
  clearTimeout(App.whyGateTimer);
  render();
}

// ── canvas plumbing ───────────────────────────────────────────────────────

/**
 * Size the backing store to the element's real display width × DPR, and
 * scale the context so drawing code works in CSS pixels.
 *
 * Without this, a fixed 900px canvas squashed into a 430px phone renders
 * 10px labels at about 5px — technically drawn, practically unreadable.
 */
function fitCanvas(cv, aspect) {
  const cssW = cv.clientWidth || cv.parentElement?.clientWidth || 900;
  const cssH = Math.round(cssW / aspect);
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.style.height = `${cssH}px`;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, W: cssW, H: cssH };
}

// ── canvas: the Promised Land ─────────────────────────────────────────────

function drawLand(ctx) {
  const cv = document.getElementById('land-canvas');
  if (!cv) return;
  const { g, W, H } = fitCanvas(cv, 900 / 560);
  g.clearRect(0, 0, W, H);

  // ground
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#F7F4FE');
  grd.addColorStop(1, '#EDE9FB');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);

  // Grid adapts to however many areas are configured.
  const cols = DOMAINS.length <= 4 ? 2 : 3;
  const rows = Math.ceil(DOMAINS.length / cols);
  const pad = Math.max(10, W * 0.029);
  // Type scales with the real drawing width so it stays legible on a phone.
  const fs = clamp(W / 32, 10, 15);
  const cw = (W - pad * 2) / cols;
  const ch = (H - pad * 2) / rows;

  DOMAINS.forEach((d, i) => {
    const cx = pad + (i % cols) * cw + cw / 2;
    const cy = pad + Math.floor(i / cols) * ch + ch / 2;
    const t = ctx.areas[d.key];
    const frac = t.total ? t.done / t.total : 0;
    const kindled = t.total ? t.kindled / t.total : 0;

    const R = Math.min(cw, ch) * 0.42;
    // fog of war — unclaimed ground stays dark
    g.beginPath();
    hexPath(g, cx, cy, R);
    g.fillStyle = t.total === 0
      ? 'rgba(226,219,246,.55)'
      : `hsla(${d.hue}, ${28 + kindled * 38}%, ${93 - frac * 16}%, ${.7 + frac * .3})`;
    g.fill();
    g.strokeStyle = t.total === 0 ? '#D8D0F0' : `hsla(${d.hue}, 58%, ${72 - frac * 16}%, .95)`;
    g.lineWidth = 2;
    g.stroke();

    // taken portion as an inner hex
    if (frac > 0) {
      g.beginPath();
      hexPath(g, cx, cy, R * (0.28 + frac * 0.62));
      g.fillStyle = `hsla(${d.hue}, 68%, 66%, .34)`;
      g.fill();
      g.strokeStyle = `hsla(${d.hue}, 62%, 58%, .85)`;
      g.lineWidth = 1.5;
      g.stroke();
    }

    g.fillStyle = t.total === 0 ? '#9A93B9' : '#34305A';
    g.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.fillText(d.name, cx, cy - 2);

    g.fillStyle = t.total === 0 ? '#ADA6C8' : `hsl(${d.hue}, 46%, 44%)`;
    g.font = `${fs * 0.82}px ui-sans-serif, system-ui, sans-serif`;
    g.fillText(t.total ? `${t.done}/${t.total} taken` : 'unclaimed', cx, cy + fs + 2);
  });

  // The app's own caption. Joshua 1:3 is printed in full, with its reference
  // and context, in the panel above — a canvas label cannot do that, and
  // trimming a verse to fit a width is not something this app does.
  g.fillStyle = '#9A93B9';
  g.font = `${clamp(W / 62, 9, 12)}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillText('An area fills as you finish goals in it. Add a goal to begin.', W / 2, H - 8);
}

function hexPath(g, cx, cy, r) {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
}

// ── canvas: real ground ───────────────────────────────────────────────────

function drawEarth(ctx) {
  const cv = document.getElementById('earth-canvas');
  if (!cv) return;
  const { g, W, H } = fitCanvas(cv, 900 / 560);
  g.fillStyle = '#EAF2FB';
  g.fillRect(0, 0, W, H);

  const pings = ctx.state.pings;
  if (!pings.length) {
    g.fillStyle = '#9A93B9';
    g.font = `${clamp(W / 32, 12, 15)}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.fillText('No ground marked yet.', W / 2, H / 2 - 8);
    g.font = `${clamp(W / 40, 10, 13)}px ui-sans-serif, system-ui, sans-serif`;
    g.fillText('Use “Ping me here” to mark where you stand.', W / 2, H / 2 + 18);
    return;
  }

  // Equirectangular projection about the centroid — a real map of real
  // coordinates that needs no tile server and works offline.
  const lats = pings.map((p) => p.lat);
  const lngs = pings.map((p) => p.lng);
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const kx = Math.cos((cLat * Math.PI) / 180);

  let spanLat = Math.max(...lats) - Math.min(...lats);
  let spanLng = (Math.max(...lngs) - Math.min(...lngs)) * kx;
  const span = Math.max(spanLat, spanLng, 0.004) * 1.5;
  const scale = Math.min(W, H) / span * 0.82;

  const proj = (p) => ({
    x: W / 2 + (p.lng - cLng) * kx * scale,
    y: H / 2 - (p.lat - cLat) * scale,
  });

  // distance rings
  const kmPerDeg = 111.32;
  g.strokeStyle = '#D3E2F2';
  g.lineWidth = 1;
  for (const km of [0.5, 1, 2, 5, 10, 25]) {
    const r = (km / kmPerDeg) * scale;
    if (r < 14 || r > Math.max(W, H)) continue;
    g.beginPath();
    g.arc(W / 2, H / 2, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#A9BDD2';
    g.font = '10px ui-monospace, monospace';
    g.textAlign = 'left';
    g.fillText(`${km}km`, W / 2 + r + 4, H / 2 - 3);
  }

  // crosshair
  g.strokeStyle = '#DCE8F5';
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2);
  g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();

  // compass
  g.fillStyle = '#8FA6BE';
  g.font = '600 12px ui-sans-serif, sans-serif';
  g.textAlign = 'center';
  g.fillText('N', W / 2, 16);

  // trail between pings, oldest to newest
  const ordered = pings.slice().sort((a, b) => a.ts - b.ts);
  g.strokeStyle = 'rgba(224,146,31,.45)';
  g.lineWidth = 1.5;
  g.setLineDash([4, 5]);
  g.beginPath();
  ordered.forEach((p, i) => {
    const { x, y } = proj(p);
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  });
  g.stroke();
  g.setLineDash([]);

  ordered.forEach((p, i) => {
    const { x, y } = proj(p);
    const isLast = i === ordered.length - 1;
    const color = p.kind === 'quest' ? '#57ABE6' : '#F5AE3C';

    if (isLast) {
      g.beginPath();
      g.arc(x, y, 15, 0, Math.PI * 2);
      g.fillStyle = 'rgba(245,174,60,.24)';
      g.fill();
    }
    g.beginPath();
    g.arc(x, y, 6, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = '#FFFFFF';
    g.lineWidth = 2;
    g.stroke();

    g.fillStyle = '#4A5B6E';
    g.font = `${clamp(W / 40, 10, 13)}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = 'center';
    const label = p.label || 'Ebenezer';
    g.fillText(label.length > 22 ? label.slice(0, 21) + '…' : label, x, y - 12);
  });

  // As above: 1 Samuel 7:12 is printed in full above the map.
  g.fillStyle = '#8FA6BE';
  g.font = `${clamp(W / 60, 9, 12)}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillText('Each marker is ground you actually stood on.', W / 2, H - 8);
}

// ── canvas: the two lines ─────────────────────────────────────────────────

function drawGrowth(ctx) {
  const cv = document.getElementById('growth-canvas');
  if (!cv) return;
  const { g, W, H } = fitCanvas(cv, 900 / 420);
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#FBF9FF';
  g.fillRect(0, 0, W, H);

  const pts = ctx.growth.points;
  const fs = clamp(W / 45, 9, 12);
  const pad = { l: clamp(W * 0.1, 30, 46), r: 14, t: 16, b: fs * 2.4 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (pts.length < 2) {
    g.fillStyle = '#9A93B9';
    g.font = `${clamp(W / 32, 12, 15)}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.fillText('Two days of steps and the lines appear.', W / 2, H / 2);
    return;
  }

  const maxY = Math.max(1, ...pts.map((p) => Math.max(p.linear, p.increase))) * 1.08;
  const X = (i) => pad.l + (i / (pts.length - 1)) * iw;
  const Y = (v) => pad.t + ih - (v / maxY) * ih;

  // grid
  g.strokeStyle = '#E7E1F7';
  g.lineWidth = 1;
  g.fillStyle = '#9A93B9';
  g.font = `${fs}px ui-monospace, monospace`;
  g.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = (maxY / 4) * i;
    const y = Y(v);
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke();
    g.fillText(Math.round(v), pad.l - 6, y + 3);
  }

  // the gap — this IS the yield, so it gets painted
  g.beginPath();
  pts.forEach((p, i) => { const x = X(i); i === 0 ? g.moveTo(x, Y(p.increase)) : g.lineTo(x, Y(p.increase)); });
  for (let i = pts.length - 1; i >= 0; i--) g.lineTo(X(i), Y(pts[i].linear));
  g.closePath();
  const fill = g.createLinearGradient(0, pad.t, 0, H);
  fill.addColorStop(0, 'rgba(245,174,60,.32)');
  fill.addColorStop(1, 'rgba(245,174,60,.04)');
  g.fillStyle = fill;
  g.fill();

  // linear
  g.beginPath();
  pts.forEach((p, i) => { const x = X(i); i === 0 ? g.moveTo(x, Y(p.linear)) : g.lineTo(x, Y(p.linear)); });
  g.strokeStyle = '#A9A2C6';
  g.lineWidth = 2.5;
  g.stroke();

  // increase
  g.beginPath();
  pts.forEach((p, i) => { const x = X(i); i === 0 ? g.moveTo(x, Y(p.increase)) : g.lineTo(x, Y(p.increase)); });
  g.strokeStyle = '#E0921F';
  g.lineWidth = 3;
  g.stroke();

  // endpoint
  const last = pts[pts.length - 1];
  g.beginPath();
  g.arc(X(pts.length - 1), Y(last.increase), 4.5, 0, Math.PI * 2);
  g.fillStyle = '#E0921F'; g.fill();

  g.fillStyle = '#9A93B9';
  g.font = `${fs}px ui-monospace, monospace`;
  g.textAlign = 'left';
  g.fillText(pts[0].day, pad.l, H - fs * 0.6);
  g.textAlign = 'right';
  g.fillText(last.day, W - pad.r, H - fs * 0.6);

  if (Math.abs(last.increase - last.linear) < 0.01) {
    g.fillStyle = '#7C74A4';
    g.font = `italic ${clamp(W / 40, 10, 13)}px Georgia, serif`;
    g.textAlign = 'center';
    g.fillText('One line. Consistency is what separates them.', W / 2, pad.t + 14);
  }
}

// ── actions ───────────────────────────────────────────────────────────────

const actions = {
  nav(el) {
    App.view = el.dataset.view;
    App.picking = false;
    render();
    if (App.view === 'circle') refreshCircle();
  },

  'step-action'(el) {
    const { view, questId, stoneId } = el.dataset;
    if (questId) return actions['quest-done'](el);
    if (stoneId) {
      App.view = view; render();
      const stone = App.state.stones.find((s) => s.id === stoneId);
      if (stone) openModal(V.woopModal(stone, context()));
      return;
    }
    if (view === 'today' && el.textContent.includes('if-then')) {
      App.view = 'today'; render();
      return openModal(V.questModal(context(), {}));
    }
    App.view = view;
    render();
  },

  'onboard-go'() {
    const name = (document.getElementById('ob-name')?.value || '').trim();
    App.state.player.name = name;
    App.state.settings.displayName = name;
    App.state.meta.onboarded = true;
    chronicle(App.state, {
      kind: 'origin',
      title: 'The vision was opened',
      body: `${name || 'A runner'} began. Nothing has been proved yet — and that is exactly where Gideon was standing when he was called a mighty man of valour.`,
      refs: [{ ref: 'Habakkuk 2:2', why: 'Habakkuk is told to record the revelation plainly enough to be carried at speed.' }],
    });
    persist();
    App.view = 'identity';
    render();
    toast('Begin with who you are becoming.', 'gold');
  },

  // ── identity ──
  'new-identity'() {
    openModal(`
      <div class="eyebrow">Be</div>
      <h2>Who are you becoming?</h2>
      ${V.verseBlock(verseByRef('Judges 6:12'))}
      <div class="field">
        <label for="id-statement">State it as already true</label>
        <input type="text" id="id-statement" placeholder="I am a man who trains before sunrise" data-testid="id-statement">
        <div class="hint">Not "I want to be". Not "I will be". The name comes before the evidence — that is the order God uses, and the order the research supports.</div>
      </div>
      <div class="field">
        <label for="id-domain">Which area?</label>
        <select id="id-domain" data-testid="id-domain">
          ${DOMAINS.map((d) => `<option value="${d.key}">${d.name} — ${d.blurb}</option>`).join('')}
        </select>
      </div>
      <div id="id-errors"></div>
      <div class="btn-row mt16">
        <button class="btn primary" data-act="identity-save" data-testid="identity-save">Name it</button>
        <button class="btn ghost" data-act="close-modal">Cancel</button>
      </div>`);
  },

  'identity-save'() {
    const statement = document.getElementById('id-statement')?.value || '';
    const dom = document.getElementById('id-domain')?.value || DOMAINS[0].key;
    const check = validateIdentity(statement);
    const box = document.getElementById('id-errors');
    if (!check.ok) {
      box.innerHTML = check.errors.map((e) => `<div class="err">${esc(e.message)}${e.help ? `<span class="err-help">${esc(e.help)}</span>` : ''}</div>`).join('');
      return;
    }
    const identity = addIdentity(App.state, { statement: check.normalized, domain: dom });
    chronicle(App.state, {
      kind: 'identity',
      title: `Named: ${identity.statement}`,
      body: 'Called before the evidence exists. Every step from here is a vote for or against this name.',
      refs: [{ ref: 'Romans 4:17', why: 'Paul describes the God Abraham believed, who names what is not yet visible.' }],
    });
    persist();
    closeModal();
    toast('Named. Now seal your Why.', 'gold');
    const id = App.state.identities.find((i) => i.id === identity.id);
    openModal(V.whyModal(id, null));
  },

  'delete-identity'(el) {
    const id = el.dataset.identity;
    if (!confirm('Remove this identity? Votes cast for it stay in your history.')) return;
    App.state.identities = App.state.identities.filter((i) => i.id !== id);
    persist(); render();
  },

  'pick-archetype'(el) {
    App.state.player.newName = el.dataset.name;
    persist(); render();
    toast(`You are walking as ${el.dataset.name}.`, 'gold');
  },

  'save-name'(el) {
    App.state.player.newName = el.value.trim();
    persist();
  },

  'save-letter'() {
    const body = (document.getElementById('letter-body')?.value || '').trim();
    if (body.length < 20) return toast('Write a little more to your future self.', 'bad');
    App.state.letters.unshift({ id: uid('ltr'), ts: Date.now(), body });
    chronicle(App.state, {
      kind: 'letter',
      title: 'A letter was sealed from the appointed time',
      body: 'Closing the gap between you and your future self is one of the few interventions shown to change real financial and health behaviour.',
      refs: [{ ref: 'Habakkuk 2:3', why: 'The LORD tells Habakkuk the revelation has a set time and will not fail.' }],
    });
    persist(); render();
    toast('Sealed.', 'gold');
  },

  // ── the Why vault ──
  'edit-why'(el) {
    const identity = App.state.identities.find((i) => i.id === el.dataset.identity);
    if (identity) openModal(V.whyModal(identity, getWhy(App.vault, identity.id)));
  },

  'why-save'(el) {
    const text = document.getElementById('why-text')?.value || '';
    if (text.trim().length < 10) return toast('Say the real reason.', 'bad');
    setWhy(App.vault, el.dataset.identity, text.trim());
    persistVault();
    closeModal();
    toast('Sealed. This never leaves your device.', 'gold');
  },

  'why-delete'(el) {
    if (!confirm('Erase this Why?')) return;
    delete App.vault.entries[el.dataset.identity];
    persistVault();
    closeModal();
  },

  'why-gate-go'() {
    if (!App.whyGate?.armed) return;   // never trust the DOM for the gate
    const q = App.pendingQuest;
    closeModal();
    if (q) completeQuest(q, { viaGate: true });
  },

  // ── vision ──
  'board-file'(el) {
    const file = el.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast('That image is very large — try one under 8MB.', 'bad');
    const reader = new FileReader();
    reader.onload = () => {
      shrinkImage(String(reader.result), 1400).then((data) => {
        App.state.boards.push({ id: uid('brd'), image: data, name: file.name, createdAt: Date.now() });
        chronicle(App.state, {
          kind: 'board',
          title: 'The vision was made plain',
          body: 'Your board is now in the game. Tap each thing on it to make it a goal.',
          refs: [{ ref: 'Habakkuk 2:2', why: 'Habakkuk is told to record the revelation plainly enough to be carried at speed.' }],
        });
        persist();
        App.picking = true;
        render();
        toast('Now tap the things on your board.', 'gold');
      });
    };
    reader.readAsDataURL(file);
  },

  'toggle-pick'() { App.picking = !App.picking; render(); },

  'board-click'(el, ev) {
    if (!App.picking) return;
    if (ev.target.classList.contains('pin')) return;
    const rect = el.getBoundingClientRect();
    const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
    const board = App.state.boards[App.state.boards.length - 1];
    openStoneComposer({ boardId: board.id, x, y });
  },

  'new-stone'() { openStoneComposer({}); },

  'stone-save'(el) {
    const title = (document.getElementById('s-title')?.value || '').trim();
    if (title.length < 2) {
      document.getElementById('stone-errors').innerHTML = `<div class="err">Give it a name.</div>`;
      return;
    }
    const dom = document.getElementById('s-domain')?.value || DOMAINS[0].key;
    const identityId = document.getElementById('s-identity')?.value || null;
    const meta = JSON.parse(el.dataset.meta || '{}');
    const stone = addStone(App.state, { title, domain: dom, identityId, ...meta });
    if (meta.boardId && meta.x != null) {
      cropBoard(meta.boardId, meta.x, meta.y).then((crop) => {
        stone.crop = crop; persist(); render();
      });
    }
    persist();
    closeModal();
    openModal(V.woopModal(stone, context()));
  },

  'open-stone'(el) {
    const stone = App.state.stones.find((s) => s.id === el.dataset.stone);
    if (stone) openModal(V.woopModal(stone, context()));
  },

  'woop-save'(el) {
    const stone = App.state.stones.find((s) => s.id === el.dataset.stone);
    if (!stone) return;
    const woop = {
      wish: document.getElementById('w-wish')?.value || '',
      outcome: document.getElementById('w-outcome')?.value || '',
      obstacle: document.getElementById('w-obstacle')?.value || '',
      plan: document.getElementById('w-plan')?.value || '',
    };
    const identityId = document.getElementById('w-identity')?.value || null;
    const check = validateWoop(woop);
    const box = document.getElementById('woop-errors');
    if (!check.ok) {
      box.innerHTML = check.errors.map((e) => `<div class="err">${esc(e.message)}${e.help ? `<span class="err-help">${esc(e.help)}</span>` : ''}</div>`).join('');
      return;
    }
    stone.woop = woop;
    stone.woopComplete = true;
    stone.identityId = identityId || stone.identityId;
    chronicle(App.state, {
      kind: 'woop',
      title: `Counted the cost: ${stone.title}`,
      body: `The obstacle was named — "${woop.obstacle.slice(0, 90)}" — and answered with an if-then. This goal is planned.`,
      refs: [{ ref: 'Luke 14:28', why: 'Christ\'s warning about beginning to build without first reckoning what it costs.' }],
    });
    persist();
    closeModal();
    toast('Kindled. Now write the first step.', 'gold');
    openModal(V.questModal(context(), { stoneId: stone.id }));
  },

  'delete-stone'(el) {
    if (!confirm('Delete this goal and its steps?')) return;
    const id = el.dataset.stone;
    App.state.stones = App.state.stones.filter((s) => s.id !== id);
    App.state.quests = App.state.quests.filter((q) => q.stoneId !== id);
    persist(); closeModal();
  },

  // ── quests ──
  'new-quest'() { openModal(V.questModal(context(), {})); },

  'quest-save'() {
    const cue = document.getElementById('q-cue')?.value || '';
    const action = document.getElementById('q-action')?.value || '';
    const place = document.getElementById('q-place')?.value || '';
    const stoneId = document.getElementById('q-stone')?.value || null;
    const level = Number(document.getElementById('q-level')?.value || 2);
    const sealed = document.getElementById('q-sealed')?.checked || false;

    const text = composeIfThen({ cue, action, place });
    const check = validateIfThen(text);
    const box = document.getElementById('quest-errors');
    if (!check.ok) {
      box.innerHTML = check.errors.map((e) => `<div class="err">${esc(e.message)}${e.help ? `<span class="err-help">${esc(e.help)}</span>` : ''}</div>`).join('');
      return;
    }
    const stone = App.state.stones.find((s) => s.id === stoneId);
    addQuest(App.state, {
      stoneId, identityId: stone?.identityId || App.state.identities[0]?.id || null,
      text, cue, action, place, level, sealed,
    });
    persist();
    closeModal();
    toast('Written. The cue will do the work.', 'gold');
  },

  'quest-done'(el) {
    const quest = App.state.quests.find((q) => q.id === el.dataset.quest);
    if (!quest || quest.completedAt) return;

    // Values-affirmation gate: surface the private Why before a hard step.
    const why = quest.identityId ? getWhy(App.vault, quest.identityId) : null;
    if (why && quest.level >= 3) {
      const identity = App.state.identities.find((i) => i.id === quest.identityId);
      App.pendingQuest = quest;
      openWhyGate(identity, why, quest);
      return;
    }
    completeQuest(quest);
  },

  'quest-miss'(el) {
    const quest = App.state.quests.find((q) => q.id === el.dataset.quest);
    if (!quest) return;
    quest.attempts = (quest.attempts || 0) + 1;
    if (quest.identityId) castVote(App.state, { identityId: quest.identityId, questId: quest.id, isFor: false });
    const third = quest.attempts >= 2;
    chronicle(App.state, {
      kind: 'miss',
      title: 'Not today',
      body: third
        ? `"${quest.text}" has been passed over twice. That is a sizing problem, not a character problem — the game will shrink the next ask.`
        : 'Logged honestly. A missed step is information; it is not a verdict.',
      refs: [{ ref: 'Proverbs 24:16', why: 'A proverb describing the just man as one who rises again after falling.' }],
    });
    if (third) {
      quest.level = adjustDifficulty(quest.level, -1);
      const name = App.state.player.newName || App.state.player.name || 'this runner';
      toast(`Why does ${name} keep passing this one? Shrunk to ${difficulty(quest.level).name}.`, '');
    }
    persist(); render();
  },

  // ── focus ──
  'open-focus'(el) {
    const quest = App.state.quests.find((q) => q.id === el.dataset.quest);
    const check = canStartFocus(App.state.focusBlocks.filter((b) => b.day === dayKey()), App.state.focusBlocks[App.state.focusBlocks.length - 1]?.endedAt);
    if (!check.ok) return toast(check.message, 'bad');
    openModal(V.focusModal(quest));
  },

  'focus-start'(el) {
    const minutes = Number(el.dataset.min);
    const rest = Number(el.dataset.rest);
    App.focus = {
      questId: el.dataset.quest || null,
      minutes, rest,
      workSeconds: minutes * 60,
      restSeconds: rest * 60,
      remaining: minutes * 60,
      resting: false,
      startedAt: Date.now(),
      restTaken: 0,
    };
    tickFocus();
    openModal(V.runningFocusModal(App.focus));
  },

  'focus-torest'() {
    App.focus.resting = true;
    App.focus.remaining = App.focus.restSeconds;
    openModal(V.runningFocusModal(App.focus));
  },

  'focus-finish'() { finishFocus(); },

  'focus-abandon'() {
    if (App.focusTimer) clearInterval(App.focusTimer);
    App.focus = null; App.focusTimer = null;
    closeModal();
  },

  // ── logging what actually happened ──
  'new-deed'(el) { openModal(V.deedModal(context(), el?.dataset?.domain || null)); },

  'pick-size'(el) {
    document.getElementById('d-size').value = el.dataset.size;
    for (const c of document.querySelectorAll('.size-chip')) c.classList.remove('on');
    el.classList.add('on');
  },

  'deed-save'() {
    const text = (document.getElementById('d-text')?.value || '').trim();
    const box = document.getElementById('deed-errors');
    if (text.length < 3) {
      box.innerHTML = `<div class="err">Say what you did, even briefly.</div>`;
      return;
    }
    const dom = document.getElementById('d-domain')?.value || DOMAINS[0].key;
    const sizeKey = document.getElementById('d-size')?.value || 'small';
    const identityId = document.getElementById('d-identity')?.value || null;
    const size = deedSize(sizeKey);

    const before = readCharacter(App.state, readState(App.state), DOMAINS);
    const deed = addDeed(App.state, { text, domain: dom, identityId, size: size.key, xp: size.xp });
    if (identityId) castVote(App.state, { identityId, questId: null, isFor: true });

    const after = readCharacter(App.state, readState(App.state), DOMAINS);
    const levelled = after.level > before.level;
    const staged = after.stage.key !== before.stage.key;

    chronicle(App.state, {
      kind: 'deed',
      title: text,
      body: `Logged in ${domain(dom).name}. +${size.xp} XP.`
        + (staged ? ` You reached ${after.stage.name}, level ${after.level}.` : levelled ? ` Level ${after.level}.` : ''),
      refs: [{ ref: 'Hebrews 11:1', why: 'Hebrews describes faith as the evidence of what is not yet seen.' }],
      meta: { deedId: deed.id, domain: dom, xp: size.xp },
    });
    persist();
    closeModal();

    if (levelled) {
      // A new STAGE is a different announcement from a new level inside one.
      openModal(`
        <div class="manna">
          <div class="eyebrow" style="color:var(--gold)">${staged ? 'New stage' : `Level ${after.level}`}</div>
          <div class="m-title">${esc(staged ? after.stage.name : `Level ${after.level}`)}</div>
          <p class="small mut">${esc(staged ? after.stage.line : levelUpLine(after))}</p>
          <button class="btn primary" data-act="close-modal">Go on</button>
        </div>`);
    } else {
      toast(`+${size.xp} XP · ${domain(dom).name} is tended`, 'gold');
    }
  },

  // ── map ──
  'map-tab'(el) { App.mapTab = el.dataset.tab; render(); },

  'open-territory'(el) {
    const key = el.dataset.domain;
    const d = domain(key);
    const stones = App.state.stones.filter((s) => s.domain === key);
    const art = artFor(d.art || d.key, d.hue);
    const verse = d.ref ? verseByRef(d.ref) : null;
    openModal(`
      ${art ? `<div class="hero" style="margin:-22px -22px 16px;border-radius:0">
        <div class="hero-art" style="background-image:url('${art}')"></div>
        <div class="hero-scrim"></div>
        <div class="hero-body"><h1>${esc(d.name)}</h1>
          <div class="small mut">${esc(d.blurb)}</div></div>
      </div>` : `<h2>${esc(d.name)}</h2>`}
      ${verse ? V.verseBlock(verse) : ''}
      <div class="card-head mt16"><h3>Goals here</h3><span class="spacer"></span>
        <span class="pill">${stones.length}</span></div>
      ${stones.length === 0
        ? `<div class="empty">Nothing set in this area yet.</div>`
        : stones.map((st) => {
            const p = stoneProgress(st, App.state.quests);
            return `<div class="row">
              <div class="grow">
                <div class="t">${esc(st.title)}</div>
                <div class="s">${st.woopComplete ? `${p.done}/${p.total} steps` : 'veiled — count the cost'}</div>
              </div>
              <button class="btn sm" data-act="open-stone" data-stone="${esc(st.id)}">${st.woopComplete ? 'Open' : 'Plan it'}</button>
            </div>`;
          }).join('')}
      <div class="btn-row mt16">
        <button class="btn primary" data-act="new-stone-in" data-domain="${esc(key)}">+ Add a goal here</button>
        <button class="btn ghost" data-act="close-modal">Close</button>
      </div>`);
  },

  'new-stone-in'(el) {
    closeModal();
    openStoneComposer({ domain: el.dataset.domain });
  },

  /**
   * Load the board that was uploaded, as Stones.
   *
   * They arrive VEILED like anything else. Seeding saves typing, not the
   * WOOP gate — a pre-loaded uncontrasted board is exactly the de-motivator
   * Oettingen measured, and it would not matter that the app typed it.
   */
  'seed-board'() {
    const state = App.state;
    const existing = new Set(state.stones.map((s) => s.title));
    let added = 0;
    for (const seed of SEED_STONES) {
      if (existing.has(seed.title)) continue;
      const stone = addStone(state, { title: seed.title, domain: seed.domain });
      stone.panel = seed.panel;
      stone.note = seed.note;
      added++;
    }
    chronicle(state, {
      kind: 'board',
      title: `The vision was written — ${added} goals`,
      body: `${BOARD_TITLE} Every one arrives veiled. Count the cost on one and it kindles.`,
      refs: [{ ref: 'Habakkuk 2:2', why: 'Habakkuk is told to record the revelation plainly enough to be carried at speed.' }],
    });
    persist();
    App.view = 'vision';
    render();
    toast(`${added} goals set. Plan the one that matters most.`, 'gold');
  },

  'seed-identity'(el) {
    const seed = SEED_IDENTITIES[Number(el.dataset.i)];
    if (!seed) return;
    openModal(`
      <div class="eyebrow">Be · ${esc(domain(seed.domain).name)}</div>
      <h2>Who are you becoming here?</h2>
      <p class="small mut">${esc(seed.prompt)}</p>
      <div class="field">
        <label for="id-statement">Edit this until it is true to you</label>
        <input type="text" id="id-statement" value="${esc(seed.statement)}" data-testid="id-statement">
        <div class="hint">It still has to pass the same test as anything you type from scratch: present tense, and a behaviour someone could watch.</div>
      </div>
      <input type="hidden" id="id-domain" value="${esc(seed.domain)}">
      <div id="id-errors"></div>
      <div class="btn-row mt16">
        <button class="btn primary" data-act="identity-save" data-testid="identity-save">Name it</button>
        <button class="btn ghost" data-act="close-modal">Cancel</button>
      </div>`);
  },

  'ping-me'() {
    if (!navigator.geolocation) return toast('This device will not share a location.', 'bad');
    toast('Finding you…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const label = prompt('Name this ground (an Ebenezer — "hitherto hath the LORD helped us"):', 'Ebenezer') || 'Ebenezer';
        addPing(App.state, { kind: 'ebenezer', lat: pos.coords.latitude, lng: pos.coords.longitude, label });
        chronicle(App.state, {
          kind: 'ping',
          title: `Ground marked: ${label}`,
          body: 'A place you actually stood, marked. Context becomes part of the memory trace — the same act in the same place builds automaticity faster.',
          refs: [{ ref: '1 Samuel 7:12', why: 'Samuel set a stone at Mizpeh to mark where God had helped Israel.' }],
        });
        persist(); render();
        toast('Ground marked.', 'gold');
      },
      () => toast('Could not get your location.', 'bad'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  },

  'delete-ping'(el) {
    App.state.pings = App.state.pings.filter((p) => p.id !== el.dataset.ping);
    persist(); render();
  },

  // ── circle ──
  async 'circle-create'() {
    const code = makeCircleCode();
    const r = await App.adapter.joinCircle(code, profile());
    if (!r.ok) return toast(r.error || 'Could not start the circle.', 'bad');
    chronicle(App.state, {
      kind: 'circle',
      title: 'A circle was opened',
      body: 'Behaviour spreads through real networks up to three degrees. This is a multiplier in the growth maths, not decoration.',
      refs: [{ ref: 'Ecclesiastes 4:12', why: 'Ecclesiastes on the strength of company over isolation.' }],
    });
    persist(); render(); refreshCircle();
    toast('Circle opened. Send the code.', 'gold');
  },

  async 'circle-join'() {
    const code = normalizeCode(document.getElementById('join-code')?.value || '');
    if (code.length < 8) return toast('That code looks too short.', 'bad');
    const r = await App.adapter.joinCircle(code, profile());
    if (!r.ok) return toast(r.error || 'Could not join.', 'bad');
    persist(); render(); refreshCircle();
    toast('Joined.', 'gold');
  },

  'copy-code'() {
    navigator.clipboard?.writeText(App.state.circle.code || '');
    toast('Copied.');
  },

  async 'chat-send'(el, ev) {
    ev.preventDefault();
    const input = document.getElementById('chat-input');
    const body = (input?.value || '').trim();
    if (!body) return;
    input.value = '';
    const r = await App.adapter.sendMessage(body, profile());
    if (!r.ok) return toast(r.error || 'Could not send.', 'bad');
    await refreshCircle();
  },

  async 'push-snapshot'() {
    const r = await App.adapter.pushSnapshot(profile(), shareable(App.state));
    toast(r.ok ? 'Progress shared.' : (r.error || 'Could not share.'), r.ok ? 'gold' : 'bad');
    refreshCircle();
  },

  async nudge(el) {
    const m = App.members.find((x) => x.playerId === el.dataset.member);
    const name = m?.newName || m?.displayName || 'them';
    // The app's own words. A chat line cannot carry a verse with its
    // reference and context, so it does not quote one.
    await App.adapter.sendMessage(`◇ Thinking of you today, ${name}. Keep going.`, profile());
    refreshCircle();
    toast('Nudged.');
  },

  // ── settings ──
  async 'save-sync'() {
    App.state.settings.supabaseUrl = document.getElementById('set-url')?.value.trim() || '';
    App.state.settings.supabaseKey = document.getElementById('set-key')?.value.trim() || '';
    App.state.settings.displayName = document.getElementById('set-display')?.value.trim() || '';
    App.state.settings.syncMode = App.state.settings.supabaseUrl && App.state.settings.supabaseKey ? 'supabase' : 'local';
    persist();
    App.adapter = createAdapter(App.state);
    App.syncStatus = await App.adapter.status();
    render();
    toast(App.syncStatus.message, App.syncStatus.live ? 'gold' : 'bad');
  },

  async 'test-sync'() {
    App.syncStatus = await App.adapter.status();
    render();
    toast(App.syncStatus.message, App.syncStatus.live ? 'gold' : 'bad');
  },

  'disconnect-sync'() {
    App.state.settings.syncMode = 'local';
    persist();
    App.adapter = createAdapter(App.state);
    render();
    toast('Back to this device only.');
  },

  'set-sabbath'(el) {
    App.state.settings.sabbathEnabled = el.checked;
    persist(); render();
  },

  'set-sabbath-day'(el) {
    App.state.settings.sabbathDay = Number(el.value);
    persist(); render();
  },

  /**
   * Export a portable save.
   *
   * Two paths, because the app runs in two kinds of place. Hosted or opened
   * from disk, an <a download> works. Inside the claude.ai artifact viewer it
   * does NOT — the sandbox never grants the page download permission, so the
   * link silently does nothing. There the save has to go through
   * window.claude.downloads, which asks the viewer first and can be declined.
   */
  async export() {
    const include = document.getElementById('export-vault')?.checked || false;
    const json = exportSave(App.state, App.vault, { includeVault: include });
    const filename = `achieve-${dayKey()}.json`;
    const ok = include ? 'Exported, including your Why.' : 'Exported. Your Why was left out.';

    const dl = globalThis.claude?.downloads;
    if (dl) {
      try {
        await dl.save({ filename, data: json });
        toast(ok, 'gold');
      } catch (err) {
        const code = err?.code || 'unavailable';
        toast(
          code === 'declined' ? 'Export cancelled.'
            : code === 'rate_limited' ? 'One save at a time — try again in a moment.'
            : code === 'too_large' ? 'This save is too large to download here. Remove a board image first.'
            : 'Saving is not available in this view. Open the hosted version to export.',
          code === 'declined' ? '' : 'bad',
        );
      }
      return;
    }

    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(ok, 'gold');
  },

  'import-file'(el) {
    const file = el.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseSave(String(reader.result));
      if (!parsed.ok) return toast(parsed.error, 'bad');
      if (!confirm('Replace everything currently in this game?')) return;
      App.state = migrate(parsed.state);
      if (parsed.vault) { App.vault = parsed.vault; persistVault(); }
      persist();
      App.adapter = createAdapter(App.state);
      render();
      toast('Restored.', 'gold');
    };
    reader.readAsText(file);
  },

  'wipe-vault'() {
    if (!confirm('Erase every private Why? This cannot be undone.')) return;
    App.vault = emptyVault();
    destroyVault();
    toast('The vault is empty.');
  },

  'wipe-all'() {
    if (!confirm('Erase everything — goals, steps, history, the vault?')) return;
    if (!confirm('Really? There is no undo.')) return;
    App.state = emptyState();
    App.vault = emptyVault();
    destroyVault();
    persist(); persistVault();
    App.view = 'today';
    render();
  },

  'close-modal'() { closeModal(); },
  'modal-bg'(el, ev) { if (ev.target === el) closeModal(); },
};

// ── helpers ───────────────────────────────────────────────────────────────

function openStoneComposer(meta) {
  const ids = App.state.identities;
  openModal(`
    <div class="eyebrow">Something from your board</div>
    <h2>What is on your board?</h2>
    ${V.verseBlock(verseByRef('Joshua 4:6'))}
    <div class="field">
      <label for="s-title">Name it plainly</label>
      <input type="text" id="s-title" placeholder="The house with the red door" data-testid="s-title">
    </div>
    <div class="field">
      <label for="s-domain">Area</label>
      <select id="s-domain" data-testid="s-domain">
        ${DOMAINS.map((d) => `<option value="${d.key}" ${meta.domain === d.key ? 'selected' : ''}>${d.name}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label for="s-identity">Who does this belong to? (Be → Do → Have)</label>
      <select id="s-identity" data-testid="s-identity">
        <option value="">— none yet —</option>
        ${ids.map((i) => `<option value="${esc(i.id)}">${esc(i.statement)}</option>`).join('')}
      </select>
    </div>
    <div id="stone-errors"></div>
    <div class="btn-row mt16">
      <button class="btn primary" data-act="stone-save" data-meta='${esc(JSON.stringify(meta))}' data-testid="stone-save">Set the stone</button>
      <button class="btn ghost" data-act="close-modal">Cancel</button>
    </div>`);
}

function completeQuest(quest, opts = {}) {
  const state = App.state;
  quest.completedAt = Date.now();

  const stone = state.stones.find((s) => s.id === quest.stoneId);
  const prog = stone ? stoneProgress(stone, state.quests) : { progress: 0 };
  const mannaToday = state.manna.filter((m) => m.day === dayKey()).length;

  const award = awardFor({
    level: quest.level,
    stoneProgress: prog.progress,
    focused: Boolean(opts.focused),
    sealed: quest.sealed,
    mannaToday,
    seed: `${quest.id}|${dayKey()}`,
  });

  if (award.manna) state.manna.push({ id: uid('mna'), day: dayKey(), spent: false });
  if (quest.identityId) castVote(state, { identityId: quest.identityId, questId: quest.id, isFor: true });

  // Stone complete?
  if (stone) {
    const after = stoneProgress(stone, state.quests);
    if (after.total > 0 && after.done === after.total && !stone.completedAt) {
      stone.completedAt = Date.now();
      chronicle(state, {
        kind: 'stone_taken',
        title: `Ground taken: ${stone.title}`,
        body: 'Every step toward this goal is complete. Faithful over a few things.',
        refs: [{ ref: 'Matthew 25:21', why: 'In the parable of the talents, the servant faithful with little is entrusted with more.' }],
      });
    }
  }

  // Recalibrate.
  const outcomes = state.quests.filter((q) => q.completedAt || q.failedAt)
    .sort((a, b) => (a.completedAt || a.failedAt) - (b.completedAt || b.failedAt))
    .map((q) => Boolean(q.completedAt));
  const cal = calibrate(outcomes);
  if (cal.confident && cal.delta) {
    state.settings.difficultyLevel = adjustDifficulty(state.settings.difficultyLevel, cal.delta);
  }

  const read = readState(state);
  const identity = state.identities.find((i) => i.id === quest.identityId);
  const tally = identity ? tallyIdentity(state.votes, identity.id, { today: read.today }) : null;
  const note = accomplishmentNote({ quest, stone, identity, award, tally, read });
  chronicle(state, note);

  persist();

  if (award.manna) {
    openModal(`
      <div class="manna">
        <div class="m-title">A reward.</div>
        <p class="small mut">Unearned surplus, on top of what you expected. It cannot be hoarded — unspent, it spoils in two days.</p>
        ${V.verseBlock(verseByRef('Exodus 16:4'))}
        <button class="btn primary" data-act="close-modal">Take it</button>
      </div>`);
  } else {
    render();
    toast(tally ? `+${award.xp} · ${tally.ratePct}% ${identity ? 'evidence' : ''}`.trim() : `+${award.xp}`, 'gold');
  }

  if (cal.confident && cal.delta) setTimeout(() => toast(cal.message), 1200);
}

/**
 * The forced dwell on the private Why before a hard step (values
 * affirmation, Cohen & Sherman 2014).
 *
 * The armed flag lives in App state, not on the button. Any re-render — an
 * expiring toast is enough — rebuilds the modal, and a DOM-mutated button
 * would silently snap back to disabled with its timer already cleared,
 * trapping the player. Rendering from state makes that impossible.
 */
const DWELL_MS = 2600;

function openWhyGate(identity, why, quest) {
  clearTimeout(App.whyGateTimer);
  App.whyGate = { armed: false, startedAt: Date.now(), identity, why, quest };
  renderWhyGate();
  App.whyGateTimer = setTimeout(() => {
    if (!App.whyGate) return;
    App.whyGate.armed = true;
    renderWhyGate();
  }, DWELL_MS);
}

function renderWhyGate() {
  const g = App.whyGate;
  if (!g) return;
  const elapsed = Date.now() - g.startedAt;
  openModal(V.whyGateModal(g.identity, g.why, g.quest.text, {
    armed: g.armed,
    percent: Math.min(100, (elapsed / DWELL_MS) * 100),
    remainingMs: Math.max(0, DWELL_MS - elapsed),
  }));
}

function tickFocus() {
  if (App.focusTimer) clearInterval(App.focusTimer);
  App.focusTimer = setInterval(() => {
    if (!App.focus) return clearInterval(App.focusTimer);
    App.focus.remaining -= 1;
    if (App.focus.resting) App.focus.restTaken += 1;
    if (App.focus.remaining <= 0) {
      if (!App.focus.resting) {
        App.focus.resting = true;
        App.focus.remaining = App.focus.restSeconds;
        toast('Time. Now be still — this is where it consolidates.', 'gold');
      } else {
        return finishFocus();
      }
    }
    if (App.modal) openModal(V.runningFocusModal(App.focus));
  }, 1000);
}

function finishFocus() {
  const f = App.focus;
  if (App.focusTimer) clearInterval(App.focusTimer);
  App.focusTimer = null;
  if (!f) return closeModal();

  const credit = focusCredit({
    minutes: f.minutes,
    restTaken: Math.round(f.restTaken / 60),
    restRequired: f.rest,
  });
  App.state.focusBlocks.push({
    id: uid('fcs'), day: dayKey(), minutes: credit.credited,
    raw: f.minutes, questId: f.questId,
    startedAt: f.startedAt, endedAt: Date.now(),
  });
  chronicle(App.state, {
    kind: 'focus',
    title: `${f.minutes} minutes in the Upper Room`,
    body: `${credit.message} Credited ${credit.credited} of ${credit.raw} minutes.`,
    refs: [{ ref: 'Psalm 46:10', why: 'The psalm\'s call to stillness before God.' }],
  });
  App.focus = null;
  persist();
  closeModal();
  toast(credit.message, credit.forfeited ? '' : 'gold');
}

async function refreshCircle() {
  if (!App.state.circle.code) {
    App.members = []; App.messages = [];
    return;
  }
  App.syncStatus = await App.adapter.status();
  App.members = await App.adapter.fetchMembers();
  App.messages = await App.adapter.fetchMessages();
  if (App.view === 'circle') render();
}

function startChatPolling() {
  if (App.chatTimer) clearInterval(App.chatTimer);
  App.chatTimer = setInterval(() => {
    if (App.view === 'circle' && App.state.circle.code && App.adapter.live) refreshCircle();
  }, 4000);
}

/** Shrink a data-URI image so localStorage does not blow its quota. */
function shrinkImage(dataUrl, maxDim) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale >= 1) return resolve(dataUrl);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Cut a thumbnail out of the board around a tapped point. */
function cropBoard(boardId, x, y) {
  return new Promise((resolve) => {
    const board = App.state.boards.find((b) => b.id === boardId);
    if (!board) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height) * 0.26;
      const cx = clamp(x * img.width - size / 2, 0, Math.max(0, img.width - size));
      const cy = clamp(y * img.height - size / 2, 0, Math.max(0, img.height - size));
      const c = document.createElement('canvas');
      c.width = 240; c.height = 180;
      c.getContext('2d').drawImage(img, cx, cy, size, size * 0.75, 0, 0, 240, 180);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(null);
    img.src = board.image;
  });
}

// ── event wiring ──────────────────────────────────────────────────────────

function handle(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const fn = actions[act];
  if (!fn) return;
  if (el.tagName === 'FORM' || act === 'chat-send') ev.preventDefault();
  fn(el, ev);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const tag = el.tagName;
  // Inputs handle themselves on change/submit.
  if (tag === 'INPUT' && el.type === 'file') return;
  if (tag === 'FORM') return;
  handle(ev);
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  if (el.tagName === 'INPUT' && (el.type === 'file' || el.type === 'checkbox') || el.tagName === 'SELECT') handle(ev);
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (el && el.dataset.act === 'save-name') actions['save-name'](el);
});
document.addEventListener('submit', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (el) { ev.preventDefault(); handle(ev); }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && App.modal) closeModal();
});

// Canvases are sized to their display width, so a rotation or resize must
// redraw them or they end up stretched.
let resizeTimer = null;
globalThis.addEventListener?.('resize', () => {
  if (App.view !== 'map' && App.view !== 'growth') return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 140);
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
