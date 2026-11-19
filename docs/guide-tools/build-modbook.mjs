// Builds the in-game "Forfeit Skies Mod Book" (an external Patchouli book, id patchouli:mods) from
// .cache/modlist.json (written by build-modlist.mjs).
//
//   node build-modlist.mjs          (refreshes .cache/modlist.json)
//   node build-modbook.mjs [--pack C:\Users\rober\minecraft-pack]
//
// Output: <pack>/patchouli_books/mods/ (book.json + en_us/categories + en_us/entries). Patchouli only reads
// external books from the game folder's patchouli_books/, and their pages must sit next to book.json
// (use_resource_pack: false). packwiz ships the folder to the server and every player.
//
// Layout: one category per mod type; inside it, one entry per "family" (a mod plus its addons).
// Two mods per page so nothing runs off the bottom; short entry names so titles fit the title bar.
// Compatibility patches (invisible fixes) are listed by name only in their own entry.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const PACK = arg('--pack') || 'C:\\Users\\rober\\minecraft-pack';
const BOOK = 'mods', NS = 'patchouli';   // book id patchouli:mods
const mods = JSON.parse(readFileSync(join(DIR, '..', '.cache', 'modlist.json'), 'utf8'));

// [group id from build-modlist, title, short name (for "More ..."), icon, blurb]
const CATEGORIES = [
  ['create', 'Create & Airships', 'Create', 'aeronautics:propeller_bearing', 'Machines, trains, cannons and the airships of Forfeit Skies.'],
  ['magic', 'Magic', 'Magic', 'ars_nouveau:novice_spell_book', 'Spellcasting, rituals, spirits and witchcraft.'],
  ['tech', 'Tech', 'Tech', 'mekanism:metallurgic_infuser', 'Power, processing, digital storage and computers.'],
  ['adventure', 'Adventure & Bosses', 'Adventure', 'minecraft:diamond_sword', 'Bosses, new mobs, weapons and loot.'],
  ['world', 'World & Structures', 'World', 'minecraft:grass_block', 'Terrain, biomes, dimensions and things to find.'],
  ['building', 'Building', 'Building', 'minecraft:bricks', 'Blocks, furniture and decoration.'],
  ['food', 'Food & Farming', 'Food', 'farmersdelight:cooking_pot', 'Cooking, brewing and farming.'],
  ['qol', 'Quality of Life', 'QoL', 'minecraft:compass', 'Maps, storage, recipes and handy tweaks.'],
];

