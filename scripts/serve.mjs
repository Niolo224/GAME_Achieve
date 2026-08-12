/** Tiny static server for local play: `npm run serve`. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 5173);

createServer((req, res) => {
  try {
    const html = readFileSync(join(root, 'dist', 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(404).end('Run `npm run build` first.');
  }
}).listen(port, () => console.log(`ACHIEVE running at http://localhost:${port}`));
