// Builds the in-game "Forfeit Skies Mod Book" (a Patchouli book) from .cache/modlist.json
// (written by build-modlist.mjs). Output goes into the pack's kubejs/ folder, which KubeJS loads
// as a data pack + resource pack, so it reaches the server and every player through the normal pack update.
//
//   node build-modlist.mjs          (refreshes .cache/modlist.json)
//   node build-modbook.mjs [--pack C:\Users\rober\minecraft-pack]
//
// Book layout: one category per mod type (Create, Magic, Tech, ...). Inside each category, mods are
// grouped into "families" (Farmer's Delight + its addons, Mekanism + addons, ...), one entry per family.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const PACK = arg('--pack') || 'C:\\Users\\rober\\minecraft-pack';
const NS = 'patchouli', BOOK = 'mods';   // => book id patchouli:mods
const mods = JSON.parse(readFileSync(join(DIR, '..', '.cache', 'modlist.json'), 'utf8'));

// Categories: [group id from build-modlist, title, icon, blurb]
const CATEGORIES = [
  ['create', 'Create & Airships', 'aeronautics:propeller_bearing', 'Machines, trains, cannons and the airships of Forfeit Skies.'],
  ['magic', 'Magic', 'ars_nouveau:novice_spell_book', 'Spellcasting, rituals, spirits and witchcraft.'],
  ['tech', 'Tech', 'mekanism:metallurgic_infuser', 'Power, processing, digital storage and computers.'],
  ['adventure', 'Adventure & Bosses', 'minecraft:diamond_sword', 'Bosses, new mobs, weapons and loot.'],
  ['world', 'World & Structures', 'minecraft:grass_block', 'Terrain, biomes, dimensions and things to find.'],
  ['building', 'Building', 'minecraft:bricks', 'Blocks, furniture and decoration.'],
  ['food', 'Food & Farming', 'farmersdelight:cooking_pot', 'Cooking, brewing and farming.'],
  ['qol', 'Quality of Life', 'minecraft:compass', 'Maps, storage, recipes and handy tweaks.'],
];

// Families inside each category: [title, icon, regex tested against "key title"]. First match wins; the rest go to "Other ...".
const FAMILIES = {
  create: [
    ['Create Aeronautics & Airship Addons', 'aeronautics:propeller_bearing', /aeronautics|sable|aeroworks|avionics|radars|tweaked-controllers|grapple/i],
    ['Create Big Cannons', 'createbigcannons:cannon_mount', /big-cannons|big cannons/i],
    ['Trains & Railways', 'create:track_station', /rails|railway/i],
    ['Create & Its Addons', 'create:cogwheel', /./],
  ],
  magic: [
    ['Ars Nouveau & Addons', 'ars_nouveau:novice_spell_book', /^ars-|ars nouveau|ars creo|ars additions|ars ocultas|energistique/i],
    ["Iron's Spells & Addons", 'irons_spellbooks:iron_spell_book', /irons|spellbook|familiars|magic-from-the-east|eldritch|cataclysm-spellbooks|wizardry/i],
    ['Occultism & Addons', 'occultism:spirit_attuned_gem', /occult/i],
    ['Apotheosis', 'apotheosis:gem', /apoth/i],
    ['Relics', 'minecraft:totem_of_undying', /relics/i],
  ],
  tech: [
    ['Applied Energistics 2 & Addons', 'ae2:controller', /ae2|applied|mega|advancedae|extended-ae|merequester/i],
    ['Mekanism & Addons', 'mekanism:metallurgic_infuser', /mekanism/i],
    ['Immersive Engineering & Addons', 'immersiveengineering:hammer', /immersive|jei-multiblocks/i],
    ['Computers', 'computercraft:computer_advanced', /cc-tweaked|peripheral/i],
  ],
  adventure: [
    ["L_Ender's Cataclysm & Mowzie's Mobs", 'cataclysm:the_incinerator', /cataclysm|mowzie/i],
    ['Boss Mods', 'minecraft:wither_skeleton_skull', /boss|legendary|qliphoth|mutant|doppelganger|dragon-fight|edf/i],
    ['Weapons & Combat', 'minecraft:diamond_sword', /sword|shield|knight|apothic-attributes/i],
    ['Apotheosis', 'apotheosis:gem', /apoth/i],
  ],
  world: [
    ["YUNG's Structures", 'minecraft:mossy_cobblestone', /yung/i],
    ["Moog's Structures", 'minecraft:spyglass', /moog/i],
    ['When Dungeons Arise', 'minecraft:cracked_stone_bricks', /dungeons-arise|dungeons arise/i],
    ['Terrain & Biomes', 'minecraft:grass_block', /tectonic|terralith|biomes-o-plenty|regions-unexplored|nullscape|incendium|alexs-caves|serene/i],
    ['Dimensions', 'aether:aether_portal_frame', /aether|bumblezone|undergarden|deeper|divinerpg/i],
  ],
  building: [
    ["Macaw's Mods", 'minecraft:oak_door', /macaw/i],
    ['Chisel & Block Variants', 'chipped:botanist_workbench', /chipped|rechiseled/i],
  ],
  food: [
    ["Farmer's Delight & Addons", 'farmersdelight:cooking_pot', /delight|central-kitchen|slice-and-dice|brewin/i],
    ["Let's Do", 'vinery:wine_bottle', /lets-do|let's do/i],
  ],
  qol: [
    ['FTB (Quests, Teams, Vein-Mining)', 'ftbquests:book', /ftb/i],
    ['Maps & Claims', 'minecraft:filled_map', /xaero|open-parties/i],
    ['Recipes & Tooltips', 'minecraft:knowledge_book', /jei|jer\b|jep|resources-jer|professions|jade|tooltip|enchantment-descriptions|polymorph|crafting-tweaks/i],
    ['Storage & Backpacks', 'sophisticatedbackpacks:backpack', /sophisticated|functional-storage|storagedrawers|trashslot/i],
    ['Performance & Server', 'minecraft:redstone_torch', /modernfix|ferrite|clumps|packet|dynamic-fps|spark|chunky|im-fast|leaves-be-gone/i],
  ],
};
const OTHER_ICON = { create: 'create:cogwheel', magic: 'minecraft:enchanted_book', tech: 'minecraft:redstone', adventure: 'minecraft:iron_sword',
  world: 'minecraft:compass', building: 'minecraft:bricks', food: 'minecraft:bread', qol: 'minecraft:chest' };

// Patchouli text: escape its formatting char, keep it short so a page holds a few mods.
const clean = (s) => String(s || '').replace(/\$/g, 'S').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const short = (s, n) => { s = clean(s); return s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:!-]+\S*$/, '') + '…' : s; };
const PER_PAGE = 3, FIRST_PAGE = 2;   // the first page also shows the entry title