// Families: [short entry name (fits the title bar), icon, regex on "key title"]. First match wins.
const FAMILIES = {
  create: [
    ['Airships', 'aeronautics:propeller_bearing', /aeronautics|sable|aeroworks|avionics|radars|tweaked-controllers|grapple/i],
    ['Big Cannons', 'createbigcannons:cannon_mount', /big-cannons|big cannons/i],
    ['Trains', 'create:track_station', /rails|railway/i],
    ['Create & Addons', 'create:cogwheel', /./],
  ],
  magic: [
    ['Ars Nouveau', 'ars_nouveau:novice_spell_book', /^ars-|ars nouveau|ars creo|ars additions|ars ocultas|energistique/i],
    ["Iron's Spells", 'irons_spellbooks:iron_spell_book', /irons|spellbook|familiars|magic-from-the-east|eldritch|cataclysm-spellbooks|wizardry/i],
    ['Occultism', 'occultism:spirit_attuned_gem', /occult/i],
    ['Apotheosis', 'apotheosis:gem', /apoth/i],
  ],
  tech: [
    ['Applied Energistics', 'ae2:controller', /ae2|applied|mega|advancedae|extended-ae|merequester/i],
    ['Mekanism', 'mekanism:metallurgic_infuser', /mekanism/i],
    ['Immersive Eng.', 'immersiveengineering:hammer', /immersive|jei-multiblocks/i],
    ['Computers', 'computercraft:computer_advanced', /cc-tweaked|peripheral/i],
  ],
  adventure: [
    ['Cataclysm & Mowzie', 'cataclysm:the_incinerator', /cataclysm|mowzie/i],
    ['Boss Mods', 'minecraft:wither_skeleton_skull', /boss|legendary|qliphoth|mutant|doppelganger|dragon-fight|edf/i],
    ['Weapons & Combat', 'minecraft:diamond_sword', /sword|shield|knight|apothic-attributes/i],
    ['Apotheosis', 'apotheosis:gem', /apoth/i],
  ],
  world: [
    ["YUNG's Structures", 'minecraft:mossy_cobblestone', /yung/i],
    ["Moog's Structures", 'minecraft:spyglass', /moog/i],
    ['Dungeons Arise', 'minecraft:cracked_stone_bricks', /dungeons-arise|dungeons arise/i],
    ['Terrain & Biomes', 'minecraft:grass_block', /tectonic|terralith|biomes-o-plenty|regions-unexplored|nullscape|incendium|alexs-caves|serene|sparse/i],
    ['Dimensions', 'aether:aether_portal_frame', /aether|bumblezone|undergarden|deeper|divinerpg/i],
  ],
  building: [
    ["Macaw's", 'minecraft:oak_door', /macaw/i],
    ['Block Variants', 'chipped:botanist_workbench', /chipped|rechiseled/i],
  ],
  food: [
    ["Farmer's Delight", 'farmersdelight:cooking_pot', /delight|central-kitchen|slice-and-dice|brewin/i],
    ["Let's Do", 'vinery:wine_bottle', /lets-do|let's do/i],
  ],
  qol: [
    ['FTB', 'ftbquests:book', /ftb/i],
    ['Maps & Claims', 'minecraft:filled_map', /xaero|open-parties/i],
    ['Recipes & Tooltips', 'minecraft:knowledge_book', /jei|jer\b|jep|resources-jer|professions|jade|tooltip|enchantment-descriptions|polymorph|crafting-tweaks/i],
    ['Storage', 'sophisticatedbackpacks:backpack', /sophisticated|functional-storage|storagedrawers|trashslot/i],
    ['Performance', 'minecraft:redstone_torch', /modernfix|ferrite|clumps|packet|dynamic-fps|spark|chunky|im-fast|leaves-be-gone|distant/i],
  ],
};
const OTHER_ICON = { create: 'create:cogwheel', magic: 'minecraft:enchanted_book', tech: 'minecraft:redstone', adventure: 'minecraft:iron_sword',
  world: 'minecraft:compass', building: 'minecraft:bricks', food: 'minecraft:bread', qol: 'minecraft:chest' };

// The main mod of each family is listed first.
const MAIN = new Set(['create', 'create-aeronautics', 'create-big-cannons', 'create-steam-n-rails-1.21.1', 'ars-nouveau', 'irons-spells-n-spellbooks',
  'occultism', 'apotheosis', 'ae2', 'mekanism', 'immersiveengineering', 'cc-tweaked', 'l_enders-cataclysm', 'farmers-delight',
  'yungs-api', 'when-dungeons-arise', 'tectonic', 'aether', 'ftb-quests-forge', 'xaeros-world-map', 'jei', 'sophisticated-backpacks', 'modernfix']);

// Invisible fixes: listed by name only, in one entry at the end of Quality of Life.
const IS_PATCH = /compat|patch|aeronautics weight|xmod/i;

// Hand-written one-liners where the Modrinth blurb is unclear. Keyed by .pw.toml name.
const DESC = {
  'create-aeronautics': 'Build working airships, planes and cars out of any blocks. The heart of Forfeit Skies.',
  'create-railways-navigator': 'Train timetables and a route planner for your Create railway network.',
  'create-steam-n-rails-1.21.1': 'More track types, bogeys, couplers and handcars for Create trains.',
  'create-aeronautics-climbable-rope': 'Climb vertical ropes on your airships with an empty hand.',
  'create-aeronautics-automated-logistics': 'Station networks and automated docking, so airships can run cargo routes.',
  'create-aeronautics-transmission-linkage': 'Linkages and transmissions for building more complex vehicles.',
  'create-aeroworks': 'Gyroscopes, control desks, joysticks and other airship controls.',
  'create-avionics': 'ComputerCraft control for airships: program your own autopilot.',
  'create-radars': 'Radars, tracking and targeting for ships and cannons.',
  'create-tweaked-controllers': 'Use a gamepad-style controller to steer contraptions.',
  'grapplemod-skybound': 'Grappling hooks that can hook onto airships and contraptions.',
  'sable': 'The physics engine that makes Create Aeronautics ships fly and collide.',
};

// Patchouli text: escape its formatting char; trim to a sentence or a clean word boundary.
const clean = (s) => String(s || '').replace(/\$/g, 'S').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
function tidy(desc) {
  let s = clean(desc)
    .replace(/^(this|the) mods? (is|adds) /i, '')
    .replace(/^(an? )?(minecraft |create |neoforge )*(mod|addon|add-on)( for [\w' ]+?)? (that|which|to) /i, '')
    .replace(/^(adds?|allows you to) /i, (m) => m);
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function short(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '));
  if (end > n * 0.5) return cut.slice(0, end + 1);
  return cut.replace(/[\s,;:(-]+\S*$/, '') + '…';
}
const MAX_DESC = 85, PER_PAGE = 2;
const TIPS = [
  'Press $(l)R$() on any item for its recipe, $(l)U$() for what it is used in.',
  'Hold $(l)`$() while mining to break a whole vein or tree at once.',
  'Stuck? The $(l)quest book$() walks you through each mod step by step.',
  'The three paths need each other: trade with the Create, magic and tech players.',
  'Mark your base with a $(l)waystone$() so the whole party can teleport home.',
];

const out = join(PACK, 'patchouli_books', BOOK);
if (existsSync(out)) rmSync(out, { recursive: true });
for (const legacy of [join(PACK, 'kubejs', 'data', 'forfeit'), join(PACK, 'kubejs', 'assets', 'patchouli')]) if (existsSync(legacy)) rmSync(legacy, { recursive: true });
const write = (p, obj) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); };

const real = mods.filter(m => m.group !== 'library');
const patches = real.filter(m => IS_PATCH.test(`${m.key} ${m.title}`) && m.key !== 'create-aeronautics');
const listed = real.filter(m => !patches.includes(m));
write(join(out, 'book.json'), {
  name: 'Forfeit Skies: Mod Book',
  landing_text: `Every mod in $(l)Forfeit Skies$(), grouped by type and by family: each mod sits next to its addons.$(br2)${listed.length} mods, ${patches.length} compatibility patches and ${mods.length - real.length} background libraries.$(br2)Press $(l)R$() on any item for its recipe.`,
  version: 2, use_resource_pack: false, show_progress: false, i18n: false,
  model: 'patchouli:book_purple', book_texture: 'patchouli:textures/gui/book_purple.png',
  creative_tab: 'minecraft:tools_and_utilities',
});

let entries = 0, tip = 0;
function writeEntry(group, slug, name, icon, sortnum, pages) {
  if (pages.length % 2 === 1) pages.push({ type: 'patchouli:text', text: `$(l)Tip$()$(br2)${TIPS[tip++ % TIPS.length]}` });
  write(join(out, 'en_us', 'entries', group, `${slug}.json`), { name, icon, category: `${NS}:${group}`, sortnum, pages });
  entries++;
}
const modLine = (m) => {
  const where = m.side === 'client' ? ' $(7)(your game only)$()' : m.side === 'server' ? ' $(7)(server only)$()' : '';
  return `$(l)${clean(m.title)}$()${where}$(br)${short(DESC[m.key] || tidy(m.description), MAX_DESC)}`;
};

CATEGORIES.forEach(([group, title, shortName, icon, blurb], ci) => {
  const inCat = listed.filter(m => m.group === group).sort((a, b) => a.title.localeCompare(b.title));
  if (!inCat.length) return;
  write(join(out, 'en_us', 'categories', `${group}.json`), { name: title, description: `${blurb}$(br2)${inCat.length} mods.`, icon, sortnum: ci });
  const fams = (FAMILIES[group] || []).map(([t, i, re]) => ({ t, i, re, list: [] }));
  const other = { t: `More ${shortName}`, i: OTHER_ICON[group], list: [] };
  for (const m of inCat) (fams.find(f => f.re.test(`${m.key} ${m.title}`)) || other).list.push(m);
  [...fams, other].filter(f => f.list.length).forEach((f, fi) => {
    f.list.sort((a, b) => (MAIN.has(b.key) - MAIN.has(a.key)) || a.title.localeCompare(b.title));   // main mod first, then addons A-Z
    const lines = f.list.map(modLine);
    const pages = [];
    for (let i = 0; i < lines.length; i += PER_PAGE) pages.push({ type: 'patchouli:text', text: lines.slice(i, i + PER_PAGE).join('$(br2)') });
    writeEntry(group, f.t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), f.t, f.i, f === other ? 99 : fi, pages);
  });
});

// Compatibility patches: names only, several per page.
if (patches.length) {
  const names = patches.map(m => `- ${clean(m.title)}`).sort();
  const pages = [{ type: 'patchouli:text', text: 'Small fixes that make mods work together, mostly on airships. Nothing to craft or learn: they just work in the background.' }];
  for (let i = 0; i < names.length; i += 7) pages.push({ type: 'patchouli:text', text: names.slice(i, i + 7).join('$(br)') });
  writeEntry('qol', 'compat_patches', 'Compat Patches', 'minecraft:command_block', 100, pages);
}
console.log(`Mod book: ${listed.length} mods + ${patches.length} patches, ${entries} entries -> ${out}`);
