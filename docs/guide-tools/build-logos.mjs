// Builds the Forfeit Skies logos from Rob's real Forfeit mark (forfeit-logo.svg).
// The disc, monogram and FORFEIT wordmark are copied from that file unchanged;
// only the cog ring, airship and SKIES lettering are added here.
//
//   node build-logos.mjs          -> writes the SVGs and exports PNGs with headless Edge
//
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'logo');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
mkdirSync(OUT, { recursive: true });

const src = readFileSync(join(DIR, 'forfeit-logo.svg'), 'utf8');
const pick = (re, what) => { const m = src.match(re); if (!m) throw new Error('forfeit-logo.svg: could not find ' + what); return m[1]; };
const HALF = pick(/<path id="half" d="([^"]+)"/, 'the #half path');
const DISC = pick(/<clipPath id="disc"><circle ([^/]+)\/>/, 'the disc circle');
const WORD = pick(/<path fill="#000" d="([^"]+)"/, 'the FORFEIT wordmark');
const fills = [...src.matchAll(/<use href="#half" fill="(#[0-9a-fA-F]{3,6})"/g)].map(m => m[1]);
const BLACK = fills[0] || '#000';
const PURPLE = fills[1] || '#681d9e';
const CX = 131.95, CY = 106.2, R = 60.7;   // disc centre and radius in the source file

// --- the Forfeit mark, verbatim (plus a white disc so the cut-out monogram stays white on any background)
const mark = (p) => `
  <g clip-path="url(#${p}disc)">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="#fff"/>
    <use href="#${p}half" fill="${BLACK}" transform="translate(${CX} ${CY})"/>
    <use href="#${p}half" fill="${PURPLE}" transform="translate(${CX} ${CY}) rotate(180)"/>
  </g>`;
const defs = (p) => `
    <clipPath id="${p}disc"><circle ${DISC}/></clipPath>
    <path id="${p}half" d="${HALF}"/>
    <clipPath id="${p}left"><rect x="${CX - 200}" y="${CY - 200}" width="200" height="400"/></clipPath>
    <clipPath id="${p}right"><rect x="${CX}" y="${CY - 200}" width="200" height="400"/></clipPath>`;

// --- Create-style cog ring around the disc: black on the left, purple on the right, like the disc itself
function cogPath(teeth = 16, rIn = 65.2, rBody = 72.5, rTip = 80) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  const pol = (r, a) => `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2 + step / 2;
    // tooth: slightly tapered, squared ends (matches the squared strokes of the monogram)
    pts.push(pol(rBody, a - step * 0.30), pol(rTip, a - step * 0.20), pol(rTip, a + step * 0.20), pol(rBody, a + step * 0.30));
  }
  const outer = 'M' + pts.join(' L') + ' Z';
  const inner = `M ${CX + rIn} ${CY} A ${rIn} ${rIn} 0 1 0 ${CX - rIn} ${CY} A ${rIn} ${rIn} 0 1 0 ${CX + rIn} ${CY} Z`;
  return outer + ' ' + inner;
}
const cog = (p) => {
  const d = cogPath();
  return `
  <path d="${d}" fill="${BLACK}" fill-rule="evenodd" clip-path="url(#${p}left)"/>
  <path d="${d}" fill="${PURPLE}" fill-rule="evenodd" clip-path="url(#${p}right)"/>`;
};

// --- small airship silhouette (local units: ~44 wide, ~22 tall, nose to the right)
const airship = (x, y, s, fill) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">
    <path d="M4 8 C4 2.6 12 1 22 1 C33 1 40 4.4 41.5 8 C40 11.6 33 15 22 15 C12 15 4 13.4 4 8 Z"/>
    <path d="M7 5 L1 0 L-1.5 0 L2 8 L-1.5 16 L1 16 L7 11 Z"/>
    <path d="M15 14.4 L17 18 H29 L31 14.4 Z"/>
    <rect x="15" y="18" width="16" height="4.2" rx="1.2"/>
    <rect x="11.2" y="17.4" width="2.4" height="5.4" rx="0.8"/>
    <rect x="13.4" y="19.4" width="1.8" height="1.4"/>
  </g>`;

