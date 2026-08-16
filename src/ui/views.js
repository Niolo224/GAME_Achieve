/**
 * views.js — pure render functions. Each returns an HTML string.
 *
 * Everything user-supplied goes through esc(). Vision board titles, chat
 * messages and identity statements are all free text, and chat text arrives
 * from other people.
 */

import { esc, pct, ago, dayKey } from '../core/util.js';
import { DOMAINS, domain } from '../core/state.js';
import { artFor } from '../data/art.js';
import { PRINCIPLES, PILLARS } from '../data/neuro.js';
import { SCRIPTURE, verseByRef } from '../data/scripture.js';
import { IDENTITY_TIERS, NAME_ARCHETYPES, automaticityAt } from '../core/identity.js';
import { DIFFICULTY, FOCUS_PRESETS, difficulty } from '../core/engine.js';
import { SEED_STONES, SEED_IDENTITIES, DECLARATION } from '../data/board.js';
import { characterMood, DEED_SIZES, STAGES } from '../core/character.js';

// ── shared fragments ──────────────────────────────────────────────────────

/**
 * Render a verse.
 *
 * The verse text is the Authorized Version verbatim. Anything this app has to
 * say about it is rendered separately and labelled "Note from this app", so a
 * reader is never left guessing which words are scripture and which are ours.
 */
export function verseBlock(v, { small = false, note = true } = {}) {
  if (!v) return '';
  return `<blockquote class="verse${small ? ' sm' : ''}">${esc(v.text)}
    <span class="ref">${esc(v.ref)} · KJV</span>
    ${note && v.context ? `<details class="note-toggle"><summary>Note from this app</summary>
      <span class="note">${esc(v.context)}</span></details>` : ''}
  </blockquote>`;
}

/** A territory's verse, always in full, pulled from the one bank. */
export function domainVerse(key) {
  const d = domain(key);
  return d.ref ? verseByRef(d.ref) : null;
}

/**
 * The mechanism note, collapsed by default.
 *
 * It is still one tap away, but the daily screen should be something you
 * ACT on, not something you read. Process focus beats outcome focus
 * (Pham & Taylor 1999) — and it also beats reading about process focus.
 */
export function whyBlock(p, label = 'Why this works') {
  if (!p) return '';
  return `<details class="why-fold">
    <summary>◈ ${esc(label)}</summary>
    <div class="why">
      <div class="why-body">${esc(p.mechanic)}</div>
      <div class="why-body mt8">${esc(p.finding)}</div>
      <span class="why-cite">${esc(p.source)}</span>
      <span class="why-cite">${esc(p.system)}</span>
    </div>
  </details>`;
}

function domainPill(key) {
  const d = domain(key);
  return `<span class="pill" style="border-color:hsl(${d.hue} 40% 32%);color:hsl(${d.hue} 55% 68%)">${esc(d.name)}</span>`;
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}


/**
 * The character panel — the top of the daily screen.
 *
 * Deliberately placed above the step: the answer to "where are the visuals"
 * is that you should meet the figure before you meet any words.
 */
export function characterPanel(ch) {
  const mood = characterMood(ch);
  const next = ch.nextStage;
  return `<section class="hero-char tone-${esc(mood.tone)}" data-testid="character">
    <canvas id="avatar-canvas" aria-label="Your figure at level ${ch.level}"></canvas>
    <div class="char-body">
      <div class="char-top">
        <div>
          <div class="char-name">${esc(ch.name)}</div>
          <div class="char-stage">${esc(ch.stage.name)} · Level ${ch.level}</div>
        </div>
        <div class="char-hud">
          ${ch.streak ? `<span class="hud-chip gold" title="days standing">▲ ${ch.streak}</span>` : ''}
          <span class="hud-chip" title="grace">✦ ${ch.grace}</span>
        </div>
      </div>

      <div class="xp" title="${ch.intoLevel} / ${ch.levelSpan} XP">
        <i style="width:${pct(ch.levelProgress)}%"></i>
      </div>
      <div class="char-line">
        <span>${esc(mood.line)}</span>
        <b data-testid="xp-to-next">${next ? `${ch.xpToNext} XP to ${esc(next.name)}` : `${ch.xpToNext} XP to level ${ch.level + 1}`}</b>
      </div>

      <div class="vitals" data-testid="vitals">
        ${Object.values(ch.vitals).map((v) => `
          <button class="vital ${esc(v.state)}" data-act="open-territory" data-domain="${esc(v.domain.key)}"
                  data-testid="vital-${esc(v.domain.key)}"
                  title="${esc(v.domain.name)} — ${v.days === null ? 'never tended' : v.days === 0 ? 'tended today' : v.days + ' days since'}">
            <span class="vital-ring" style="--v:${pct(v.value)}%;--h:${v.domain.hue}"></span>
            <span class="vital-name">${esc(v.domain.name.split(' ')[0])}</span>
          </button>`).join('')}
      </div>
    </div>
  </section>`;
}

