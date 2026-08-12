/**
 * build.mjs — a tiny purpose-built bundler.
 *
 * Flattens the ES modules into ONE self-contained index.html: no npm
 * dependency, no CDN <script>, no build toolchain to rot. That matters here
 * because the file has to run three ways — opened straight off disk, hosted
 * anywhere static, or published under a strict CSP that blocks every
 * external host.
 *
 * It is safe to do this crudely only because we own every source file and
 * the build FAILS LOUDLY on the one thing that can go wrong: two modules
 * declaring the same top-level name.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(root, 'src', p), 'utf8');

/** Dependency order. Leaves first. */
const MODULES = [
  'core/util.js',
  'data/scripture.js',
  'data/neuro.js',
  'core/state.js',
  'core/identity.js',
  'core/engine.js',
  'core/growth.js',
  'core/storage.js',
  'core/guide.js',
  'ui/views.js',
  'app.js',
];

/** Modules imported elsewhere as `* as NS` need a namespace object built. */
const NAMESPACES = { 'ui/views.js': 'V' };

const IMPORT_RE = /^\s*import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*$/gm;
const BARE_IMPORT_RE = /^\s*import\s+['"][^'"]+['"];?\s*$/gm;

/** Collect the top-level names a module exports. */
function exportedNames(code) {
  const names = new Set();
  const re = /^export\s+(?:async\s+)?(function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(code))) names.add(m[2]);
  return [...names];
}

/** Collect every top-level declaration, so collisions can be caught. */
function topLevelNames(code) {
  const names = [];
  const re = /^(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(code))) names.push(m[1]);
  return names;
}

function strip(code) {
  return code
    .replace(IMPORT_RE, '')
    .replace(BARE_IMPORT_RE, '')
    .replace(/^export\s+/gm, '');
}

const seen = new Map();
const chunks = [];
const problems = [];

for (const path of MODULES) {
  const raw = src(path);
  const names = exportedNames(raw);

  for (const n of topLevelNames(raw)) {
    if (seen.has(n)) {
      problems.push(`Duplicate top-level name "${n}" in ${path} — already declared in ${seen.get(n)}.`);
    } else {
      seen.set(n, path);
    }
  }

  chunks.push(`\n/* ─── ${path} ─────────────────────────────────────── */\n`);
  chunks.push(strip(raw));

  const ns = NAMESPACES[path];
  if (ns) {
    chunks.push(`\nconst ${ns} = { ${names.join(', ')} };\n`);
  }
}

if (problems.length) {
  console.error('\n✗ Build failed — flattening these modules would shadow declarations:\n');
  for (const p of problems) console.error('  • ' + p);
  console.error('\nRename the private helper, or lift it into core/util.js.\n');
  process.exit(1);
}

const js = `(function(){\n"use strict";\n${chunks.join('\n')}\n})();`;
const css = src('styles.css');

const html = src('shell.html')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), html, 'utf8');

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`✓ dist/index.html  ${kb(Buffer.byteLength(html))}`);
console.log(`  ${MODULES.length} modules · ${kb(Buffer.byteLength(js))} js · ${kb(Buffer.byteLength(css))} css`);
console.log(`  ${seen.size} top-level declarations, no collisions`);
