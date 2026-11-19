// Builds docs/mod-picker.html from candidates.json (verified 1.21.1 NeoForge on Modrinth) + notes below.
import fs from 'node:fs';
const [candFile, outFile, notesFile, pageTitle = 'Mod Picker', storeKey = 'fs-picks'] = process.argv.slice(2);
const data = Object.fromEntries(JSON.parse(fs.readFileSync(candFile, 'utf8')).map(m => [m.slug, m]));

// [slug, note, flags]  flags: r = recommended, w:<text> = heads-up
let CATS = [
  ['Create & Airships', [
    ['create-aeroworks', 'More Aeronautics parts: propellers, engines and controls for bigger, better ships.', 'r'],
    ['create-power-loader', 'Chunk loaders powered by Create, so farms and ships keep running when nobody is nearby.', 'r'],
    ['create-diesel-generators', 'Oil, fuel and diesel engines. Gives airships and factories a fuel economy.', 'r'],
    ['create_factory_logistics', 'Extends Create 6 logistics (packages, stock keeping) for big automated bases.', ''],
    ['create-bits-n-bobs', 'Lots of small Create extras: lights, chairs, gadgets. Works on ships thanks to the compat mod.', 'r'],
    ['create-new-age', 'Electricity and nuclear power for Create. Overlaps a little with Crafts & Additions.', ''],
    ['create-stuff-additions', 'Jetpacks, tools and gadgets made with Create.', ''],
    ['create-jetpack', 'A brass jetpack running on air. Fun alongside airships.', ''],
    ['create-ore-excavation', 'Drills that mine endless ore veins. Strong late-game resource source.', ''],
    ['create-encased', 'Encased versions of Create shafts and pipes in every wood and stone type. Tidier builds.', ''],
    ['create-deco', 'Metal bricks, catwalks, hull blocks and doors with an industrial look. Great for ships.', 'r'],
    ['create-design-n-decor', 'More industrial and steampunk decoration blocks.', ''],
    ['create-train-perspective', 'Your camera tilts with trains and contraptions. Client-only, cosmetic.', ''],
  ]],
  ['Magic', [
    ['apotheosis', 'Big overhaul of enchanting, loot, gems and bosses. Changes how gear works for everyone.', 'w:Changes enchanting and loot pack-wide'],
    ['irons-jewelry', "Rings and amulets with spell bonuses. Pairs with Iron's Spells.", 'r'],
    ['ars-additions', 'Quality-of-life extras and new items for Ars Nouveau.', 'r'],
    ['ars-ocultas', 'Ars Nouveau addon with darker, ritual-themed magic.', ''],
    ['malum', 'Spirit magic: harvest souls from mobs and craft powerful gear.', 'r'],
    ['forbidden-arcanus', 'Dark magic with rituals, special weapons and enchanting upgrades.', ''],
    ['eidolonrepraised', 'Necromancy and prayer magic with a research book.', ''],
    ['hexerei', 'Witchcraft: brewing, herbs and cauldrons. Relaxed and cosy.', ''],
    ['mahou-tsukai', 'Japanese-style mana magic based on spell circles. A different feel.', ''],
  ]],
  ['Tech & Storage', [
    ['mega', 'MEGA Cells: much bigger AE2 storage cells. Must-have once AE2 grows.', 'r'],
    ['advancedae', 'Advanced AE2 autocrafting: quantum computers and bigger patterns.', 'r'],
    ['mekanism-additions', 'Glow panels, balloons and fun extras for Mekanism.', ''],
    ['immersiveengineering', 'Big multiblock machines (excavators, arc furnace), wires and a retro industrial style.', ''],
    ['pneumaticcraft-repressurized', 'Pressure-based tech with drones and logistics. Works on ships thanks to the compat mod.', ''],
    ['industrial-foregoing', 'Mob, tree and plant automation plus resource generation.', ''],
    ['powah', 'Simple, strong power generation (reactors, solar). Easy to learn.', ''],
    ['integrated-dynamics', 'Program your base logic with cables and variables. For puzzle lovers.', ''],
    ['modular-routers', 'Small, cheap item routers. Good early-game automation.', ''],
    ['pipez', 'Simple, efficient pipes for items, fluids and power.', 'r'],
    ['storagedrawers', 'Drawers that hold a lot of one item. Pick this OR Functional Storage.', 'w:Pick one: Storage Drawers or Functional Storage'],
    ['functional-storage', 'Drawers with upgrades and AE2 links. Pick this OR Storage Drawers.', 'w:Pick one: Storage Drawers or Functional Storage'],
  ]],
  ['Adventure & Bosses', [
    ['aether', 'The classic sky dimension. Fits an airships pack well.', 'r'],
    ['the-bumblezone', 'A bee dimension with its own bosses and items.', ''],
    ['deeperdarker', 'A dimension beyond the Ancient City, with new gear.', 'r'],
    ['l_enders-cataclysm', 'Huge boss fights with great loot. Iron\'s Spells players will love it.', 'r'],
    ['borninchaos', 'Spooky new mobs and bosses that spawn at night.', ''],
    ['aquamirae', 'Frozen-ocean adventure with a ship-based boss and pirate loot.', ''],
    ['alexs-mobs-1.21.1', 'Over 80 new animals and creatures. Works on ships thanks to the compat mod.', ''],
    ['naturalist', 'More realistic wildlife: bears, deer, snakes and more.', ''],
    ['friends-and-foes-forge', 'Mobs from Mojang\'s mob votes that never got added (copper golem, glare and more).', 'r'],
    ['artifacts', 'Rare items with special powers, found in chests and mimics.', 'r'],
    ['lootr', 'Every player gets their own loot from each chest. Essential on a shared server.', 'r'],
  ]],
  ['Structures & Exploration', [
    ['idas', 'Integrated Dungeons and Structures: big hand-built dungeons and towers. Fits the terrain.', 'r'],
    ['moogs-voyager-structures', 'Lots of smaller structures to find while flying around.', 'r'],
    ['repurposed-structures-forge', 'New versions of vanilla structures for every biome.', ''],
    ['dungeons-and-taverns', 'Taverns, ruins and new dungeons in vanilla style.', ''],
    ['explorify', 'Small vanilla-style landmarks and ruins.', ''],
    ['ct-overhaul-village', 'Villages redesigned for each biome. Server-side only.', 'r'],
    ['natures-compass', 'Find any biome. Very handy with this many biomes.', 'r'],
    ['explorers-compass', 'Find any structure by name.', 'r'],
    ['travelers-titles', 'Shows biome and dimension names on screen as you enter them. Client-only.', ''],
  ]],
  ['Building & Decoration', [
    ['supplementaries', 'Huge set of useful decorative blocks: jars, signs, cannons, globes and more.', 'r'],
    ['amendments', "Small vanilla improvements. Same author as Supplementaries.", ''],
    ['handcrafted', 'Furniture: chairs, tables, beds and shelves.', 'r'],
    ['chipped', 'Hundreds of block variants made at workbenches. Pick this OR Rechiseled.', 'w:Pick one: Chipped or Rechiseled'],
    ['rechiseled', 'Chisel blocks into connected-texture variants. Pick this OR Chipped.', 'w:Pick one: Chipped or Rechiseled'],
    ['framedblocks', 'Blocks that take the look of any other block. Great for detailed ships.', ''],
    ['macaws-roofs', 'Roof blocks in every wood and stone type.', 'r'],
    ['macaws-windows', 'Window styles and shutters.', ''],
    ['macaws-doors', 'Many more door styles.', ''],
    ['macaws-bridges', 'Rope and stone bridges.', ''],
    ['macaws-furniture', 'Tables, chairs and cabinets.', ''],
    ['macaws-fences-and-walls', 'More fence and wall variants.', ''],
    ['macaws-lights-and-lamps', 'Lamps and lanterns.', ''],
    ['macaws-paths-and-pavings', 'Paths and paving blocks.', ''],
    ['macaws-trapdoors', 'More trapdoor styles.', ''],
  ]],
  ['Food & Farming', [
    ['serene-seasons', 'Seasons that change crop growth and colours. Makes farming matter more.', 'w:Crops only grow in their seasons'],
    ['cooking-for-blockheads', 'A kitchen that cooks from every chest around it.', 'r'],
    ['brewin-and-chewin', "Farmer's Delight addon: brewing, cheese and more food.", ''],
    ['ends-delight', "Farmer's Delight addon with End-themed food.", ''],
    ['miners-delight', "Farmer's Delight addon with cave food and mining snacks.", ''],
  ]],
  ['Multiplayer & Quality of Life', [
    ['corpse', 'When you die your items stay in a corpse you can loot. Pick this OR GraveStone.', 'w:Pick one: Corpse or GraveStone'],
    ['gravestone-mod', 'A gravestone keeps your items when you die. Pick this OR Corpse.', 'w:Pick one: Corpse or GraveStone'],
    ['almostunified', 'Merges duplicate ores and ingots from different mods into one, which tidies JEI and storage.', 'r'],
    ['carry-on', 'Pick up chests and animals and carry them.', 'r'],
    ['comforts', 'Sleeping bags and hammocks for trips without resetting your spawn.', 'r'],
    ['simple-voice-chat', 'Talk to nearby players in game. Needs one more port opened on the server and router.', 'w:Needs UDP port 24454 forwarded'],
    ['fallingtree', 'Chop a whole tree at once.', 'r'],
    ['leaves-be-gone', 'Leaves decay quickly after chopping. Server-side only.', 'r'],
    ['torchmaster', 'Mega torches that stop mobs spawning around your base.', ''],
    ['trashslot', 'A trash slot in your inventory.', 'r'],
    ['inventory-essentials', 'Shift and ctrl shortcuts for moving stacks quickly.', ''],
    ['crafting-tweaks', 'Rotate, balance and clear buttons on crafting grids.', ''],
    ['enchantment-descriptions', 'Explains what each enchantment does in its tooltip.', 'r'],
    ['better-advancements', 'A much nicer advancements screen. Client-only.', ''],
    ['chat-heads', 'Player heads next to chat messages. Client-only.', ''],
  ]],
  ['Performance & Server', [
    ['chunky', 'Pre-generates the world in quiet hours, so flying into new areas doesn\'t lag the server.', 'r'],
    ['packet-fixer', 'Fixes "packet too big" disconnects that happen in large packs.', 'r'],
    ['clumps', 'Groups XP orbs together to cut lag.', 'r'],
    ['dynamic-fps', 'Lowers FPS when the game is in the background to save power and heat. Client-only.', 'r'],
    ['ambientsounds', 'Atmospheric biome sounds. Client-only.', ''],
    ['sound-physics-remastered', 'Realistic echo and muffling in caves and buildings. Client-only.', ''],
  ]],
];
let EXCLUDED = [
  ['Sodium / Embeddium', 'Replaces the renderer; open crash reports with the current Sable/Aeronautics.'],
  ['Iris / Oculus (shaders)', 'Aeronautics officially has visual issues with Iris.'],
  ['Lithium / C2ME / Noisium', 'Rewrite core game and worldgen logic that Sable and Tectonic hook into.'],
  ['Distant Horizons', 'Its own render pipeline; untested with physics ships and heavy on the server.'],
  ['Valkyrien Skies / Eureka', 'A competing physics engine; conflicts with Sable.'],
  ['LittleTiles, Farm & Charm', 'Reported to crash or stop Sable loading.'],
  ['Twilight Forest, Botania, Blood Magic, Blue Skies, LaserIO, ExtendedAE', 'No 1.21.1 NeoForge build on Modrinth (CurseForge-only or not updated), so they can\'t auto-download.'],
];

