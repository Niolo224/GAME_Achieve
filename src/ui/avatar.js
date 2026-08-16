/**
 * avatar.js — draws the figure.
 *
 * Everything here is procedural canvas: no sprite sheet to ship, it scales to
 * any screen, and each stage is a real change in the drawing rather than a
 * swapped asset.
 *
 * The look is soft and daylit — rounded shapes, pastel hills, a friendly
 * character with a big head and big eyes. The scene is not decoration: the
 * six hills ARE the six areas, their colour and height are the vitals,
 * the sun rises with the streak, and the character's gear is its stage. If
 * you can read the picture you can read the save file.
 */

import { clamp } from '../core/util.js';

const STAGE_ORDER = ['ember', 'lamp', 'runner', 'builder', 'steward', 'watchman', 'elder'];

function has(stageKey, feature) {
  const i = STAGE_ORDER.indexOf(stageKey);
  const need = {
    lamp: 1,       // carries a lamp
    cloak: 2,      // a cloak
    staff: 3,      // a staff
    mantle: 4,     // a broader mantle
    watchtower: 5, // a rise underfoot
    radiance: 6,   // the figure gives off light
  }[feature];
  return need !== undefined && i >= need;
}

/** A rounded blob — the only primitive this whole drawing really needs. */
function blob(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

/**
 * @param {HTMLCanvasElement} cv
 * @param {object} ch      from readCharacter()
 * @param {Array} DOMAINS
 * @param {number} t       animation phase, seconds
 */
export function drawAvatar(cv, ch, DOMAINS, t = 0) {
  const cssW = cv.clientWidth || cv.parentElement?.clientWidth || 360;
  const cssH = Math.round(cssW * 0.72);
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.style.height = `${cssH}px`;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = cssW, H = cssH;
  const stage = ch.stage.key;
  const breathe = Math.sin(t * 1.1) * 0.5 + 0.5;
  const flicker = 0.88 + Math.sin(t * 6.3) * 0.06 + Math.sin(t * 11.7) * 0.04;
  const warmth = clamp(ch.wholeness, 0, 1);
  const dawn = clamp(ch.streak / 30, 0, 1);
  const restful = ch.resting;

  g.clearRect(0, 0, W, H);

  // ── sky ────────────────────────────────────────────────────────────────
  // Evening blue while resting; otherwise a soft morning that warms as more
  // of your life is tended.
  const sky = g.createLinearGradient(0, 0, 0, H);
  if (restful) {
    sky.addColorStop(0, '#B9C9F0');
    sky.addColorStop(0.55, '#D6D2F2');
    sky.addColorStop(1, '#F0DCEC');
  } else {
    sky.addColorStop(0, `hsl(${205 - warmth * 6}, ${62 + warmth * 12}%, ${86 - warmth * 2}%)`);
    sky.addColorStop(0.52, `hsl(${38 + warmth * 4}, ${72 + warmth * 16}%, ${93 - warmth * 3}%)`);
    sky.addColorStop(1, `hsl(${32 + warmth * 6}, ${80 + warmth * 12}%, ${90 - warmth * 4}%)`);
  }
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const groundY = H * 0.78;
  const cx = W / 2;

  // ── the sun, rising with the streak ────────────────────────────────────
  const sunX = W * 0.79;
  const sunY = H * (0.34 - dawn * 0.14);
  const sunR = Math.max(9, W * 0.045);
  const halo = g.createRadialGradient(sunX, sunY, sunR * 0.6, sunX, sunY, sunR * 4.4);
  halo.addColorStop(0, `rgba(255, 214, 130, ${0.34 + dawn * 0.26})`);
  halo.addColorStop(1, 'rgba(255, 214, 130, 0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);
  g.fillStyle = restful ? '#EFEAFB' : `hsl(44, 100%, ${76 + dawn * 8}%)`;
  blob(g, sunX, sunY, sunR, sunR);

  // ── clouds, drifting ───────────────────────────────────────────────────
  const cloud = (px, py, s, alpha) => {
    g.fillStyle = `rgba(255,255,255,${alpha})`;
    blob(g, px, py, s * 1.5, s * 0.72);
    blob(g, px - s * 0.95, py + s * 0.16, s * 0.85, s * 0.5);
    blob(g, px + s * 1.0, py + s * 0.2, s * 0.75, s * 0.44);
  };
  const drift = (t * 5) % (W + 200);
  cloud(((W * 0.18 + drift) % (W + 200)) - 100, H * 0.17, W * 0.045, 0.82);
  cloud(((W * 0.62 + drift * 0.6) % (W + 200)) - 100, H * 0.29, W * 0.034, 0.62);
  cloud(((W * 0.92 + drift * 0.35) % (W + 200)) - 100, H * 0.10, W * 0.026, 0.5);

  // ── six hills, one per area ────────────────────────────────────────────
  // Height and colour are the vital. A neglected area does not vanish —
  // it goes pale and low, and it is still standing there when you come back.
  const bandW = W / DOMAINS.length;
  const order = [0, 3, 1, 4, 2, 5];   // interleave so neighbours differ in hue
  order.forEach((di, slot) => {
    const d = DOMAINS[di];
    const v = ch.vitals[d.key]?.value ?? 0.12;
    const hx = slot * bandW + bandW / 2;
    const rise = H * (0.045 + v * 0.115);
    const rx = bandW * 0.92;

    g.beginPath();
    g.moveTo(hx - rx, groundY + 4);
    g.bezierCurveTo(hx - rx * 0.52, groundY - rise, hx + rx * 0.52, groundY - rise, hx + rx, groundY + 4);
    g.closePath();
    const hg = g.createLinearGradient(0, groundY - rise, 0, groundY + 6);
    hg.addColorStop(0, `hsl(${d.hue}, ${24 + v * 46}%, ${88 - v * 18}%)`);
    hg.addColorStop(1, `hsl(${d.hue}, ${18 + v * 34}%, ${80 - v * 16}%)`);
    g.fillStyle = hg;
    g.fill();

    // a lit crown on a hill that has been tended lately
    if (v > 0.3) {
      g.beginPath();
      g.moveTo(hx - rx * 0.62, groundY - rise * 0.30);
      g.bezierCurveTo(hx - rx * 0.30, groundY - rise, hx + rx * 0.30, groundY - rise, hx + rx * 0.62, groundY - rise * 0.30);
      g.strokeStyle = `hsla(${d.hue}, 78%, 74%, ${(v - 0.3) * 0.85})`;
      g.lineWidth = 2.4;
      g.lineCap = 'round';
      g.stroke();
    }
  });

  // ── the meadow the figure stands on ────────────────────────────────────
  const meadow = g.createLinearGradient(0, groundY, 0, H);
  meadow.addColorStop(0, `hsl(${96 + warmth * 16}, ${38 + warmth * 22}%, ${80 - warmth * 6}%)`);
  meadow.addColorStop(1, `hsl(${96 + warmth * 16}, ${34 + warmth * 20}%, ${72 - warmth * 6}%)`);
  g.fillStyle = meadow;
  g.beginPath();
  g.moveTo(-2, groundY + H * 0.055);
  g.bezierCurveTo(W * 0.26, groundY - H * 0.052, W * 0.72, groundY - H * 0.052, W + 2, groundY + H * 0.055);
  g.lineTo(W + 2, H);
  g.lineTo(-2, H);
  g.closePath();
  g.fill();

  // a lit strip along the crest, so the meadow rolls instead of sitting flat
  g.beginPath();
  g.moveTo(-2, groundY + H * 0.055);
  g.bezierCurveTo(W * 0.26, groundY - H * 0.052, W * 0.72, groundY - H * 0.052, W + 2, groundY + H * 0.055);
  g.strokeStyle = `hsla(${92 + warmth * 16}, ${58 + warmth * 20}%, ${88 - warmth * 4}%, .85)`;
  g.lineWidth = Math.max(2, H * 0.012);
  g.stroke();

  // a few tufts, for somewhere to stand rather than a green rectangle
  g.fillStyle = `hsla(${100 + warmth * 12}, 40%, ${66 - warmth * 4}%, .5)`;
  for (let i = 0; i < 7; i++) {
    const tx = ((i * 137) % 100) / 100 * W;
    const ty = groundY + H * (0.075 + ((i * 37) % 9) / 100);
    blob(g, tx, ty, W * 0.022, H * 0.008);
  }

  // ── the rise, once the figure has earned one ───────────────────────────
  const standY = groundY + H * 0.012;
  let feetY = standY;
  if (has(stage, 'watchtower')) {
    g.fillStyle = `hsl(${100 + warmth * 14}, 34%, ${74 - warmth * 4}%)`;
    g.beginPath();
    g.moveTo(cx - W * 0.20, standY + 2);
    g.quadraticCurveTo(cx, standY - H * 0.10, cx + W * 0.20, standY + 2);
    g.closePath();
    g.fill();
    feetY = standY - H * 0.058;
  }

  // ── proportions: a big head and a small round body ─────────────────────
  const grow = 0.80 + clamp(Math.log(1 + ch.level) / Math.log(1 + 40), 0, 1) * 0.20;
  const figH = H * 0.50 * grow;
  const bob = Math.sin(t * 1.15) * (figH * 0.014);

  const headR = figH * 0.185;
  const headY = feetY - figH + headR + bob;
  const bodyTop = headY + headR * 0.80;
  const legLen = figH * 0.13;
  const bodyBot = feetY - legLen;
  const bodyCy = (bodyTop + bodyBot) / 2;
  const bodyRx = figH * 0.155;
  const bodyRy = (bodyBot - bodyTop) / 2 + figH * 0.02;

  const handL = { x: cx - bodyRx * 1.52, y: bodyCy + bodyRy * 0.30 };
  const handR = { x: cx + bodyRx * 1.50, y: bodyCy + bodyRy * 0.24 };

  const SKIN = '#F6D3B0';
  const SKIN_DARK = '#E3B891';
  const TUNIC = has(stage, 'mantle') ? '#F3C367' : '#9B8BEA';
  const TUNIC_DARK = has(stage, 'mantle') ? '#DFA83F' : '#8272DF';

  // ── radiance, at the last stages ───────────────────────────────────────
  if (has(stage, 'radiance')) {
    const aura = g.createRadialGradient(cx, bodyCy, figH * 0.1, cx, bodyCy, figH * 1.25);
    aura.addColorStop(0, `rgba(255, 226, 150, ${0.42 + breathe * 0.16})`);
    aura.addColorStop(1, 'rgba(255, 226, 150, 0)');
    g.fillStyle = aura;
    g.fillRect(0, 0, W, H);
  }

  // ── the shadow it stands in ────────────────────────────────────────────
  g.fillStyle = 'rgba(96, 78, 140, .16)';
  blob(g, cx, feetY + figH * 0.012, bodyRx * 1.18, figH * 0.032);

  // ── staff, planted behind ──────────────────────────────────────────────
  if (has(stage, 'staff')) {
    g.beginPath();
    g.moveTo(handR.x + figH * 0.03, feetY);
    g.lineTo(handR.x + figH * 0.005, headY - headR * 1.15);
    g.strokeStyle = '#C79A63';
    g.lineWidth = Math.max(2.2, figH * 0.026);
    g.lineCap = 'round';
    g.stroke();
    g.fillStyle = '#8FDCC0';
    blob(g, handR.x + figH * 0.005, headY - headR * 1.2, figH * 0.036, figH * 0.036);
  }

  // ── cloak, hanging behind the body ─────────────────────────────────────
  if (has(stage, 'cloak')) {
    const sway = Math.sin(t * 0.9) * figH * 0.014;
    g.beginPath();
    g.moveTo(cx - bodyRx * 0.92, bodyTop + figH * 0.02);
    g.quadraticCurveTo(cx - bodyRx * 1.42 + sway, bodyCy, cx - bodyRx * 1.26 + sway, feetY - figH * 0.02);
    g.quadraticCurveTo(cx + sway, feetY + figH * 0.05, cx + bodyRx * 1.26 + sway, feetY - figH * 0.02);
    g.quadraticCurveTo(cx + bodyRx * 1.42 + sway, bodyCy, cx + bodyRx * 0.92, bodyTop + figH * 0.02);
    g.closePath();
    g.fillStyle = has(stage, 'mantle') ? '#E4894A' : '#6E5FC9';
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 1.4;
    g.stroke();
  }

  // ── legs and feet ──────────────────────────────────────────────────────
  for (const dir of [-1, 1]) {
    g.strokeStyle = SKIN_DARK;
    g.lineWidth = figH * 0.052;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + dir * bodyRx * 0.44, bodyBot - figH * 0.01);
    g.lineTo(cx + dir * bodyRx * 0.46, feetY - figH * 0.018);
    g.stroke();
    g.fillStyle = '#6E62B8';
    blob(g, cx + dir * bodyRx * 0.48, feetY - figH * 0.012, figH * 0.05, figH * 0.028);
  }

  // ── body ───────────────────────────────────────────────────────────────
  g.fillStyle = TUNIC;
  blob(g, cx, bodyCy, bodyRx, bodyRy);
  // a soft shaded underside so it reads as round
  g.fillStyle = TUNIC_DARK;
  g.beginPath();
  g.ellipse(cx, bodyCy, bodyRx, bodyRy, 0, Math.PI * 0.12, Math.PI * 0.88);
  g.fill();
  g.fillStyle = TUNIC;
  blob(g, cx, bodyCy - bodyRy * 0.12, bodyRx * 0.94, bodyRy * 0.86);

  // ── arms ───────────────────────────────────────────────────────────────
  for (const [dir, hand] of [[-1, handL], [1, handR]]) {
    g.strokeStyle = TUNIC_DARK;
    g.lineWidth = figH * 0.048;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + dir * bodyRx * 0.82, bodyCy - bodyRy * 0.18);
    g.quadraticCurveTo(cx + dir * bodyRx * 1.44, bodyCy, hand.x, hand.y);
    g.stroke();
    g.fillStyle = SKIN;
    blob(g, hand.x, hand.y, figH * 0.035, figH * 0.035);
  }

  // ── head ───────────────────────────────────────────────────────────────
  g.fillStyle = SKIN;
  blob(g, cx, headY, headR, headR * 0.96);
  // hair, as a soft cap
  g.fillStyle = '#5B4A78';
  g.beginPath();
  g.ellipse(cx, headY - headR * 0.16, headR * 0.99, headR * 0.82, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(cx, headY - headR * 0.06, headR, headR * 0.92, 0, Math.PI * 1.06, Math.PI * 1.34);
  g.lineWidth = headR * 0.2;
  g.strokeStyle = '#5B4A78';
  g.stroke();

  // eyes — the whole reason the figure reads as friendly
  const blink = (Math.sin(t * 0.7) > 0.985) ? 0.12 : 1;
  const eyeR = headR * 0.145;
  for (const dir of [-1, 1]) {
    g.fillStyle = '#3B3357';
    blob(g, cx + dir * headR * 0.37, headY + headR * 0.10, eyeR, eyeR * 1.12 * blink);
    if (blink > 0.5) {
      g.fillStyle = 'rgba(255,255,255,.92)';
      blob(g, cx + dir * headR * 0.37 + eyeR * 0.32, headY + headR * 0.10 - eyeR * 0.36, eyeR * 0.34, eyeR * 0.34);
    }
  }
  // blush
  g.fillStyle = 'rgba(255, 150, 150, .34)';
  blob(g, cx - headR * 0.66, headY + headR * 0.36, headR * 0.19, headR * 0.13);
  blob(g, cx + headR * 0.66, headY + headR * 0.36, headR * 0.19, headR * 0.13);
  // mouth — a small, calm smile
  g.beginPath();
  g.arc(cx, headY + headR * 0.26, headR * 0.20, Math.PI * 0.18, Math.PI * 0.82);
  g.strokeStyle = '#3B3357';
  g.lineWidth = Math.max(1.2, headR * 0.075);
  g.lineCap = 'round';
  g.stroke();

  // ── the lamp, hanging from the near hand ───────────────────────────────
  if (has(stage, 'lamp')) {
    const lx = handL.x - figH * 0.030;
    const ly = handL.y + figH * 0.070;
    const lampGlow = (0.45 + dawn * 0.55) * flicker;

    const lampHalo = g.createRadialGradient(lx, ly, 1, lx, ly, figH * 0.5);
    lampHalo.addColorStop(0, `rgba(255, 206, 110, ${0.42 * lampGlow})`);
    lampHalo.addColorStop(1, 'rgba(255, 206, 110, 0)');
    g.fillStyle = lampHalo;
    g.fillRect(0, 0, W, H);

    g.beginPath();
    g.moveTo(handL.x, handL.y);
    g.lineTo(lx, ly - figH * 0.040);
    g.strokeStyle = '#B79A6B';
    g.lineWidth = Math.max(1.4, figH * 0.012);
    g.stroke();

    g.fillStyle = '#FFC24D';
    blob(g, lx, ly, figH * 0.042, figH * 0.048);
    g.fillStyle = `rgba(255, 246, 205, ${0.7 + 0.3 * flicker})`;
    blob(g, lx, ly, figH * 0.024, figH * 0.028);
  } else {
    // the ember, before there is a lamp — cupped between the hands
    const ex = cx;
    const ey = (handL.y + handR.y) / 2 + figH * 0.02;
    const eg = g.createRadialGradient(ex, ey, 0, ex, ey, figH * 0.26);
    eg.addColorStop(0, `rgba(255, 152, 84, ${0.5 * flicker})`);
    eg.addColorStop(1, 'rgba(255, 152, 84, 0)');
    g.fillStyle = eg;
    g.fillRect(0, 0, W, H);
    g.fillStyle = `rgba(255, 178, 96, ${0.8 + 0.2 * flicker})`;
    blob(g, ex, ey, figH * 0.026, figH * 0.026);
  }

  // ── resting mark ───────────────────────────────────────────────────────
  if (restful) {
    g.fillStyle = 'rgba(94, 84, 148, .62)';
    g.font = `700 ${Math.max(9, W / 38)}px ui-rounded, ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.fillText('RESTING', cx, H - 9);
  }
}

/** Keep the figure breathing while its view is on screen. */
export function animateAvatar(cv, getCh, DOMAINS) {
  let raf = 0;
  let stopped = false;
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const t0 = performance.now();

  const frame = () => {
    if (stopped || !cv.isConnected) return;
    const ch = getCh();
    if (ch) drawAvatar(cv, ch, DOMAINS, reduce ? 0 : (performance.now() - t0) / 1000);
    if (!reduce) raf = requestAnimationFrame(frame);
  };
  frame();
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
