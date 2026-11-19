// Builds the "Every mod in the pack" section of guide.html (between the MODLIST:START / MODLIST:END markers):
// a searchable, filterable list on screen and a compact grouped list in print. Also refreshes the mod counts.
//
//   node build-modlist.mjs                 (default pack: C:\Users\rober\minecraft-pack)
//   node build-modlist.mjs --pack <dir>    (any packwiz pack folder that has mods\*.pw.toml)
//   node build-modlist.mjs --offline       (use only the cache; no network)
//
// Node 24, no npm packages. Mod info comes from the Modrinth API and is cached in
// ..\.cache\ (outside the guide folder) so a failed fetch never wipes the list.
// Icons are downscaled to 64 px with headless Edge and embedded, so guide.html stays one self-contained file.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

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
  'bossesrise': 'adventure', 'borninchaos': 'adventure', 'aquamirae': 'adventure', 'sable': 'library',
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

// ---------- 5. build the mod list section and write it into guide.html ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const groupName = Object.fromEntries(GROUPS.map(([k, n]) => [k, n]));
const counts = Object.fromEntries(GROUPS.map(([k]) => [k, mods.filter(m => m.tags.includes(k)).length]));
const main = mods.filter(m => m.group !== 'library');
const libs = mods.length - main.length;
mods.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
const today = new Date().toISOString().slice(0, 10);
const sideBadge = (m) => m.side === 'client' ? '<span class="ml-side">client only</span>' : m.side === 'server' ? '<span class="ml-side">server only</span>' : '';
/** first sentence (or so) of a description, cut at a word boundary */
function short(text, max = 90) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  const dot = t.search(/[.!?](\s|$)/);
  if (dot > 20 && dot < max) t = t.slice(0, dot + 1);
  if (t.length > max) t = t.slice(0, t.lastIndexOf(' ', max - 1)).replace(/[,;:\-–(]+$/, '') + '…';
  return t;
}