// --- SKIES lettering, built to the wordmark's metrics: cap height 25.5, stroke ~5.86, baseline 210.5
const CAP = 25.5, SW = 5.86;
const E_D = WORD.split(' M').map((s, i) => (i ? 'M' + s : s)).find(s => s.startsWith('M154.'));
const I_D = WORD.split(' M').map((s, i) => (i ? 'M' + s : s)).find(s => s.startsWith('M179.'));
if (!E_D || !I_D) throw new Error('could not find the E and I glyphs in the wordmark');
const E_X = 154.09594480242046, E_W = 170.9040551975795 - E_X;
const I_X = 179.07116976056778, I_W = 184.9288302394322 - I_X;
const S_W = 16.2, K_W = 18.2;
// S: two stacked bowls with flat, squared terminals (same language as the monogram's J)
const sGlyph = (x, top, fill) => {
  const h = SW / 2, r = (CAP / 2 - h) / 2 + 0.05;
  const midY = top + CAP / 2;
  return `<path fill="none" stroke="${fill}" stroke-width="${SW * 0.96}" stroke-linejoin="round" d="M ${x + S_W - 0.2} ${top + h} H ${x + h + r} A ${r} ${r} 0 0 0 ${x + h + r} ${midY} H ${x + S_W - h - r} A ${r} ${r} 0 0 1 ${x + S_W - h - r} ${top + CAP - h} H ${x + 0.2}"/>`;
};
const kGlyph = (x, top, fill, id) => `
    <clipPath id="${id}"><rect x="${x}" y="${top}" width="${K_W}" height="${CAP}"/></clipPath>
    <g fill="${fill}"><rect x="${x}" y="${top}" width="${SW}" height="${CAP}"/></g>
    <g clip-path="url(#${id})" stroke="${fill}" stroke-width="${SW}" stroke-linecap="butt">
      <line x1="${x + 3}" y1="${top + CAP * 0.70}" x2="${x + K_W + 1.2}" y2="${top - 3.5}"/>
      <line x1="${x + 8.8}" y1="${top + CAP * 0.40}" x2="${x + K_W + 1.5}" y2="${top + CAP + 3}"/>
    </g>`;
/** SKIES with its left edge at x, cap top at `top`, letters spread so the word is `width` wide */
function skies(x, top, width, fill, p) {
  const widths = [S_W, K_W, I_W, E_W, S_W];
  const gap = (width - widths.reduce((a, b) => a + b, 0)) / 4;
  const xs = []; let cx = x;
  for (const w of widths) { xs.push(cx); cx += w + gap; }
  const dy = top - 185;   // the source glyphs sit between y 185 and 210.5
  return `
  <g>
    ${sGlyph(xs[0], top, fill)}
    ${kGlyph(xs[1], top, fill, p + 'kclip')}
    <path fill="${fill}" transform="translate(${xs[2] - I_X} ${dy})" d="${I_D}"/>
    <path fill="${fill}" transform="translate(${xs[3] - E_X} ${dy})" d="${E_D}"/>
    ${sGlyph(xs[4], top, fill)}
  </g>`;
}
const WORD_X0 = 49.55223118373326, WORD_X1 = 212.84570094517298, WORD_W = WORD_X1 - WORD_X0;