/** The log-what-you-did composer. */
export function deedModal(ctx, presetDomain = null) {
  const { state } = ctx;
  return `
  <div class="eyebrow">Evidence</div>
  <h2>What did you do?</h2>
  <p class="small mut">It does not have to have been on the list. If it happened, it counts — it feeds the territory and it casts a vote.</p>
  <div class="field">
    <label for="d-text">In your own words</label>
    <input type="text" id="d-text" placeholder="Closed the Anderson deal" data-testid="d-text">
  </div>
  <div class="field">
    <label for="d-domain">Which territory?</label>
    <select id="d-domain" data-testid="d-domain">
      ${DOMAINS.map((d) => `<option value="${esc(d.key)}" ${presetDomain === d.key ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
    </select>
  </div>
  <div class="field">
    <label>How big was it?</label>
    <div class="size-row" data-testid="d-sizes">
      ${DEED_SIZES.map((z, i) => `
        <button type="button" class="size-chip ${i === 0 ? 'on' : ''}" data-act="pick-size" data-size="${esc(z.key)}" data-testid="size-${esc(z.key)}">
          <b>${esc(z.label)}</b><span>${esc(z.line)}</span><i>+${z.xp}</i>
        </button>`).join('')}
    </div>
    <input type="hidden" id="d-size" value="small">
  </div>
  ${state.identities.length ? `
  <div class="field">
    <label for="d-identity">Who does this prove you are?</label>
    <select id="d-identity" data-testid="d-identity">
      <option value="">— no identity —</option>
      ${state.identities.map((i) => `<option value="${esc(i.id)}">${esc(i.statement)}</option>`).join('')}
    </select>
  </div>` : ''}
  <div id="deed-errors"></div>
  <div class="btn-row mt16">
    <button class="btn primary" data-act="deed-save" data-testid="deed-save">Log it</button>
    <button class="btn ghost" data-act="close-modal">Cancel</button>
  </div>`;
}

// ── TODAY ─────────────────────────────────────────────────────────────────

export function todayView(ctx) {
  const { step, word, read, state, growth, character } = ctx;
  const tone = step.tone || 'action';

  const actionBtn = step.action
    ? `<button class="btn primary" data-act="step-action" data-view="${esc(step.action.view)}"
        ${step.action.questId ? `data-quest="${esc(step.action.questId)}"` : ''}
        ${step.action.stoneId ? `data-stone="${esc(step.action.stoneId)}"` : ''}
        data-testid="step-action">${esc(step.action.label)}</button>`
    : '';

  const questExtras = step.kind === 'do_quest' && step.quest
    ? `<div class="btn-row mt16">
         <button class="btn" data-act="open-focus" data-quest="${esc(step.quest.id)}" data-testid="btn-focus">◷ Upper Room</button>
         <button class="btn" data-act="quest-miss" data-quest="${esc(step.quest.id)}">Not today</button>
       </div>`
    : '';

  return `
  ${character ? characterPanel(character) : ''}

  <section class="step tone-${esc(tone)}" data-testid="next-step">
    <div class="eyebrow">${step.kind === 'sabbath' ? 'The Sabbath' : 'The next step'}</div>
    <h1>${esc(step.title)}</h1>
    ${step.kind === 'do_quest' ? `<div class="step-quest" data-testid="quest-text">${esc(step.body)}</div>` : `<div class="step-body">${esc(step.body)}</div>`}
    <div class="btn-row">
      ${step.kind === 'do_quest' && step.quest
        ? `<button class="btn primary" data-act="quest-done" data-quest="${esc(step.quest.id)}" data-testid="btn-complete">✓ Done — cast the vote</button>`
        : actionBtn}
    </div>
    ${questExtras}
    ${verseBlock(step.verse)}
    ${whyBlock(step.why)}
  </section>

  <div class="btn-row mt16">
    <button class="btn primary wide" data-act="new-deed" data-testid="btn-log-deed">✎ Log something I did</button>
  </div>

  ${growth ? growthStrip(growth) : ''}

  <div class="grid three mt16">
    <div class="stat"><div class="n" data-testid="stat-steps">${read.totalSteps}</div><div class="l">Steps</div></div>
    <div class="stat"><div class="n">${read.streak.current}</div><div class="l">Day streak</div></div>
    <div class="stat"><div class="n">${'✦'.repeat(read.streak.tokens) || '—'}</div><div class="l">Grace</div></div>
  </div>

  ${read.streak.state === 'graced' || read.streak.state === 'restoration' ? `
    <div class="card tight mt16" style="border-color:#4a3a5e">
      <div class="eyebrow" style="color:var(--violet)">Grace</div>
      <p class="mb0 small">${esc(read.streak.message)}</p>
      ${verseBlock(SCRIPTURE.find((v) => v.ref === read.streak.ref), { small: true, note: false })}
    </div>` : ''}

  <div class="card mt16">
    <div class="card-head"><h3>The Word for today</h3></div>
    ${verseBlock(word.verse)}
  </div>

  ${openQuestList(state, read)}
  `;
}

function growthStrip(g) {
  const y = Math.round(g.yield * 100);
  return `<div class="card tight mt16" data-testid="growth-strip">
    <div class="row" style="border:0;padding:0">
      <div class="grow">
        <div class="eyebrow" style="margin:0">Two lines, running together</div>
        <div class="small mut">Steps <b style="color:var(--text)">${g.steps}</b> · Increase <b style="color:var(--gold)">${g.increase}</b></div>
      </div>
      <span class="pill gold">${esc(g.tier.label)}${y > 0 ? ` +${y}%` : ''}</span>
    </div>
  </div>`;
}

function openQuestList(state, read) {
  const open = read.openQuests;
  return `<div class="card mt16">
    <div class="card-head">
      <h3>Open steps</h3>
      <span class="spacer"></span>
      <button class="btn sm" data-act="new-quest" data-testid="btn-new-quest">+ Write an if-then</button>
    </div>
    ${open.length === 0
      ? `<div class="empty"><div class="big">◌</div>Nothing open. A vision without a next action is a wish.</div>`
      : open.map((q) => {
          const stone = state.stones.find((s) => s.id === q.stoneId);
          return `<div class="row" data-testid="quest-row">
            <button class="btn sm" data-act="quest-done" data-quest="${esc(q.id)}" title="Cast the vote">✓</button>
            <div class="grow">
              <div class="t">${esc(q.text)}</div>
              <div class="s">${stone ? esc(stone.title) + ' · ' : ''}${esc(difficulty(q.level).name)}${q.sealed ? ' · sealed to the Circle' : ''}</div>
            </div>
          </div>`;
        }).join('')}
  </div>`;
}

// ── VISION (the HAVE) ─────────────────────────────────────────────────────

export function visionView(ctx) {
  const { state, picking } = ctx;
  const board = state.boards[state.boards.length - 1] || null;

  const pins = board
    ? state.stones.filter((s) => s.boardId === board.id && s.x != null)
        .map((s, i) => `<button class="pin ${s.completedAt ? 'done' : s.woopComplete ? '' : 'veiled'}"
            style="left:${s.x * 100}%;top:${s.y * 100}%"
            data-act="open-stone" data-stone="${esc(s.id)}"
            title="${esc(s.title)}">${i + 1}</button>`).join('')
    : '';

  return `
  <div class="card">
    <div class="card-head"><h2>Write the vision</h2></div>
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Habakkuk 2:2'))}
    <div class="btn-row">
      <label class="btn primary" for="board-file" data-testid="btn-upload">⬆ Upload your vision board</label>
      <input type="file" id="board-file" accept="image/*" class="hide" data-act="board-file" data-testid="board-file">
      <button class="btn" data-act="new-stone" data-testid="btn-describe">✎ Describe one instead</button>
      ${board ? `<button class="btn ghost sm ${picking ? 'primary' : ''}" data-act="toggle-pick" data-testid="btn-pick">${picking ? '● Tapping…' : '◎ Tap the board to pin'}</button>` : ''}
    </div>
    ${state.stones.length === 0 ? `
      <div class="card tight mt16" style="border-color:var(--gold-dim);background:linear-gradient(160deg,rgba(224,176,84,.09),transparent 60%),var(--ink-2)">
        <div class="eyebrow" style="color:var(--gold)">Your board, already written</div>
        <p class="small mut mb0">${SEED_STONES.length} things are named on it, across six territories. Load them in one tap — each arrives veiled, so the gate still applies.</p>
        <div class="btn-row mt16">
          <button class="btn primary" data-act="seed-board" data-testid="btn-seed">▣ Load my vision board</button>
        </div>
      </div>` : ''}
    ${board ? `
      <div class="board-wrap mt16 ${picking ? 'picking' : ''}" data-act="board-click" data-testid="board-wrap">
        <img src="${esc(board.image)}" alt="Your vision board">
        ${pins}
      </div>
      <p class="tiny mut mt8">Your board image never leaves this device — it is stripped from anything the Circle can see.</p>
    ` : `<div class="empty mt16"><div class="big">▣</div>No board yet. Upload a photo of it, or describe the things on it one at a time.</div>`}
  </div>

  <div class="card">
    <div class="card-head"><h3>Stones</h3><span class="spacer"></span><span class="pill">${state.stones.length}</span></div>
    <p class="small mut">Joshua took twelve stones out of the Jordan and set them as a memorial. Each thing on your board is one of these — and each stays veiled until you have counted its cost.</p>
    ${state.stones.length === 0 ? `<div class="empty">Nothing written yet.</div>` : `
      <div class="grid two mt16">
        ${state.stones.map((s) => stoneCard(s, ctx)).join('')}
      </div>`}
  </div>`;
}

function stoneCard(s, ctx) {
  const prog = ctx.stoneProgressOf(s);
  const identity = ctx.state.identities.find((i) => i.id === s.identityId);
  return `<div class="stone ${s.woopComplete ? '' : 'veiled'}" data-testid="stone-card">
    ${s.crop ? `<img class="stone-thumb" src="${esc(s.crop)}" alt="">` : ''}
    <div class="stone-dom">${esc(domain(s.domain).name)}</div>
    <div class="stone-title">${esc(s.title)}</div>
    ${identity ? `<div class="tiny mut">↳ ${esc(identity.statement)}</div>` : `<div class="tiny" style="color:var(--flame)">↳ no identity attached</div>`}
    ${s.woopComplete
      ? `<div class="mt8"><div class="bar"><i style="width:${pct(prog.progress)}%"></i></div>
         <div class="tiny mut mt8">${prog.done}/${prog.total} steps${prog.nearing && prog.remaining > 0 ? ' · closing' : ''}</div></div>`
      : `<div class="veil-badge">◈ Veiled — count the cost</div>`}
    <div class="btn-row mt8">
      <button class="btn sm" data-act="open-stone" data-stone="${esc(s.id)}" data-testid="btn-open-stone">${s.woopComplete ? 'Open' : 'Count the cost'}</button>
    </div>
  </div>`;
}

export function woopModal(stone, ctx) {
  const w = stone.woop || {};
  const identities = ctx.state.identities;
  return `
  <div class="eyebrow">The WOOP gate</div>
  <h2>${esc(stone.title)}</h2>
  ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Luke 14:28'))}
  <div class="why">
    <div class="why-head">◈ Why this gate exists</div>
    <div class="why-body">Oettingen (2012) found that positive fantasy <b>alone</b> predicts <b>lower</b> attainment — picturing the win discharges the energy needed to go and get it. An uncontrasted vision board is not neutral, it is a measured de-motivator. This gate is the fix, and Christ gave the instruction first: sit down <i>first</i> and count.</div>
  </div>

  <div class="field">
    <label for="w-identity">Who does this belong to? (Be)</label>
    <select id="w-identity" data-testid="woop-identity">
      <option value="">— attach an identity —</option>
      ${identities.map((i) => `<option value="${esc(i.id)}" ${i.id === stone.identityId ? 'selected' : ''}>${esc(i.statement)}</option>`).join('')}
    </select>
    <div class="hint">Be → Do → Have. A result with no identity behind it has nothing to hold it up.</div>
  </div>

  <div class="field">
    <label for="w-wish">W — the wish</label>
    <input type="text" id="w-wish" value="${esc(w.wish || stone.title)}" data-testid="woop-wish" placeholder="What do you actually want here?">
  </div>
  <div class="field">
    <label for="w-outcome">O — the best outcome</label>
    <textarea id="w-outcome" data-testid="woop-outcome" placeholder="Picture it fully. What does it feel like the morning it is true?">${esc(w.outcome || '')}</textarea>
  </div>
  <div class="field">
    <label for="w-obstacle">O — the obstacle <span class="pill" style="border-color:#5c4030;color:var(--flame)">inside you</span></label>
    <textarea id="w-obstacle" data-testid="woop-obstacle" placeholder="Not your boss, not the economy. What do YOU do at the moment of choice?">${esc(w.obstacle || '')}</textarea>
    <div class="hint">This is the step everyone skips, and skipping it is why vision boards fail.</div>
  </div>
  <div class="field">
    <label for="w-plan">P — the if-then plan</label>
    <textarea id="w-plan" data-testid="woop-plan" placeholder="When [the obstacle shows up], I will [the specific counter-move]">${esc(w.plan || '')}</textarea>
    <div class="hint">Gollwitzer &amp; Sheeran (2006), 94 studies, d = 0.65.</div>
  </div>
  <div id="woop-errors"></div>
  <div class="btn-row mt16">
    <button class="btn primary" data-act="woop-save" data-stone="${esc(stone.id)}" data-testid="woop-save">Kindle this Stone</button>
    <button class="btn ghost" data-act="close-modal">Later</button>
    ${stone.woopComplete ? `<span class="spacer"></span><button class="btn danger sm" data-act="delete-stone" data-stone="${esc(stone.id)}">Delete</button>` : ''}
  </div>`;
}

// ── IDENTITY (the BE) ─────────────────────────────────────────────────────

export function identityView(ctx) {
  const { state, tallies } = ctx;
  return `
  <div class="card">
    <div class="card-head"><h2>Be → Do → Have</h2></div>
    <p class="small mut">${esc(PILLARS.BE.blurb)}</p>
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Romans 4:17'))}
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Judges 6:12'), { small: true })}
  </div>

  <div class="card">
    <div class="card-head">
      <h3>Your name</h3><span class="spacer"></span>
    </div>
    <div class="field">
      <label for="new-name">The name you are walking in</label>
      <input type="text" id="new-name" value="${esc(state.player.newName || '')}" placeholder="Abram became Abraham before the child came" data-act="save-name" data-testid="new-name">
      <div class="hint">Renaming is the oldest identity technology in the book. Abram → Abraham. Jacob → Israel. Simon → Peter.</div>
    </div>
    <div class="scroll-x">
      <div class="btn-row" style="flex-wrap:nowrap">
        ${NAME_ARCHETYPES.map((a) => `<button class="btn sm nowrap" data-act="pick-archetype" data-name="${esc(a.name)}" title="${esc(a.line)}">${esc(a.name)} · ${esc(a.meaning)}</button>`).join('')}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-head">
      <h3>Identities</h3><span class="spacer"></span>
      <button class="btn sm primary" data-act="new-identity" data-testid="btn-new-identity">+ Name one</button>
    </div>
    ${state.identities.length === 0
      ? `<div class="empty"><div class="big">◈</div>Nothing named yet. Everything else in this game hangs off this.</div>`
      : state.identities.map((i) => identityCard(i, tallies[i.id], ctx)).join('')}
    ${state.identities.length < SEED_IDENTITIES.length ? `
      <hr class="sep">
      <div class="eyebrow">Starting points, one per territory</div>
      <div class="seed-row">
        ${SEED_IDENTITIES.map((sd, i) => state.identities.some((x) => x.domain === sd.domain) ? '' : `
          <button class="seed-chip" data-act="seed-identity" data-i="${i}" data-testid="seed-id-${esc(sd.domain)}">
            <span class="sc-t">${esc(sd.statement)}</span>
            <span class="sc-s">${esc(domain(sd.domain).name)} · tap to edit</span>
          </button>`).join('')}
      </div>` : ''}
  </div>

  <div class="card">
    <div class="card-head"><h3>Letter from the appointed time</h3></div>
    <p class="small mut">Write as the person you will be, back to the person reading this. In fMRI most people's brains treat their future self like a <b>stranger</b> — and the smaller that gap, the more they act in that self's interest (Hershfield 2011).</p>
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Habakkuk 2:3'), { small: true })}
    <div class="field">
      <textarea id="letter-body" placeholder="It is two years from now. Here is what I want you to know…" data-testid="letter-body"></textarea>
    </div>
    <button class="btn" data-act="save-letter" data-testid="btn-save-letter">Seal the letter</button>
    ${state.letters.length ? `<hr class="sep">${state.letters.map((l) => `
      <div class="row"><div class="grow"><div class="small">${esc(l.body)}</div><div class="s">${esc(ago(l.ts))}</div></div></div>`).join('')}` : ''}
  </div>`;
}

function identityCard(i, tally, ctx) {
  const hasWhy = ctx.hasWhy(i.id);
  const auto = automaticityAt(tally?.votesFor || 0);
  return `<div class="card tight" style="background:var(--ink-3);margin-bottom:10px" data-testid="identity-card">
    <div class="row" style="border:0;padding:0">
      <div class="grow">
        <div class="t" style="font-family:var(--serif);font-size:1.06rem">${esc(i.statement)}</div>
        <div class="s">${domainPill(i.domain)} <span class="pill gold">${esc(tally?.tier?.name || 'Called')}</span></div>
      </div>
    </div>
    <div class="mt8">
      <div class="bar"><i style="width:${tally ? pct(tally.rate) : 0}%"></i></div>
      <div class="tiny mut mt8">The evidence says this is you <b style="color:var(--gold)">${tally ? tally.ratePct : 0}%</b> of the time · ${tally?.votesFor || 0} votes cast</div>
      <div class="bar thin olive mt8"><i style="width:${pct(auto)}%"></i></div>
      <div class="tiny mut mt8">Automaticity ${pct(auto)}% — Lally's curve plateaus near 66 reps</div>
    </div>
    <div class="btn-row mt8">
      <button class="btn sm ${hasWhy ? '' : 'primary'}" data-act="edit-why" data-identity="${esc(i.id)}" data-testid="btn-why">
        ${hasWhy ? '🔒 Your Why' : '🔒 Seal your Why'}
      </button>
      <button class="btn sm ghost" data-act="delete-identity" data-identity="${esc(i.id)}">Remove</button>
    </div>
  </div>`;
}

export function whyModal(identity, existing) {
  return `
  <div class="eyebrow">Sealed · never leaves this device</div>
  <h2>Why this one?</h2>
  <p class="small mut">${esc(identity.statement)}</p>
  ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Matthew 6:6'))}
  <div class="why">
    <div class="why-head">◈ What this does</div>
    <div class="why-body">Writing a core personal value before a hard task measurably buffers the stress response and improves performance, with effects persisting for months (Cohen &amp; Sherman 2014). Before any hard step, the game will put this in front of you — and hold it there for a moment before the start button arms.</div>
  </div>
  <div class="field">
    <label for="why-text">This is stored in a separate vault, is excluded from every sync and export by default, and is never shown to your Circle.</label>
    <textarea id="why-text" rows="6" placeholder="The real reason. The one you don't say out loud." data-testid="why-text">${esc(existing?.text || '')}</textarea>
  </div>
  <div class="btn-row">
    <button class="btn primary" data-act="why-save" data-identity="${esc(identity.id)}" data-testid="why-save">Seal it</button>
    <button class="btn ghost" data-act="close-modal">Cancel</button>
    ${existing ? `<span class="spacer"></span><button class="btn danger sm" data-act="why-delete" data-identity="${esc(identity.id)}">Erase</button>` : ''}
  </div>`;
}

/**
 * The values-affirmation gate.
 *
 * The armed state is passed in rather than toggled on the DOM node: this
 * modal can be re-rendered at any moment (an expiring toast is enough), and
 * a button armed by direct mutation would silently revert to disabled and
 * lock the player out of their own step.
 */
export function whyGateModal(identity, why, questText, gate = {}) {
  const armed = Boolean(gate.armed);
  const remainingMs = Math.max(0, gate.remainingMs ?? 0);
  return `
  <div class="why-gate">
    <div class="eyebrow">Before you begin</div>
    <h2>Remember why.</h2>
    <div class="why-text" data-testid="why-gate-text">${esc(why.text)}</div>
    <p class="small mut">${esc(questText)}</p>
    <div class="dwell"><i style="width:${armed ? 100 : (gate.percent || 0)}%;${armed ? '' : `transition:width ${remainingMs}ms linear`}"></i></div>
    <div class="btn-row mt16" style="justify-content:center">
      <button class="btn primary" ${armed ? '' : 'disabled'} data-act="why-gate-go" data-testid="why-gate-go">
        ${armed ? 'Now go' : 'Reading…'}</button>
    </div>
  </div>`;
}

// ── MAPS ──────────────────────────────────────────────────────────────────

export function mapView(ctx) {
  const { mapTab, state, territories } = ctx;
  return `
  <div class="map-tabs">
    <button data-act="map-tab" data-tab="land" aria-pressed="${mapTab === 'land'}" data-testid="tab-land">◈ Promised Land</button>
    <button data-act="map-tab" data-tab="earth" aria-pressed="${mapTab === 'earth'}" data-testid="tab-earth">⌖ Real ground</button>
  </div>

  ${mapTab === 'land' ? `
    <div class="terr-grid" data-testid="terr-grid">
      ${DOMAINS.map((d) => {
        const t = territories[d.key] || { total: 0, done: 0, kindled: 0 };
        const frac = t.total ? t.done / t.total : 0;
        const art = artFor(d.art || d.key, d.hue);
        return `<button class="terr ${t.total ? '' : 'unclaimed'}" data-act="open-territory" data-domain="${esc(d.key)}" data-testid="terr-${esc(d.key)}">
          ${art ? `<span class="terr-art" style="background-image:url('${art}')"></span>` : ''}
          <span class="terr-scrim" style="background:linear-gradient(180deg,transparent 20%,hsla(${d.hue},45%,6%,.92) 100%)"></span>
          <span class="terr-body">
            <span class="terr-name">${esc(d.name)}</span>
            <span class="terr-count">${t.total ? `${t.done}/${t.total}` : 'no stones yet'}</span>
            <span class="terr-bar"><i style="width:${pct(frac)}%;background:hsl(${d.hue} 65% 58%)"></i></span>
          </span>
        </button>`;
      }).join('')}
    </div>
  ` : `
    <div class="card">
      <div class="card-head"><h2>Real ground</h2><span class="spacer"></span>
        <button class="btn sm primary" data-act="ping-me" data-testid="btn-ping-me">⌖ Ping me here</button>
      </div>
      ${verseBlock(SCRIPTURE.find((v) => v.ref === '1 Samuel 7:12'))}
      <div class="why">
        <div class="why-head">◈ Why a real map</div>
        <div class="why-body">Godden &amp; Baddeley (1975): divers who learned word lists underwater recalled them far better underwater. Physical context becomes part of the memory trace — so the same act in the same place builds automaticity faster than the same act scattered around. Binding a step to real ground is a real mechanic, not a decoration.</div>
      </div>
      <div class="canvas-wrap mt16"><canvas id="earth-canvas" width="900" height="560"></canvas></div>
      <div class="map-legend">
        <span><i style="background:var(--gold)"></i>Ebenezer — hitherto hath the LORD helped us</span>
        <span><i style="background:var(--water)"></i>Bound step</span>
      </div>
      ${state.pings.length ? `<hr class="sep">${state.pings.slice().reverse().slice(0, 12).map((p) => `
        <div class="row">
          <div class="grow"><div class="t">${esc(p.label || 'Ebenezer')}</div>
          <div class="s">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)} · ${esc(p.day)}${p.note ? ' · ' + esc(p.note) : ''}</div></div>
          <button class="btn sm ghost" data-act="delete-ping" data-ping="${esc(p.id)}">×</button>
        </div>`).join('')}` : `<div class="empty mt16"><div class="big">⌖</div>No ground marked yet. "Ping me here" drops an Ebenezer stone where you stand.</div>`}
    </div>
  `}`;
}

// ── GROWTH ────────────────────────────────────────────────────────────────

export function growthView(ctx) {
  const { growth, explain } = ctx;
  const y = Math.round(growth.yield * 100);
  return `
  <div class="card">
    <div class="card-head"><h2>Linear and exponential, at once</h2></div>
    <div class="chart-wrap"><canvas id="growth-canvas" width="900" height="420"></canvas></div>
    <div class="chart-legend">
      <span><i style="background:#8b8f9e"></i>Steps — one act, one step</span>
      <span><i style="background:var(--gold)"></i>Increase — what compounding added</span>
    </div>
    <div class="grid three mt16">
      <div class="stat"><div class="n">${growth.steps}</div><div class="l">Steps</div></div>
      <div class="stat"><div class="n">${growth.increase}</div><div class="l">Increase</div></div>
      <div class="stat"><div class="n">${y > 0 ? '+' + y + '%' : '0%'}</div><div class="l">${esc(growth.tier.label)}</div></div>
    </div>
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Mark 4:8'))}
  </div>

  <div class="card">
    <div class="card-head"><h3>Where your rate comes from</h3><span class="spacer"></span><span class="pill gold">${explain.ratePct}% / day</span></div>
    <p class="small mut">If this rate is zero the two lines sit exactly on top of each other — and they should. There is no exponential without consistency, and the chart will not pretend otherwise.</p>
    ${explain.parts.map((p) => `
      <div style="margin-bottom:12px">
        <div class="row" style="border:0;padding:0 0 4px">
          <div class="grow"><b class="small">${esc(p.label)}</b></div>
          <span class="tiny mut">+${p.contribution}%/day</span>
        </div>
        <div class="bar thin"><i style="width:${pct(p.value)}%"></i></div>
        <div class="tiny mut mt8">${esc(p.why)}</div>
      </div>`).join('')}
    <div class="ok-msg mt16">Weakest link right now: <b>${esc(explain.weakest.label)}</b>. That is the lever with the most left in it.</div>
  </div>

  <div class="card">
    <div class="card-head"><h3>Why two lines at all</h3></div>
    <p class="small mut">Raw reps flatten — the power law of practice guarantees diminishing returns per rep (Newell &amp; Rosenbloom 1981). So the second line cannot come from grinding harder. It comes from <b>consistency compounding</b> and from the <b>Covenant Circle</b>, which is the only input that grows without you spending more hours. That is why the circle is in the maths and not just in the app.</p>
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Ephesians 3:20'), { small: true })}
  </div>`;
}

// ── CIRCLE ────────────────────────────────────────────────────────────────

export function circleView(ctx) {
  const { state, syncStatus, members, messages, me } = ctx;
  const code = state.circle.code;

  if (!code) {
    return `
    <div class="card">
      <div class="card-head"><h2>The Covenant Circle</h2></div>
      ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Ecclesiastes 4:12'))}
      ${whyBlock(PRINCIPLES.find((p) => p.id === 'social_contagion'), 'Why this is in the maths')}
      <div class="btn-row mt16">
        <button class="btn primary" data-act="circle-create" data-testid="btn-circle-create">Start a circle</button>
      </div>
      <hr class="sep">
      <div class="field">
        <label for="join-code">Or join one with a code</label>
        <input type="text" id="join-code" placeholder="XXXX-XXXX-XXXX-XXXX" data-testid="join-code">
      </div>
      <button class="btn" data-act="circle-join" data-testid="btn-circle-join">Join</button>
    </div>`;
  }

  return `
  <div class="card">
    <div class="card-head">
      <h2>The Circle</h2><span class="spacer"></span>
      <span class="pill ${syncStatus.live ? 'olive' : ''}" data-testid="sync-status">${syncStatus.live ? '● live' : '○ this device'}</span>
    </div>
    <div class="field">
      <label>Invite code — anyone with this can join</label>
      <div class="btn-row">
        <input type="text" readonly value="${esc(code)}" data-testid="circle-code" style="font-family:var(--mono)">
        <button class="btn sm" data-act="copy-code">Copy</button>
      </div>
      ${!syncStatus.live ? `<div class="hint">This circle is on this device only. Turn on live sync in Settings so friends on other phones can actually join.</div>` : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h3>Who is running with you</h3><span class="spacer"></span><span class="pill">${members.length}</span></div>
    ${members.length === 0 ? `<div class="empty">Just you so far. Send the code to someone who will ask you how it went.</div>`
      : members.map((m) => `
        <div class="member">
          <div class="who" style="width:34px;height:34px">${esc(initials(m.newName || m.displayName))}</div>
          <div class="grow">
            <div class="t">${esc(m.newName || m.displayName || 'A runner')}</div>
            <div class="s">${m.snapshot?.stats ? `${m.snapshot.stats.steps || 0} steps · ${m.snapshot.stats.activeDays || 0} days` : 'just joined'}${m.updatedAt ? ' · ' + esc(ago(m.updatedAt)) : ''}</div>
          </div>
          <button class="btn sm ghost" data-act="nudge" data-member="${esc(m.playerId)}" title="Provoke unto love and good works">◇ Nudge</button>
        </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-head"><h3>Chat</h3></div>
    <div class="chat" id="chat-scroll" data-testid="chat">
      ${messages.length === 0 ? `<div class="msg system"><div class="bub">Iron sharpeneth iron. Say something.</div></div>` : ''}
      ${messages.map((m) => `
        <div class="msg ${m.playerId === me.playerId ? 'mine' : ''}">
          <div class="who">${esc(initials(m.newName || m.displayName))}</div>
          <div class="bub">
            <div class="nm">${esc(m.newName || m.displayName || 'runner')}</div>
            <div class="bd">${esc(m.body)}</div>
            <div class="tm">${esc(ago(m.createdAt))}</div>
          </div>
        </div>`).join('')}
    </div>
    <form class="chat-form" data-act="chat-send">
      <input type="text" id="chat-input" placeholder="Say something true" maxlength="2000" data-testid="chat-input" autocomplete="off">
      <button class="btn primary" type="submit" data-testid="chat-send">Send</button>
    </form>
  </div>

  <div class="card">
    <div class="card-head"><h3>Where everyone started</h3><span class="spacer"></span>
      <button class="btn sm" data-act="push-snapshot">Share my progress</button></div>
    <p class="small mut">A recap is a testimony — the road from where each of you began to where you are now.</p>
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Revelation 12:11'), { small: true })}
    ${members.filter((m) => m.snapshot?.stats).map((m) => {
      const st = m.snapshot.stats;
      const days = st.since ? Math.max(1, Math.round((Date.now() - st.since) / 86400000)) : 1;
      return `<div class="row">
        <div class="grow">
          <div class="t">${esc(m.newName || m.displayName)}</div>
          <div class="s">Started ${days}d ago with 0 · now <b style="color:var(--gold)">${st.steps || 0} steps</b>, ${st.stonesComplete || 0}/${st.stones || 0} stones taken</div>
        </div>
      </div>`;
    }).join('') || `<div class="empty">No shared recaps yet.</div>`}
  </div>`;
}

// ── CHRONICLE ─────────────────────────────────────────────────────────────

export function chronicleView(ctx) {
  const { state, recap } = ctx;
  return `
  <div class="card">
    <div class="card-head"><h2>From there to here</h2></div>
    ${verseBlock(recap.verse)}
    <div class="grid three">
      <div class="stat"><div class="n">${recap.daysIn}</div><div class="l">Days in</div></div>
      <div class="stat"><div class="n">${recap.steps}</div><div class="l">Steps</div></div>
      <div class="stat"><div class="n">${recap.longestStreak}</div><div class="l">Longest run</div></div>
    </div>
    <div class="grid three mt16">
      <div class="stat"><div class="n">${recap.stonesTaken}/${recap.stonesTotal}</div><div class="l">Ground taken</div></div>
      <div class="stat"><div class="n">${recap.focusMinutes}</div><div class="l">Focus minutes</div></div>
      <div class="stat"><div class="n">${recap.identityGrowth.length}</div><div class="l">Identities</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h3>The road</h3></div>
    ${recap.milestones.length === 0 ? `<div class="empty">The road starts with one step.</div>` : `
      <div class="timeline">
        ${recap.milestones.map((m) => `
          <div class="tl-item ${m.kind === 'origin' ? 'dim' : ''}">
            <div class="tl-when">${new Date(m.ts).toLocaleDateString()}</div>
            <div class="tl-what">${esc(m.title)}</div>
            <div class="tl-ref">${esc(m.ref)}</div>
          </div>`).join('')}
      </div>`}
  </div>

  <div class="card">
    <div class="card-head"><h3>Notes of what was accomplished</h3><span class="spacer"></span>
      <span class="pill">${state.chronicle.length}</span></div>
    <p class="small mut">Nothing here completes silently. Amabile &amp; Kramer found that of everything affecting inner work life, the biggest driver was progress in meaningful work — and <i>noticing</i> it is part of the effect.</p>
    ${state.chronicle.length === 0 ? `<div class="empty">Nothing yet.</div>` : state.chronicle.slice(0, 60).map((c) => `
      <div class="row" data-testid="chronicle-entry">
        <div class="grow">
          <div class="t">${esc(c.title)}</div>
          <div class="s">${esc(c.body)}</div>
          ${(c.refs || []).map((r) => `<div class="tiny" style="color:var(--gold-2)">${esc(r.ref)} — ${esc(r.why)}</div>`).join('')}
          <div class="tiny mut">${esc(ago(c.ts))}</div>
        </div>
      </div>`).join('')}
  </div>`;
}

// ── CODEX ─────────────────────────────────────────────────────────────────

export function codexView() {
  return `
  <div class="card">
    <div class="card-head"><h2>The Codex</h2></div>
    <p class="small mut">Every mechanic in this game is here, with the study behind it and the verse it serves. Science does not replace the Word — it describes the machinery the Word already commanded. If you can delete a principle and the game still plays identically, it does not belong here.</p>
  </div>

  ${['BE', 'DO', 'HAVE'].map((k) => {
    const pillar = PILLARS[k];
    const list = PRINCIPLES.filter((p) => p.pillar === k);
    return `<div class="card">
      <div class="card-head"><h2 style="font-family:var(--serif)">${esc(pillar.title)}</h2>
        <span class="spacer"></span><span class="pill gold">${list.length}</span></div>
      <p class="small" style="color:var(--gold-2)">${esc(pillar.line)}</p>
      <p class="small mut">${esc(pillar.blurb)}</p>
      <hr class="sep">
      ${list.map((p) => `
        <div style="margin-bottom:18px" data-testid="codex-principle">
          <div class="t">${esc(p.name)}</div>
          <div class="small mut" style="margin:4px 0 6px">${esc(p.finding)}</div>
          <div class="why" style="margin-top:6px">
            <div class="why-head">◈ In this game</div>
            <div class="why-body">${esc(p.mechanic)}</div>
            ${p.ethics ? `<div class="why-body mt8" style="color:var(--flame)">⚠ ${esc(p.ethics)}</div>` : ''}
            <span class="why-cite">${esc(p.source)}</span>
            <span class="why-cite">${esc(p.system)}</span>
          </div>
          <div class="tiny mt8" style="color:var(--gold-2)">Serves: ${esc(p.verse)}</div>
        </div>`).join('')}
    </div>`;
  }).join('')}

  <div class="card">
    <div class="card-head"><h3>The tiers of an identity</h3></div>
    ${IDENTITY_TIERS.map((t) => `
      <div class="row">
        <div class="grow">
          <div class="t">${esc(t.name)} <span class="pill">${t.minVotes}+ votes · ${pct(t.minRate)}%</span></div>
          <div class="s">${esc(t.line)}</div>
          <div class="tiny" style="color:var(--gold-2)">${esc(t.ref)}</div>
        </div>
      </div>`).join('')}
  </div>`;
}

// ── modals: quest composer, focus, settings ───────────────────────────────

export function questModal(ctx, preset = {}) {
  const { state } = ctx;
  const stones = state.stones.filter((s) => s.woopComplete && !s.completedAt);
  return `
  <div class="eyebrow">Write it as an if-then</div>
  <h2>The next step</h2>
  ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Ecclesiastes 3:1'), { small: true })}
  <div class="why">
    <div class="why-head">◈ Why the form is strict</div>
    <div class="why-body">"Go to the gym" is a goal intention. "When I put my keys down after work, I will change into my shoes" is an implementation intention — and across 94 studies it roughly doubled goal attainment (d = 0.65). The cue hands control from effortful deliberation to an automatic response, which is why this form will not accept a bare verb.</div>
  </div>

  ${stones.length === 0 ? `<div class="err">No kindled Stones yet. Count the cost on one first — a step with nothing behind it is just a chore.</div>` : ''}

  <div class="field">
    <label for="q-stone">Toward which Stone?</label>
    <select id="q-stone" data-testid="q-stone">
      <option value="">— none —</option>
      ${stones.map((s) => `<option value="${esc(s.id)}" ${preset.stoneId === s.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}
    </select>
  </div>
  <div class="field">
    <label for="q-cue">When… <span class="mut tiny">(the cue that fires it)</span></label>
    <input type="text" id="q-cue" placeholder="I put my keys down after work" data-testid="q-cue">
  </div>
  <div class="field">
    <label for="q-action">…I will <span class="mut tiny">(the specific act)</span></label>
    <input type="text" id="q-action" placeholder="change into my running shoes and step outside" data-testid="q-action">
  </div>
  <div class="field">
    <label for="q-place">…at <span class="mut tiny">(optional, but it binds the habit to real ground)</span></label>
    <input type="text" id="q-place" placeholder="the front door" data-testid="q-place">
  </div>
  <div class="field">
    <label for="q-level">Size</label>
    <select id="q-level" data-testid="q-level">
      ${DIFFICULTY.map((d) => `<option value="${d.level}" ${(preset.level || state.settings.difficultyLevel) === d.level ? 'selected' : ''}>${esc(d.name)} · ${d.minutes} min — ${esc(d.line)}</option>`).join('')}
    </select>
  </div>
  <div class="field">
    <label><input type="checkbox" id="q-sealed" data-testid="q-sealed" style="width:auto;margin-right:7px">Seal it to the Circle</label>
    <div class="hint">A witnessed commitment is kept more often — and only sealed steps are ever visible to anyone else.</div>
  </div>
  <div id="quest-errors"></div>
  <div class="btn-row mt16">
    <button class="btn primary" data-act="quest-save" data-testid="quest-save">Write it</button>
    <button class="btn ghost" data-act="close-modal">Cancel</button>
  </div>`;
}

export function focusModal(quest) {
  return `
  <div class="eyebrow">The Upper Room</div>
  <h2>Focus</h2>
  <p class="small mut">${esc(quest?.text || 'Attend to one thing.')}</p>
  ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Romans 12:2'), { small: true })}
  <div class="why">
    <div class="why-head">◈ Why the timer, and why the stillness after</div>
    <div class="why-body">Cortical remapping happens only for what the brain <b>attends to</b> — identical unattended input produces no change (Recanzone &amp; Merzenich 1993). Then, immediately after practice, quiet rest produces compressed replay of the sequence at ~20× speed, and the amount of replay predicts later performance (Foster &amp; Wilson 2006). The stillness is not a break from the work. It is part of it.</div>
  </div>
  <div class="btn-row" style="justify-content:center">
    ${FOCUS_PRESETS.map((p) => `<button class="btn" data-act="focus-start" data-min="${p.minutes}" data-rest="${p.rest}" data-quest="${esc(quest?.id || '')}" data-testid="focus-${p.minutes}">
      ${p.minutes}m · ${esc(p.name)}</button>`).join('')}
  </div>
  <p class="tiny mut center mt16">Then ${FOCUS_PRESETS.map((p) => p.rest).join('/')} minutes of stillness. Skipping it forfeits part of the credit.</p>`;
}

export function runningFocusModal(st) {
  const total = st.resting ? st.restSeconds : st.workSeconds;
  const left = st.remaining;
  const frac = total > 0 ? 1 - left / total : 0;
  const R = 74, C = 2 * Math.PI * R;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return `
  <div class="timer ${st.resting ? 'resting' : ''}">
    <div class="ring">
      <svg width="168" height="168">
        <circle cx="84" cy="84" r="${R}" fill="none" stroke="#E7E1F7" stroke-width="8"></circle>
        <circle cx="84" cy="84" r="${R}" fill="none" stroke="${st.resting ? '#57ABE6' : '#F5AE3C'}" stroke-width="8"
          stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"></circle>
      </svg>
      <div class="ring-mid"><div class="clock" data-testid="focus-clock">${mm}:${ss}</div></div>
    </div>
    <div class="phase">${st.resting ? 'Be still, and know' : 'Attend to one thing'}</div>
    ${st.resting ? verseBlock(SCRIPTURE.find((v) => v.ref === 'Psalm 46:10'), { small: true, note: false }) : ''}
    <div class="btn-row mt16" style="justify-content:center">
      ${st.resting
        ? `<button class="btn primary" data-act="focus-finish" data-testid="focus-finish">Finish</button>`
        : `<button class="btn primary" data-act="focus-torest" data-testid="focus-torest">Enter the stillness</button>`}
      <button class="btn ghost" data-act="focus-abandon">Stop</button>
    </div>
  </div>`;
}

export function settingsView(ctx) {
  const { state, syncStatus } = ctx;
  const s = state.settings;
  return `
  <div class="card">
    <div class="card-head"><h2>Settings</h2></div>
    <div class="field">
      <label for="set-display">Your name in the Circle</label>
      <input type="text" id="set-display" value="${esc(s.displayName || state.player.name || '')}" data-testid="set-display">
    </div>
    <hr class="sep">
    <div class="field">
      <label><input type="checkbox" id="set-sabbath" ${s.sabbathEnabled ? 'checked' : ''} style="width:auto;margin-right:7px" data-testid="set-sabbath">The Sabbath lock</label>
      <div class="hint">One day a week this game refuses to give you quests. Psychological detachment predicts recovery better than rest alone (Sonnentag &amp; Fritz 2007). It is also the fourth commandment.</div>
    </div>
    <div class="field">
      <label for="set-sabbath-day">Which day</label>
      <select id="set-sabbath-day" data-testid="set-sabbath-day">
        ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          .map((d, i) => `<option value="${i}" ${s.sabbathDay === i ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h3>Live circle</h3><span class="spacer"></span>
      <span class="pill ${syncStatus.live ? 'olive' : ''}">${syncStatus.live ? '● live' : '○ device only'}</span></div>
    <p class="small mut">${esc(syncStatus.message || '')}</p>
    <p class="small mut">Without this, everything works — but your circle lives on this device only. Add a free Supabase project and friends on other phones can actually join. The SQL to set it up is in the project's <code>supabase/schema.sql</code>.</p>
    <div class="field">
      <label for="set-url">Supabase project URL</label>
      <input type="url" id="set-url" value="${esc(s.supabaseUrl || '')}" placeholder="https://xxxx.supabase.co" data-testid="set-url">
    </div>
    <div class="field">
      <label for="set-key">Supabase anon key</label>
      <input type="password" id="set-key" value="${esc(s.supabaseKey || '')}" placeholder="eyJhbG…" data-testid="set-key">
      <div class="hint">The anon (publishable) key, not the service key. Never paste a service key into any web app.</div>
    </div>
    <div class="btn-row">
      <button class="btn primary" data-act="save-sync" data-testid="btn-save-sync">Connect</button>
      <button class="btn ghost" data-act="test-sync">Test</button>
      ${s.syncMode === 'supabase' ? `<button class="btn danger sm" data-act="disconnect-sync">Disconnect</button>` : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h3>Your data</h3></div>
    <p class="small mut">Everything is stored on this device. Export gives you a portable save — and it <b>excludes your private Why</b> unless you deliberately tick the box.</p>
    <div class="btn-row">
      <button class="btn" data-act="export" data-testid="btn-export">Export save</button>
      <label class="btn" for="import-file">Import save</label>
      <input type="file" id="import-file" accept="application/json,.json" class="hide" data-act="import-file">
    </div>
    <div class="field mt16">
      <label><input type="checkbox" id="export-vault" style="width:auto;margin-right:7px">Include my private Why in the export</label>
    </div>
    <hr class="sep">
    <div class="btn-row">
      <button class="btn danger sm" data-act="wipe-vault">Erase the Why vault</button>
      <button class="btn danger sm" data-act="wipe-all" data-testid="btn-wipe">Erase everything</button>
    </div>
  </div>`;
}

export function onboardingView(ctx) {
  return `
  <div class="card raised">
    <div class="eyebrow">Habakkuk 2:2</div>
    <h1 style="font-family:var(--serif);font-size:1.8rem">Write the vision.<br>Make it plain.</h1>
    ${verseBlock(SCRIPTURE.find((v) => v.ref === 'Habakkuk 2:2'), { note: false })}
    <p class="small mut">This is a vision board that plays back. It runs on one rule, and the rule is not the one the world uses.</p>

    <div class="grid three mt16">
      ${['BE', 'DO', 'HAVE'].map((k) => `
        <div class="card tight" style="background:var(--ink-3);margin:0">
          <div class="eyebrow" style="color:var(--gold)">${esc(PILLARS[k].title)}</div>
          <div class="small">${esc(PILLARS[k].line)}</div>
          <div class="tiny mt8" style="color:var(--gold-2)">${esc(PILLARS[k].verse)}</div>
        </div>`).join('')}
    </div>

    <div class="card tight mt16" style="background:var(--ink-3)">
      <div class="center" style="font-family:var(--serif);font-size:1.02rem;line-height:2">
        <div style="color:var(--bad)">The world: &nbsp;HAVE → DO → BE</div>
        <div style="color:var(--gold)">Scripture: &nbsp;BE → DO → HAVE</div>
      </div>
    </div>
    <p class="small mut mt16">The world runs it backwards — when I <b>have</b> the money, I will <b>do</b> the things, and then I will <b>be</b> free. It never arrives, because the having is the gate and the gate never opens. Scripture reverses it: Abram was renamed father of many while childless, and Gideon was called a mighty man of valour while hiding in a winepress. You are named first. You act from the name. The result gets added.</p>

    <div class="field mt16">
      <label for="ob-name">What should this call you?</label>
      <input type="text" id="ob-name" placeholder="Your name" data-testid="ob-name">
    </div>
    <button class="btn primary" data-act="onboard-go" data-testid="ob-go">Begin</button>
    <p class="tiny mut mt16">Everything stays on this device unless you deliberately connect a circle. Your private Why never syncs at all.</p>
  </div>`;
}
