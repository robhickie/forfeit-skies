// Builds mods.html: a searchable, filterable list of every mod in the Forfeit Skies pack.
// Also refreshes the mod counts in guide.html (the <span data-modcount> / <span data-libcount> markers).
//
//   node build-modlist.mjs                 (default pack: C:\Users\rober\minecraft-pack)
//   node build-modlist.mjs --pack <dir>    (any packwiz pack folder that has mods\*.pw.toml)
//   node build-modlist.mjs --offline       (use only the cache; no network)
//
// Node 24, no npm packages. Mod info comes from the Modrinth API and is cached in
// ..\.cache\ (outside the guide folder) so a failed fetch never wipes the list.
// Icons are downscaled to 64 px with headless Edge and embedded, so mods.html is one self-contained file.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const DIR = dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const PACK = arg('--pack') || 'C:\\Users\\rober\\minecraft-pack';
const OFFLINE = process.argv.includes('--offline');
const CACHE_DIR = join(DIR, '..', '.cache');
const CACHE_FILE = join(CACHE_DIR, 'modrinth-projects.json');
const ICON_CACHE = join(CACHE_DIR, 'icons-64.json');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const UA = 'forfeit-skies-guide-builder/1.0';
const ICON_PX = 64;
const MAX_ICON_BYTES = 3_000_000; // skip anything silly-large before downscaling

// ---------- 1. read the packwiz mod files ----------
function parseToml(text) {
  // just enough TOML for packwiz .pw.toml files: [section] headers and key = value lines
  const out = {}; let sec = out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const h = line.match(/^\[+([^\]]+)\]+$/);
    if (h) { sec = out; for (const part of h[1].split('.')) sec = sec[part] ??= {}; continue; }
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('"')) v = JSON.parse(v.replace(/"\s*#.*$/, '"'));
    else if (v.startsWith("'")) v = v.slice(1, v.lastIndexOf("'"));
    else if (/^-?\d+$/.test(v)) v = Number(v);
    else if (v === 'true' || v === 'false') v = v === 'true';
    sec[kv[1]] = v;
  }
  return out;
}

const modsDir = join(PACK, 'mods');
if (!existsSync(modsDir)) { console.error('No mods folder at ' + modsDir); process.exit(1); }
const mods = readdirSync(modsDir).filter(f => f.endsWith('.pw.toml')).sort().map(file => {
  const t = parseToml(readFileSync(join(modsDir, file), 'utf8'));
  return {
    file,
    key: file.replace(/\.pw\.toml$/, ''),
    name: t.name || file,
    side: t.side || 'both',
    modrinth: t.update?.modrinth?.['mod-id'] || null,
    curseforge: t.update?.curseforge?.['project-id'] || null,
  };
});
console.log(`${mods.length} mods in ${modsDir}`);

// ---------- 2. Modrinth project info (batched, cached) ----------
mkdirSync(CACHE_DIR, { recursive: true });
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
const ids = [...new Set(mods.map(m => m.modrinth).filter(Boolean))];
if (!OFFLINE) {
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const url = 'https://api.modrinth.com/v2/projects?ids=' + encodeURIComponent(JSON.stringify(batch));
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      for (const p of await res.json()) {
        cache[p.id] = { id: p.id, slug: p.slug, title: p.title, description: p.description, categories: p.categories || [],
          additional: p.additional_categories || [], icon_url: p.icon_url || null, project_type: p.project_type, fetched: new Date().toISOString() };
      }
    } catch (e) {
      console.warn(`Modrinth batch ${i / 100 + 1} failed (${e.message}); using cached data for those mods.`);
    }
  }
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
}