const svg = (vb, w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">\n  <title>${title}</title>\n${body}\n</svg>\n`;

// 1) Square icon: mark + cog only (Prism / Discord). Everything stays inside the inscribed circle.
const ICON_HALF = 84;
const icon = svg(`${CX - ICON_HALF} ${CY - ICON_HALF} ${ICON_HALF * 2} ${ICON_HALF * 2}`, 512, 512, 'Forfeit Skies',
  `  <defs>${defs('i')}\n  </defs>${cog('i')}${mark('i')}`);
// 1b) Same icon on a white disc, for dark backgrounds (Discord dark mode): the black half and the gap ring stay readable
const badge = svg(`${CX - ICON_HALF} ${CY - ICON_HALF} ${ICON_HALF * 2} ${ICON_HALF * 2}`, 512, 512, 'Forfeit Skies',
  `  <defs>${defs('b')}\n  </defs>\n  <circle cx="${CX}" cy="${CY}" r="${ICON_HALF - 0.5}" fill="#fff"/>${cog('b')}${mark('b')}`);

// 2) Stacked lockup: mark + cog, FORFEIT, then SKIES in purple underneath, airship above right
function stacked(textFill, p) {
  const wordShift = 204 - 185;              // wordmark top 18 units below the cog tips (CY+80)
  return `  <defs>${defs(p)}\n  </defs>${cog(p)}${mark(p)}
  <path fill="${textFill}" transform="translate(0 ${wordShift})" d="${WORD}"/>
  ${skies(WORD_X0, 185 + wordShift + CAP + 9, WORD_W, PURPLE, p)}`;
}
const STACK_VB = `${WORD_X0 - 12} ${CY - 86} ${WORD_W + 24} ${86 + 204 - CY + CAP * 2 + 9 + 14}`;
const stackH = 86 + 204 - CY + CAP * 2 + 9 + 14;

// 3) Wide lockup for the guide header: mark + cog on the left, FORFEIT / SKIES stacked on the right, airship above
function wide(textFill, p) {
  const tx = CX + 80 + 22 - WORD_X0;        // wordmark starts 22 units right of the cog tips
  const ty = (CY - (CAP * 2 + 10) / 2) - 185; // vertically centre the two lines on the disc
  const left = WORD_X0 + tx;
  return `  <defs>${defs(p)}\n  </defs>${cog(p)}${mark(p)}
  <path fill="${textFill}" transform="translate(${tx} ${ty})" d="${WORD}"/>
  ${skies(left, 185 + ty + CAP + 10, WORD_W, PURPLE, p)}
  ${airship(left + WORD_W - 36, 185 + ty - 26, 0.85, PURPLE)}`;
}
const WIDE_X = CX - 84, WIDE_Y = CY - 84;
const WIDE_W = (CX + 80 + 22 + WORD_W + 10) - WIDE_X, WIDE_H = 168;
const wideSvg = (fill, p) => svg(`${WIDE_X} ${WIDE_Y} ${WIDE_W} ${WIDE_H}`, Math.round(WIDE_W * 4), WIDE_H * 4, 'Forfeit Skies', wide(fill, p));

const stackW = WORD_W + 24;
const files = {
  'forfeit-skies-icon.svg': icon,
  'forfeit-skies-badge.svg': badge,
  'forfeit-skies-logo.svg': svg(STACK_VB, Math.round(stackW * 4), Math.round(stackH * 4), 'Forfeit Skies', stacked(BLACK, 's')),
  'forfeit-skies-wide.svg': wideSvg(BLACK, 'w'),
};
for (const [name, body] of Object.entries(files)) writeFileSync(join(OUT, name), body);

// --- PNG export through headless Edge (transparent background)
function png(svgName, pngName, w, h) {
  const tmp = join(tmpdir(), 'fs-logo-' + process.pid + '.html');
  const url = pathToFileURL(join(OUT, svgName)).href;
  writeFileSync(tmp, `<!doctype html><html><body style="margin:0;background:transparent"><img src="${url}" width="${w}" height="${h}" style="display:block"></body></html>`);
  const r = spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--window-size=${w},${h}`, '--default-background-color=00000000', `--screenshot=${join(OUT, pngName)}`, pathToFileURL(tmp).href], { encoding: 'utf8' });
  rmSync(tmp, { force: true });
  const buf = readFileSync(join(OUT, pngName));
  const pw = buf.readUInt32BE(16), ph = buf.readUInt32BE(20);
  console.log(`${pngName}: ${pw}x${ph}` + (pw !== w || ph !== h ? '  (UNEXPECTED SIZE)' : ''));
  if (r.status !== 0) console.log(r.stderr);
}
if (!process.argv.includes('--no-png')) {
  png('forfeit-skies-icon.svg', 'forfeit-skies-icon-128.png', 128, 128);
  png('forfeit-skies-icon.svg', 'forfeit-skies-icon-512.png', 512, 512);
  png('forfeit-skies-badge.svg', 'forfeit-skies-badge-128.png', 128, 128);
  png('forfeit-skies-badge.svg', 'forfeit-skies-badge-512.png', 512, 512);
  png('forfeit-skies-logo.svg', 'forfeit-skies-logo.png', Math.round(stackW * 4), Math.round(stackH * 4));
  png('forfeit-skies-wide.svg', 'forfeit-skies-wide.png', Math.round(WIDE_W * 4), WIDE_H * 4);
}
console.log('logos written to', OUT);

// --- inline the wide logo into guide.html (between the LOGO markers) so the guide works as a single downloaded file
const guidePath = join(DIR, 'guide.html');
if (existsSync(guidePath)) {
  const g = readFileSync(guidePath, 'utf8');
  const inline = files['forfeit-skies-wide.svg'].trim()
    .replace(/ width="\d+" height="\d+"/, ` class="logo" role="img" aria-label="Forfeit Skies" style="height:96px;width:${(96 * WIDE_W / WIDE_H).toFixed(1)}px"`)
    .replace(/\n\s*/g, ' ');
  const g2 = g.replace(/(<!-- LOGO:START[^>]*-->)[\s\S]*?(<!-- LOGO:END -->)/, (_, a, b) => a + inline + b);
  if (g2 === g && !g.includes(inline)) console.warn('guide.html has no <!-- LOGO:START --> ... <!-- LOGO:END --> markers; logo not inlined');
  else if (g2 !== g) { writeFileSync(guidePath, g2); console.log('wide logo inlined into guide.html'); }
}
