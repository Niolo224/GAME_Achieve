/**
 * art.js — territory artwork.
 *
 * ── HOW THIS ART GOT HERE ─────────────────────────────────────────────────
 * Six images were generated with Higgsfield (soul_location), one per
 * territory on the board: a cross on a ridge at sunrise, a pier at golden
 * sunset, a city skyline at blue hour, an empty iron gym at dawn, the earth
 * at night, and a long table lit for a feast.
 *
 * The JPEGs themselves could not be shipped. The image host is blocked by
 * this machine's egress policy, and relaying the binary through the build
 * conversation corrupted it — twice, silently, in ways only a checksum
 * caught. So rather than ship images that decode to nothing, what is
 * embedded here is each render's actual COLOUR COMPOSITION: an 8×6 sample
 * taken from the real generated image, tonally normalised.
 *
 * At runtime that grid is drawn to a small canvas and scaled up with
 * smoothing on, which produces a soft gradient mesh — the light, palette and
 * balance of the original render, abstracted. Behind a scrim with a title on
 * it, that is what a card backdrop wants to be anyway.
 *
 * The whole set costs under 1 KB, renders at any resolution, and cannot
 * silently arrive broken: a corrupted hex digit is one cell of a blur.
 */

/**
 * 8 columns × 6 rows, row-major, each cell three hex digits (4-bit RGB).
 * Sampled from the generated renders with a 1% autocontrast cutoff.
 */
export const ART_GRIDS = {
  faith:
    '88c99cbaccbbdbadcadb9b99656a88db9dcacbacca986544224224223223223224224113' +
    '001000000000000101221111000000000000000000000000000000000000000000000000',
  family:
    '989a99ba9b99989879778768b96db7ffdedaca6a85975864641752ca7b95962753643543' +
    '000000200100001113113002001112311212112112102002102112311212112112002002',
  enterprise:
    '04608c08c19d2ae2ae2ae4ad23437918b17a28b29d29d29c222555567456479589579468' +
    '000222654655666345235455000111222223344444234344000101000000011000101111',
  body:
    '999ddd988644322211111001000654865654432321211100000000211310432432100110' +
    '000000000100433322000211000000000000000000000000000000000000000100210100',
  global:
    '000000000000000000000000001111111111222001001001122222222222554111223345' +
    '000000000000000000000111000000000000000000000000000000000000000000000000',
  brotherhood:
    '110010000000000000000000111111111001000000000000444221111111543655222211' +
    '111222444222221322332443000000222343222010000000000000000122333332221000',
};

export const GRID_W = 8;
export const GRID_H = 6;

/** Parse a grid string into flat RGB bytes for putImageData. */
export function gridToRGBA(grid) {
  const n = GRID_W * GRID_H;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const h = grid.slice(i * 3, i * 3 + 3);
    // 4-bit per channel, expanded to 8-bit (0xA → 0xAA).
    const r = parseInt(h[0], 16) * 17;
    const g = parseInt(h[1], 16) * 17;
    const b = parseInt(h[2], 16) * 17;
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

const cache = new Map();

/**
 * Render a territory's backdrop and return it as a data URI.
 *
 * The 8×6 sample is painted to a tiny canvas, then scaled up with smoothing
 * on so it becomes a continuous gradient mesh rather than visible blocks. A
 * wash in the territory's own hue ties it to the rest of the interface, and
 * a vignette keeps the card's title legible over any part of it.
 *
 * @param {string} key territory key
 * @param {number} hue territory hue, for the wash
 */
export function artFor(key, hue = 42) {
  const grid = ART_GRIDS[key];
  if (!grid) return null;

  const cacheKey = `${key}:${hue}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (typeof document === 'undefined') return null; // node/test environment

  const W = 320, H = 240;

  // 1. The sample, painted at its true tiny size.
  const small = document.createElement('canvas');
  small.width = GRID_W;
  small.height = GRID_H;
  const sg = small.getContext('2d');
  const img = sg.createImageData(GRID_W, GRID_H);
  img.data.set(gridToRGBA(grid));
  sg.putImageData(img, 0, 0);

  // 2. Scaled up with smoothing — this is what turns 48 cells into a mesh.
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, W, H);

  // 3. Lift the sample out of the dark. The renders were shot at night; the
  //    interface they live in now is daylight. Screening a mid grey raises
  //    the blacks without flattening the highlights.
  g.globalCompositeOperation = 'screen';
  g.fillStyle = 'rgb(142, 138, 176)';
  g.fillRect(0, 0, W, H);

  // 4. Hand it the territory's hue outright, keeping the render's luminance.
  //    A translucent wash could not survive step 3 — it came out grey — so
  //    the hue is applied as a blend rather than as a tint.
  g.globalCompositeOperation = 'color';
  g.fillStyle = `hsl(${hue}, 74%, 56%)`;
  g.fillRect(0, 0, W, H);

  // 5. Toward pastel, and a haze at the foot where the title sits.
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(255,255,255,.26)';
  g.fillRect(0, 0, W, H);

  const haze = g.createLinearGradient(0, H, 0, H * 0.46);
  haze.addColorStop(0, 'rgba(255,255,255,.90)');
  haze.addColorStop(0.5, 'rgba(255,255,255,.42)');
  haze.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = haze;
  g.fillRect(0, 0, W, H);

  const uri = c.toDataURL('image/jpeg', 0.82);
  cache.set(cacheKey, uri);
  return uri;
}

/** Structural check — grids must be complete and pure hex. */
export function verifyArt() {
  const problems = [];
  const want = GRID_W * GRID_H * 3;
  for (const [key, grid] of Object.entries(ART_GRIDS)) {
    if (grid.length !== want) {
      problems.push(`${key}: grid is ${grid.length} chars, expected ${want}`);
    }
    if (!/^[0-9a-f]+$/.test(grid)) {
      problems.push(`${key}: grid contains non-hex characters`);
    }
  }
  return problems;
}