// ---------- 3. sort every mod into one main group (plus extra groups for filtering) ----------
const GROUPS = [
  ['create', 'Create & airships', '⚙️'],
  ['magic', 'Magic', '✨'],
  ['tech', 'Tech', '🔋'],
  ['adventure', 'Adventure & bosses', '⚔️'],
  ['world', 'World & structures', '🏔️'],
  ['building', 'Building', '🧱'],
  ['food', 'Food', '🍲'],
  ['qol', 'Quality of life', '🧭'],
  ['library', 'Libraries', '📚'],
];
const CAT_TO_GROUP = {
  magic: 'magic', technology: 'tech', transportation: 'tech', storage: 'qol',
  adventure: 'adventure', mobs: 'adventure', equipment: 'adventure', minigame: 'adventure',
  worldgen: 'world', decoration: 'building', food: 'food',
  utility: 'qol', management: 'qol', optimization: 'qol', 'game-mechanics': 'qol', social: 'qol', economy: 'qol',
  library: 'library',
};
// Hand fixes, keyed by the .pw.toml file name without the extension. Add a line here when a mod lands in the wrong group.
const OVERRIDES = {
  'ftb-library-forge': 'library', 'ftb-teams-forge': 'library', 'ftb-xmod-compat': 'library', 'ftb-filter-system': 'library',
  'ftb-quests-forge': 'qol', 'ftb-ultimine-forge': 'qol',
  // Modrinth tags that put these in a misleading group
  'ars-nouveau': 'magic', 'irons-jewelry': 'magic', 'reliquified-irons-spells-n-spellbooks': 'magic', 'discerning-the-eldritch': 'magic',
  'mowzies-mobs': 'adventure', 'mowzies-cataclysm': 'adventure', 'simply-swords': 'adventure', 'artifacts': 'adventure', 'grapplemod-skybound': 'adventure',
  'mekanism-additions': 'tech', 'mekanism-tools': 'tech', 'draconic-evolution': 'tech',
  'farmers-delight': 'food', 'chefs-delight': 'food', 'l_enders-cataclysm-delight': 'food', 'oceans-delight': 'food',
  'idas': 'world', 'serene-seasons': 'world',
  'twigs': 'building', 'amendments': 'building',
  'waystones': 'qol', 'quark': 'qol', 'xaeros-minimap': 'qol', 'xaeros-world-map': 'qol', 'xaeroplus': 'qol', 'carry-on': 'qol',
  'easy-villagers': 'qol', 'gravestone-mod': 'qol', 'jei': 'qol', 'open-parties-and-claims': 'qol', 'chunky': 'qol', 'etched': 'qol',
  'exposure': 'qol', 'comforts': 'qol', 'sound-physics-remastered': 'qol', 'torchmaster': 'qol', 'travelers-titles': 'qol',
  'enchantment-descriptions': 'qol', 'ambientsounds': 'qol', 'chat-heads': 'qol', 'appleskin': 'qol',
  'better-advanced-tooltips': 'qol', 'simply-tooltips': 'qol',
  'cristel-lib': 'library', 'lithostitched': 'library', 'moogs-structure-lib': 'library', 'yungs-api': 'library', 'terrablender': 'library',
  'curios': 'library', 'smartbrainlib': 'library', 'familiarslib': 'library', 'atlas-api': 'library', 'azimuth-api': 'library',
  'glodium': 'library', 'irons-lib': 'library', 'data-anchor': 'library', 'athena-ctm': 'library', 'fusion-connected-textures': 'library',
};
const PRIORITY = ['create', 'magic', 'tech', 'world', 'adventure', 'food', 'building', 'qol'];
const isCreate = (m, p) => /(^|[^a-z])(create|aeronautics|sable)([^a-z]|$)/i.test(`${m.name} ${m.key} ${p?.slug || ''}`);