// Optional: read categories/notes from a text file instead ("## Category" headings, "slug | flags | note" lines, "## EXCLUDED" with "Name | reason").
if (notesFile) {
  CATS = []; EXCLUDED = []; let cur = null, excl = false;
  for (const raw of fs.readFileSync(notesFile, 'utf8').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) { excl = line === '## EXCLUDED'; if (!excl) { cur = [line.slice(3), []]; CATS.push(cur); } continue; }
    if (!line.includes('|')) continue;
    const parts = line.split('|').map(s => s.trim());
    if (excl) { if (!/^Trimmed extras/i.test(parts[0])) EXCLUDED.push([parts[0], parts.slice(1).join(' | ')]); continue; }
    if (cur) cur[1].push([parts[0], parts.slice(2).join(' | '), parts[1].replace(/,/g, ' ')]);
  }
}

const missing = []; let count = 0;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const side = m => m.server === 'unsupported' ? 'Client-only' : m.client === 'unsupported' ? 'Server-only' : '';
const kfmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1e3) + 'k';
const sections = CATS.map(([cat, mods]) => {
  const cards = mods.map(([slug, note, flags]) => {
    const m = data[slug]; if (!m) { missing.push(slug); return ''; }
    count++;
    const rec = flags.includes('r'), warn = (flags.match(/w:(.*)/) || [])[1];
    return `<label class="card${rec ? ' rec' : ''}" data-slug="${esc(slug)}" data-title="${esc(m.title)}" data-text="${esc((m.title + ' ' + note + ' ' + cat).toLowerCase())}">
  <input type="checkbox" value="${esc(slug)}">
  <img src="${esc(m.icon || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
  <div class="body"><div class="t"><a href="https://modrinth.com/mod/${esc(slug)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(m.title.trim())}</a>${rec ? '<span class="tag r">Recommended</span>' : ''}${side(m) ? `<span class="tag s">${side(m)}</span>` : ''}</div>
  <div class="n">${esc(note)}</div>${warn ? `<div class="w">⚠ ${esc(warn)}</div>` : ''}
  <div class="meta">${kfmt(m.downloads)} downloads · v${esc(m.version)} · updated ${esc(m.date)}</div></div></label>`;
  }).join('\n');
  return `<section><h2>${esc(cat)} <button type="button" class="mini" onclick="selCat(this,true)">select all</button><button type="button" class="mini" onclick="selCat(this,false)">clear</button></h2><div class="grid">${cards}</div></section>`;
}).join('\n');
if (missing.length) { console.error('Missing from candidates.json:', missing.join(', ')); process.exit(1); }

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forfeit Skies: ${pageTitle}</title>
<style>
:root{--ink:#1d2430;--muted:#5b6575;--sky:#2b6cb0;--line:#dbe2ea;--rec:#2f855a;--warn:#b7791f;--bg:#f5f7fa}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;color:var(--ink);background:var(--bg);font-size:14px}
header{background:linear-gradient(135deg,#1e3a5f,#2b6cb0 60%,#4a90c8);color:#fff;padding:22px 28px}
header h1{margin:0;font-size:26px}header p{margin:6px 0 0;opacity:.92;max-width:900px;line-height:1.5}
.bar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--line);padding:10px 28px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;box-shadow:0 2px 6px rgba(0,0,0,.05)}
.bar input[type=search]{flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px}
button{font:inherit;cursor:pointer;border:1px solid var(--line);background:#fff;border-radius:8px;padding:7px 12px}
button.primary{background:var(--sky);color:#fff;border-color:var(--sky);font-weight:600}
.count{font-weight:600;color:var(--sky);min-width:110px}
main{padding:8px 28px 220px;max-width:1400px;margin:0 auto}
h2{font-size:18px;margin:26px 0 10px;color:#1e3a5f;display:flex;align-items:center;gap:8px}
.mini{font-size:12px;padding:3px 8px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px}
.card{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;cursor:pointer;transition:border-color .1s,box-shadow .1s}
.card:hover{border-color:#a9bfd8}.card:has(input:checked){border-color:var(--sky);box-shadow:0 0 0 2px #2b6cb033;background:#f4f9ff}
.card input{margin-top:4px;width:17px;height:17px;flex:none;accent-color:var(--sky)}
.card img{width:40px;height:40px;border-radius:8px;flex:none;object-fit:cover;background:#eef1f5}
.body{min-width:0}.t{font-weight:600;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.t a{color:inherit;text-decoration:none}.t a:hover{text-decoration:underline}
.tag{font-size:11px;font-weight:600;border-radius:999px;padding:1px 8px}.tag.r{background:#e6f4ea;color:var(--rec)}.tag.s{background:#eef1f5;color:var(--muted)}
.n{color:#333c4a;margin-top:2px;line-height:1.4}.w{color:var(--warn);font-size:12.5px;margin-top:3px;font-weight:600}
.meta{color:var(--muted);font-size:11.5px;margin-top:4px}
.hidden{display:none!important}
.out{position:fixed;left:0;right:0;bottom:0;background:#1e2a3a;color:#fff;padding:12px 28px;z-index:6;box-shadow:0 -4px 14px rgba(0,0,0,.18)}
.out textarea{width:100%;height:92px;border-radius:8px;border:0;padding:8px 10px;font-family:Consolas,monospace;font-size:12.5px;resize:vertical}
.out .row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:10px;flex-wrap:wrap}
.excl{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-top:10px}.excl li{margin:4px 0}
</style></head><body>
<header><h1>Forfeit Skies: ${pageTitle}</h1>
<p>${count} extra mods, every one checked to have a <b>Minecraft 1.21.1 NeoForge</b> build on Modrinth (so they auto-download for everyone), and none known to conflict with Create Aeronautics / Sable.
Tick what you want, then press <b>Copy</b> and paste it to Claude. Anything chosen gets test-loaded on the server before it reaches your friends. Checked ${new Date().toISOString().slice(0, 10)}.</p></header>
<div class="bar"><input type="search" id="q" placeholder="Search mods…" oninput="filter()">
<button type="button" onclick="pickRec()">Tick all recommended</button><button type="button" onclick="clearAll()">Clear all</button><span class="count" id="count">0 selected</span></div>
<main>${sections}
<section><h2>Left out on purpose</h2><div class="excl"><ul>${EXCLUDED.map(([a, b]) => `<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join('')}</ul></div></section></main>
<div class="out"><div class="row"><b>Copy this to Claude</b><span><button type="button" class="primary" id="copy" onclick="copyOut()">Copy</button></span></div>
<textarea id="out" readonly placeholder="Tick some mods above…"></textarea></div>
<script>
const boxes=[...document.querySelectorAll('.card input')];
function update(){const sel=boxes.filter(b=>b.checked).map(b=>b.closest('.card'));
document.getElementById('count').textContent=sel.length+' selected';
document.getElementById('out').value=sel.length?'Please add these mods to Forfeit Skies (Modrinth slugs, 1.21.1 NeoForge), test them on the server, then push the update:\\n'+sel.map(c=>c.dataset.slug).join(' ')+'\\n\\n('+sel.map(c=>c.dataset.title.trim()).join(', ')+')':'';
localStorage.setItem('${storeKey}',JSON.stringify(sel.map(c=>c.dataset.slug)));}
boxes.forEach(b=>b.addEventListener('change',update));
function filter(){const q=document.getElementById('q').value.toLowerCase().trim();document.querySelectorAll('.card').forEach(c=>c.classList.toggle('hidden',!!q&&!c.dataset.text.includes(q)));}
function pickRec(){document.querySelectorAll('.card.rec input').forEach(b=>b.checked=true);update();}
function clearAll(){boxes.forEach(b=>b.checked=false);update();}
function selCat(btn,on){btn.closest('section').querySelectorAll('.card:not(.hidden) input').forEach(b=>b.checked=on);update();}
function copyOut(){const t=document.getElementById('out');if(!t.value)return;navigator.clipboard?.writeText(t.value).catch(()=>{});t.select();try{document.execCommand('copy')}catch(e){}
const b=document.getElementById('copy');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',1500);}
try{const saved=JSON.parse(localStorage.getItem('${storeKey}')||'[]');boxes.forEach(b=>b.checked=saved.includes(b.value));}catch(e){}
update();
</script></body></html>`;
fs.writeFileSync(outFile, html);
console.log('wrote', outFile, 'with', count, 'mods');