// screen: cards with icons, search and filters
const card = (m) => {
  const icon = m.info?.icon_url && iconCache[m.info.icon_url];
  const letter = esc((m.title.match(/[A-Za-z0-9]/) || ['?'])[0].toUpperCase());
  const hay = esc(`${m.title} ${m.name} ${m.description} ${m.tags.map(t => groupName[t]).join(' ')}`.toLowerCase());
  const title = m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a>` : esc(m.title);
  return `<li class="ml-mod" data-group="${m.group}" data-tags="${m.tags.join(' ')}" data-hay="${hay}">` +
    (icon ? `<img src="${icon}" alt="" width="40" height="40" loading="lazy">` : `<span class="ml-ph">${letter}</span>`) +
    `<div><h3>${title}${sideBadge(m)}</h3><p>${esc(m.description) || '<i>No description (CurseForge-only mod).</i>'}</p>` +
    `<span class="ml-tag t-${m.group}">${esc(groupName[m.group])}</span></div></li>`;
};
// print: compact list grouped by main category, libraries left out
const printGroups = GROUPS.filter(([k]) => k !== 'library').map(([k, n, e]) => {
  const list = mods.filter(m => m.group === k);
  if (!list.length) return '';
  return `<h3 class="ml-ph3">${e} ${esc(n)} <small>${list.length}</small></h3>\n<ul class="ml-cols">\n` +
    list.map(m => `<li><b>${esc(m.title)}</b>${m.side !== 'both' ? ` <i>(${m.side} only)</i>` : ''}${m.description ? ` · ${esc(short(m.description))}` : ''}</li>`).join('\n') + '\n</ul>';
}).join('\n');

const section = `
<section id="mods" class="modlist">
<h2><span class="n">★</span>Every mod in the pack</h2>
<p class="ml-intro"><b><span data-modcount>${main.length}</span> mods</b>, plus <span data-libcount>${libs}</span> libraries that work in the background.
<span class="ml-screen-only">Search by name or pick a category. Libraries are hidden until you pick 📚 Libraries or search for one by name.</span>
<span class="ml-print-only">Libraries are left out of this printed list. Open the guide in a browser to search everything, libraries included.</span></p>
<style>
  .ml-bar { position: sticky; top: 0; background: #fff; padding: 8px 0; z-index: 2; border-bottom: 1px solid var(--line); }
  #ml-q { width: 100%; font: inherit; font-size: 12pt; padding: 9px 12px; border: 2px solid var(--ink); border-radius: 8px; }
  #ml-q:focus { outline: none; border-color: var(--purple); box-shadow: 0 0 0 3px var(--purple-soft); }
  .ml-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .ml-filters button { font: inherit; font-size: 9.6pt; font-weight: 600; border: 2px solid var(--ink); background: #fff; color: var(--ink); border-radius: 999px; padding: 3px 10px; cursor: pointer; }
  .ml-filters button[aria-pressed="true"] { background: var(--purple); border-color: var(--purple); color: #fff; }
  .ml-filters button small { opacity: .7; font-weight: 400; }
  .ml-status { color: var(--muted); font-size: 9.3pt; margin-top: 6px; }
  ul.ml-cards { list-style: none; padding: 0; margin: 10px 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 8px; }
  .ml-mod { display: flex; gap: 10px; border: 1px solid var(--line); border-left: 4px solid var(--purple); border-radius: 8px; padding: 8px 10px; }
  .ml-mod[data-group="library"] { border-left-color: #9aa1ab; }
  .ml-mod img, .ml-mod .ml-ph { width: 40px; height: 40px; border-radius: 6px; flex: none; }
  .ml-mod .ml-ph { background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16pt; }
  .ml-mod h3 { margin: 0; font-size: 10.4pt; }
  .ml-mod h3 a { color: var(--ink); text-decoration: none; }
  .ml-mod h3 a:hover { color: var(--purple); text-decoration: underline; }
  .ml-mod p { margin: 2px 0 4px; font-size: 9.2pt; color: #353b45; }
  .ml-side { font-size: 7.6pt; font-weight: 600; background: var(--ink); color: #fff; border-radius: 4px; padding: 1px 5px; margin-left: 6px; vertical-align: 1px; }
  .ml-tag { font-size: 7.8pt; font-weight: 600; color: var(--purple-dark); background: var(--purple-soft); border-radius: 4px; padding: 1px 6px; }
  .ml-tag.t-library { color: #4b5260; background: #eceef1; }
  .ml-hidden { display: none !important; }
  .ml-print, .ml-print-only { display: none; }
  @media print {
    .modlist { break-before: page; }
    .ml-screen, .ml-screen-only { display: none !important; }
    .ml-print { display: block; }
    .ml-print-only { display: inline; }
    .ml-intro { font-size: 9.4pt; margin: 2px 0 4px; }
    h3.ml-ph3 { font-size: 10pt; font-weight: 800; margin: 7px 0 3px; padding: 2px 8px; background: var(--ink); color: #fff; border-left: 5px solid var(--purple); border-radius: 3px; break-after: avoid; }
    h3.ml-ph3 small { font-weight: 400; opacity: .75; }
    ul.ml-cols { columns: 3; column-gap: 12px; list-style: none; padding: 0; margin: 0; font-size: 7.3pt; line-height: 1.25; }
    ul.ml-cols li { break-inside: avoid; margin: 0 0 2px; color: #3a3540; }
    ul.ml-cols li b { color: var(--ink); }
  }
</style>
<div class="ml-screen">
<div class="ml-bar">
  <input id="ml-q" type="search" placeholder="Search mods: try 'airship', 'spells', 'backpack'…" autocomplete="off" aria-label="Search mods">
  <div class="ml-filters" role="group" aria-label="Filter by category">
    <button type="button" data-f="all" aria-pressed="true">All mods <small>${main.length}</small></button>
${GROUPS.map(([k, n, e]) => `    <button type="button" data-f="${k}" aria-pressed="false">${e} ${esc(n)} <small>${counts[k]}</small></button>`).join('\n')}
  </div>
  <div class="ml-status" id="ml-status"></div>
</div>
<ul class="ml-cards">
${mods.map(card).join('\n')}
</ul>
</div>
<div class="ml-print">
${printGroups}
</div>
<p class="ml-intro" style="color:var(--muted);font-size:8.5pt">List generated ${today} from ${mods.length} mod files · mod info from Modrinth</p>
<script>
(() => {
  const q = document.getElementById('ml-q'), status = document.getElementById('ml-status');
  const items = [...document.querySelectorAll('.ml-mod')], buttons = [...document.querySelectorAll('.ml-filters button')];
  let filter = 'all';
  function apply() {
    const words = q.value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
    let shown = 0;
    for (const li of items) {
      // libraries stay hidden unless you pick the Libraries filter, or search for something by name
      const inFilter = filter === 'all' ? (li.dataset.group !== 'library' || words.length > 0) : li.dataset.tags.split(' ').includes(filter);
      const ok = inFilter && words.every(w => li.dataset.hay.includes(w));
      li.classList.toggle('ml-hidden', !ok);
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
})();
</script>
</section>
`;

const guidePath = join(DIR, 'guide.html');
const guide = readFileSync(guidePath, 'utf8');
const START = /<!-- MODLIST:START[^>]*-->/, END = '<!-- MODLIST:END -->';
if (!START.test(guide) || !guide.includes(END)) {
  console.error('guide.html is missing the <!-- MODLIST:START --> ... <!-- MODLIST:END --> markers; nothing written.');
  process.exit(1);
}
let out = guide.replace(/(<!-- MODLIST:START[^>]*-->)[\s\S]*?(<!-- MODLIST:END -->)/, (_, a, b) => a + section + b);
// mod counts elsewhere in the guide (header chip etc.)
out = out.replace(/(<span data-modcount>)[^<]*(<\/span>)/g, `$1${main.length}$2`).replace(/(<span data-libcount>)[^<]*(<\/span>)/g, `$1${libs}$2`);
writeFileSync(guidePath, out);
// mods.html is no longer produced: the list lives in guide.html
if (existsSync(join(DIR, 'mods.html'))) { rmSync(join(DIR, 'mods.html')); console.log('removed old mods.html'); }
console.log(`guide.html: mod list section updated, ${main.length} mods + ${libs} libraries (${(Buffer.byteLength(out) / 1024).toFixed(0)} KB)`);
console.log('Groups: ' + GROUPS.map(([k, n]) => `${n} ${mods.filter(m => m.group === k).length}`).join(', '));