for (const m of mods) {
  const p = m.modrinth ? cache[m.modrinth] : null;
  m.info = p;
  const main = (p?.categories || []).map(c => CAT_TO_GROUP[c]).filter(Boolean);
  const extra = (p?.additional || []).map(c => CAT_TO_GROUP[c]).filter(Boolean);
  const all = new Set([...main, ...extra]);
  if (isCreate(m, p)) all.add('create');
  let group = OVERRIDES[m.key];
  if (!group) {
    if (isCreate(m, p)) group = 'create';
    // "library" only wins when it is one of the mod's main Modrinth categories and nothing more specific is
    if (!group && main.includes('library') && main.filter(g => g !== 'library' && g !== 'qol').length === 0) group = 'library';
    if (!group) group = PRIORITY.find(g => main.includes(g)) || PRIORITY.find(g => all.has(g)) || 'qol';
  }
  all.add(group);
  if (group !== 'library') all.delete('library');
  m.group = group;
  m.tags = group === 'library' || OVERRIDES[m.key] ? [group] : [...all];   // libraries only ever show under the Libraries filter (or a search)
  m.title = (p?.title || m.name).trim();
  m.description = p?.description || '';
  m.url = p ? `https://modrinth.com/mod/${p.slug}` : m.curseforge ? `https://www.curseforge.com/projects/${m.curseforge}` : null;
  if (!p && m.modrinth) console.warn(`No Modrinth data for ${m.name} (${m.modrinth}); listed by name only.`);
}

// ---------- 4. icons: download, downscale to 64 px in headless Edge, embed as data URIs ----------
const iconCache = existsSync(ICON_CACHE) ? JSON.parse(readFileSync(ICON_CACHE, 'utf8')) : {};
const needIcons = [...new Set(mods.map(m => m.info?.icon_url).filter(u => u && !iconCache[u]))];
if (needIcons.length && !OFFLINE) {
  console.log(`Downscaling ${needIcons.length} new icons...`);
  const originals = {};
  let next = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < needIcons.length) {
      const u = needIcons[next++];
      try {
        const res = await fetch(u, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > MAX_ICON_BYTES) throw new Error('too large');
        const type = (res.headers.get('content-type') || 'image/png').split(';')[0];
        originals[u] = `data:${type};base64,${buf.toString('base64')}`;
      } catch (e) { console.warn(`icon ${u}: ${e.message}`); }
    }
  }));
  const got = await downscaleInEdge(Object.entries(originals));
  Object.assign(iconCache, got);
  console.log(`  ${Object.keys(got).length} icons ready`);
  writeFileSync(ICON_CACHE, JSON.stringify(iconCache));
}

/** Downscale [url, dataUri] pairs to ICON_PX webp data URIs, using headless Edge over the DevTools protocol. */
async function downscaleInEdge(list) {
  if (!list.length) return {};
  const profile = join(tmpdir(), `fs-edge-${process.pid}`);
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const browserWs = await new Promise((ok, fail) => {
      let err = '';
      const t = setTimeout(() => fail(new Error('Edge did not start: ' + err.slice(-300))), 30000);
      edge.stderr.on('data', d => { err += d; const m = err.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } });
    });
    const port = new URL(browserWs).port;
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = () => fail(new Error('DevTools connection failed')); });
    let id = 0; const waiting = new Map();
    ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); } };
    const send = (method, params) => new Promise(ok => { const n = ++id; waiting.set(n, ok); ws.send(JSON.stringify({ id: n, method, params })); });
    const fn = `async (items, px) => {
      const res = {};
      for (const [u, d] of items) {
        try {
          const img = new Image(); img.src = d; await img.decode();
          const c = document.createElement('canvas'); c.width = c.height = px;
          const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
          const s = Math.min(px / img.naturalWidth, px / img.naturalHeight);
          const w = img.naturalWidth * s, h = img.naturalHeight * s;
          g.drawImage(img, (px - w) / 2, (px - h) / 2, w, h);
          res[u] = c.toDataURL('image/webp', 0.86);
        } catch (e) {}
      }
      return res;
    }`;
    const out = {};
    for (let i = 0; i < list.length; i += 40) {   // small chunks keep each DevTools message a sensible size
      const r = await send('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(list.slice(i, i + 40))}, ${ICON_PX})`, awaitPromise: true, returnByValue: true });
      if (r.result?.result?.value) Object.assign(out, r.result.result.value);
      else console.warn('icon chunk failed: ' + JSON.stringify(r.error || r.result?.exceptionDetails || {}).slice(0, 200));
    }
    ws.close();
    return out;
  } catch (e) {
    console.warn('Icon downscaling failed (' + e.message + '); mods without cached icons get a letter tile.');
    return {};
  } finally {
    edge.kill();
    await new Promise(r => setTimeout(r, 800));
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

// ---------- 5. write mods.html ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const groupName = Object.fromEntries(GROUPS.map(([k, n]) => [k, n]));
const counts = Object.fromEntries(GROUPS.map(([k]) => [k, mods.filter(m => m.tags.includes(k)).length]));
const main = mods.filter(m => m.group !== 'library');
const libs = mods.length - main.length;
mods.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));