// Patchouli only reads book.json from mod jars or the game folder's patchouli_books/ (book id becomes patchouli:<folder>).
// The pages live in kubejs/assets (a resource pack), under the same 'patchouli' namespace.
// External Patchouli book: book.json AND its pages live in the game folder's patchouli_books/<id>/ (book id patchouli:<id>),
// with use_resource_pack: false. (Pages in a resource pack are not picked up for external books.)
const out = { data: join(PACK, 'patchouli_books', BOOK), assets: join(PACK, 'patchouli_books', BOOK) };
for (const legacy of [join(PACK, 'kubejs', 'data', 'forfeit'), join(PACK, 'kubejs', 'assets', 'forfeit', 'patchouli_books'), join(PACK, 'kubejs', 'assets', 'patchouli')]) if (existsSync(legacy)) rmSync(legacy, { recursive: true });
if (existsSync(out.data)) rmSync(out.data, { recursive: true });
mkdirSync(join(out.assets, 'en_us', 'categories'), { recursive: true });
mkdirSync(out.data, { recursive: true });
const write = (p, obj) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); };

const real = mods.filter(m => m.group !== 'library');
write(join(out.data, 'book.json'), {
  name: 'Forfeit Skies: Mod Book',
  landing_text: `Every mod in $(l)Forfeit Skies$(), grouped by type and by family (each mod sits next to its addons).$(br2)${real.length} mods, plus ${mods.length - real.length} background libraries that aren't listed.$(br2)Want a mod's recipes? Press $(l)R$() on any item for JEI.`,
  version: 1, use_resource_pack: false, show_progress: false, i18n: false,
  model: 'patchouli:book_purple', book_texture: 'patchouli:textures/gui/book_purple.png',
  creative_tab: 'minecraft:tools_and_utilities',
});

let entries = 0;
CATEGORIES.forEach(([group, title, icon, blurb], ci) => {
  const inCat = real.filter(m => m.group === group).sort((a, b) => a.title.localeCompare(b.title));
  if (!inCat.length) return;
  write(join(out.assets, 'en_us', 'categories', `${group}.json`), { name: title, description: `${blurb}$(br2)${inCat.length} mods.`, icon, sortnum: ci });
  const fams = (FAMILIES[group] || []).map(([t, i, re]) => ({ t, i, re, list: [] }));
  const other = { t: `Other ${title}`, i: OTHER_ICON[group], list: [] };
  for (const m of inCat) (fams.find(f => f.re.test(`${m.key} ${m.title}`)) || other).list.push(m);
  [...fams, other].filter(f => f.list.length).forEach((f, fi) => {
    const lines = f.list.map(m => `$(l)${clean(m.title)}$()${m.side === 'client' ? ' $(7)(your game only)$()' : m.side === 'server' ? ' $(7)(server only)$()' : ''}$(br)${short(m.description, 78)}`);
    const pages = [];
    for (let i = 0; i < lines.length;) {
      const n = pages.length ? PER_PAGE : FIRST_PAGE;
      pages.push({ type: 'patchouli:text', text: lines.slice(i, i + n).join('$(br2)') });
      i += n;
    }
    pages[0].title = f.t.length > 24 ? undefined : f.t;
    const slug = f.t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    write(join(out.assets, 'en_us', 'entries', group, `${slug}.json`), {
      name: `${f.t} (${f.list.length})`, icon: f.i, category: `${NS}:${group}`, sortnum: f === other ? 99 : fi, pages,
    });
    entries++;
  });
});
console.log(`Mod book: ${real.length} mods in ${CATEGORIES.length} categories, ${entries} family entries -> ${join(PACK, 'kubejs')}`);
