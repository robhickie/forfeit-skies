// Renders guide.html to an A4 PDF with headless Edge, filling in the real server address.
// The address only ever goes into a temporary copy in the system temp folder (deleted afterwards)
// and into the PDF itself, so it never lands in guide.html or the public repo. Don't commit the PDF.
//
//   node render-pdf.mjs --address <server address>              -> ..\Forfeit-Skies-Guide.pdf (outside the guide folder, so it never gets committed)
//   node render-pdf.mjs --address <server address> --out C:\path\guide.pdf
//   (or set FORFEIT_SERVER_ADDRESS instead of --address)
//
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const DIR = dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const ADDRESS = arg('--address') || process.env.FORFEIT_SERVER_ADDRESS;
if (!ADDRESS) { console.error('Give the server address: node render-pdf.mjs --address <host>  (kept out of the repo on purpose)'); process.exit(1); }
const OUT = resolve(arg('--out') || join(DIR, '..', 'Forfeit-Skies-Guide.pdf'));
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

let html = readFileSync(join(DIR, 'guide.html'), 'utf8');
if (!html.includes('{{SERVER_ADDRESS}}')) throw new Error('guide.html has no {{SERVER_ADDRESS}} placeholder');
html = html.replaceAll('{{SERVER_ADDRESS}}', ADDRESS)
  // in the PDF, name mods.html as plain text: a link would point at a file path on this PC
  .replace(/<a href="mods\.html">([\s\S]*?)<\/a>/g, '$1')
  // relative paths (logo/, mods.html) keep pointing at the guide folder from the temp copy
  .replace('<head>', `<head>\n<base href="${pathToFileURL(DIR + '\\').href}">`);
const tmp = join(tmpdir(), `forfeit-guide-${process.pid}.html`);
writeFileSync(tmp, html);
try {
  const r = spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${OUT}`, pathToFileURL(tmp).href], { encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(OUT)) { console.error(r.stderr); process.exit(1); }
} finally { rmSync(tmp, { force: true }); }
const pages = (readFileSync(OUT, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`${OUT} (${pages} pages)`);