const logoPath = join(DIR, 'logo', 'forfeit-skies-wide.svg');
const logo = existsSync(logoPath) ? 'data:image/svg+xml;base64,' + readFileSync(logoPath).toString('base64') : '';
// Forfeit colours, taken from forfeit-logo.svg (#000 and #681d9e); same values as guide.html
const css = `:root { --ink:#000; --purple:#681d9e; --purple-dark:#4a1471; --purple-soft:#f1e8f8; --muted:#5d5866; --line:#e2dde8; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Segoe UI", system-ui, sans-serif; color: var(--ink); font-size: 10.5pt; line-height: 1.45; }
header.brand { border-bottom: 6px solid var(--ink); padding-bottom: 10px; position: relative; }
header.brand::after { content: ""; position: absolute; left: 50%; right: 0; bottom: -6px; height: 6px; background: var(--purple); }
header.brand .logo { height: 110px; display: block; }
header.brand .strap { margin-top: 6px; color: var(--muted); }
header.brand .strap b { color: var(--ink); }
footer { margin: 16px 0 4px; color: var(--muted); font-size: 8.5pt; text-align: center; }`;

const card = (m) => {
  const icon = m.info?.icon_url && iconCache[m.info.icon_url];
  const letter = esc((m.title.match(/[A-Za-z0-9]/) || ['?'])[0].toUpperCase());
  const side = m.side === 'client' ? '<span class="side">client only</span>' : m.side === 'server' ? '<span class="side">server only</span>' : '';
  const hay = esc(`${m.title} ${m.name} ${m.description} ${m.tags.map(t => groupName[t]).join(' ')}`.toLowerCase());
  const title = m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a>` : esc(m.title);
  return `<li class="mod" data-group="${m.group}" data-tags="${m.tags.join(' ')}" data-hay="${hay}">
  ${icon ? `<img src="${icon}" alt="" width="40" height="40" loading="lazy">` : `<span class="ph">${letter}</span>`}
  <div><h3>${title}${side}</h3><p>${esc(m.description) || '<i>No description (CurseForge-only mod).</i>'}</p>
  <span class="tag t-${m.group}">${esc(groupName[m.group])}</span></div></li>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Forfeit Skies: mod list</title>
<!-- Generated by build-modlist.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand: rerun the script. -->
<style>
${css}
body { max-width: 1100px; margin: 0 auto; padding: 18px; }
.bar { position: sticky; top: 0; background: #fff; padding: 10px 0 8px; z-index: 2; border-bottom: 1px solid var(--line); }
#q { width: 100%; font: inherit; font-size: 12pt; padding: 9px 12px; border: 2px solid var(--ink); border-radius: 8px; }
#q:focus { outline: none; border-color: var(--purple); box-shadow: 0 0 0 3px var(--purple-soft); }
.filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.filters button { font: inherit; font-size: 9.8pt; font-weight: 600; border: 2px solid var(--ink); background: #fff; color: var(--ink); border-radius: 999px; padding: 4px 11px; cursor: pointer; }
.filters button[aria-pressed="true"] { background: var(--purple); border-color: var(--purple); color: #fff; }
.filters button small { opacity: .7; font-weight: 400; }
.status { color: var(--muted); font-size: 9.5pt; margin-top: 6px; }
ul.mods { list-style: none; padding: 0; margin: 12px 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 8px; }
.mod { display: flex; gap: 10px; border: 1px solid var(--line); border-left: 4px solid var(--purple); border-radius: 8px; padding: 9px 11px; break-inside: avoid; }
.mod[data-group="library"] { border-left-color: #9aa1ab; }
.mod img, .mod .ph { width: 40px; height: 40px; border-radius: 6px; flex: none; }
.mod .ph { background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16pt; }
.mod h3 { margin: 0; font-size: 10.6pt; }
.mod h3 a { color: var(--ink); text-decoration: none; }
.mod h3 a:hover { color: var(--purple); text-decoration: underline; }
.mod p { margin: 2px 0 4px; font-size: 9.4pt; color: #353b45; }
.side { font-size: 7.8pt; font-weight: 600; background: var(--ink); color: #fff; border-radius: 4px; padding: 1px 5px; margin-left: 6px; vertical-align: 1px; }
.tag { font-size: 8pt; font-weight: 600; color: var(--purple-dark); background: var(--purple-soft); border-radius: 4px; padding: 1px 6px; }
.tag.t-library { color: #4b5260; background: #eceef1; }
.hidden { display: none !important; }
@media print { .bar { position: static; } #q, .filters, .status { display: none; } ul.mods { grid-template-columns: 1fr 1fr; } .mod.hidden { display: flex !important; } }
</style>
</head>
<body>
<header class="brand">
  ${logo ? `<img class="logo" src="${logo}" alt="Forfeit Skies">` : '<h1>Forfeit Skies</h1>'}
  <div class="strap"><b>Mod list</b> · ${main.length} mods, plus ${libs} libraries that make them work · Minecraft 1.21.1 · NeoForge</div>
</header>
<div class="bar">
  <input id="q" type="search" placeholder="Search mods: try 'airship', 'spells', 'backpack'…" autocomplete="off">
  <div class="filters" role="group" aria-label="Filter by category">
    <button type="button" data-f="all" aria-pressed="true">All mods <small>${main.length}</small></button>
${GROUPS.map(([k, n, e]) => `    <button type="button" data-f="${k}" aria-pressed="false">${e} ${esc(n)} <small>${counts[k]}</small></button>`).join('\n')}
  </div>
  <div class="status" id="status"></div>
</div>
<ul class="mods" id="list">
${mods.map(card).join('\n')}
</ul>
<footer>Forfeit Skies · ${mods.length} mod files · list generated ${new Date().toISOString().slice(0, 10)} · mod info from Modrinth</footer>
<script>
const q = document.getElementById('q'), status = document.getElementById('status');
const items = [...document.querySelectorAll('.mod')], buttons = [...document.querySelectorAll('.filters button')];
let filter = 'all';
function apply() {
  const words = q.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
  let shown = 0;
  for (const li of items) {
    const tags = li.dataset.tags.split(' ');
    // libraries stay hidden unless you pick the Libraries filter, or search for something by name
    const inFilter = filter === 'all' ? (li.dataset.group !== 'library' || words.length > 0) : tags.includes(filter);
    const ok = inFilter && words.every(w => li.dataset.hay.includes(w));
    li.classList.toggle('hidden', !ok);
    if (ok) shown++;
  }
  status.textContent = shown + (shown === 1 ? ' mod' : ' mods') + ' shown' + (filter === 'all' && !words.length ? ' (libraries hidden: pick 📚 Libraries to see them)' : '');
}
for (const b of buttons) b.addEventListener('click', () => {
  filter = b.dataset.f;
  for (const x of buttons) x.setAttribute('aria-pressed', String(x === b));
  apply();
});
q.addEventListener('input', apply);
apply();
</script>
</body>
</html>
`;
writeFileSync(join(DIR, 'mods.html'), html);
console.log(`mods.html: ${main.length} mods + ${libs} libraries (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
console.log('Groups: ' + GROUPS.map(([k, n]) => `${n} ${mods.filter(m => m.group === k).length}`).join(', '));

// ---------- 6. refresh the counts in guide.html ----------
const guidePath = join(DIR, 'guide.html');
if (existsSync(guidePath)) {
  const g = readFileSync(guidePath, 'utf8');
  const g2 = g.replace(/(<span data-modcount>)[^<]*(<\/span>)/g, `$1${main.length}$2`).replace(/(<span data-libcount>)[^<]*(<\/span>)/g, `$1${libs}$2`);
  if (g2 !== g) { writeFileSync(guidePath, g2); console.log('guide.html mod counts updated'); }
}
