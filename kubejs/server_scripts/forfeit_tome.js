// Forfeit Skies: a pre-filled Akashic Tome with every guide book in the pack, given once on first join.
// Books whose mod isn't loaded (or whose item doesn't exist) are skipped, so removing a mod can't break this.
// To add a book: add a line below. Patchouli books use [modid, bookId] instead of an item id.

const TOME_ITEMS = [
  'ftbquests:book', 'ae2:guide', 'immersiveengineering:manual', 'powah:book',
  'ars_nouveau:worn_notebook', 'malum:encyclopedia_arcana', 'eidolon_repraised:codex', 'mahoutsukai:guidebook',
  'hexerei:book_of_shadows', 'irons_jewelry:jewelcrafting_guide', 'occultengineering:encyclopedia_of_souls',
  'occultism:dictionary_of_spirits', 'forbidden_arcanus:forbiddenomicon', 'vampirism:vampirism_guidebook',
  'alshanex_familiars:familiar_guide', 'familiarslib:familiar_compendium', 'discerning_the_eldritch:guardian_guidebook',
  'fdbosses:qliphothic_codex', 'legendary_monsters:guide_book', 'aether:book_of_lore', 'alexscaves:cave_book',
  'alexsmobs:animal_dictionary', 'aquamirae:logbook', 'create_avionics:almanac',
]
// Patchouli books: [mod that must be loaded, Patchouli book id]
const TOME_PATCHOULI = [
  ['patchouli', 'patchouli:mods'],   // our Forfeit Skies Mod Book
  ['irons_spellbooks', 'irons_spellbooks:iss_guide_book'],
  ['apotheosis', 'apotheosis:apoth_chronicle'],
  ['goety', 'goety:black_book'],
  ['goety', 'goety:witches_brew'],
  ['industrialforegoing', 'industrialforegoing:industrial_foregoing'],
  ['pneumaticcraft', 'pneumaticcraft:book'],
  ['modularrouters', 'modularrouters:book'],
  ['enderio', 'enderio:guide'],
  ['advancedperipherals', 'advancedperipherals:manual'],
  ['divinerpg', 'divinerpg:divine'],
  ['l2hostility', 'l2hostility:hostility_guide'],
]
const TOME_FLAG = 'forfeit_got_tome_v2'   // v2: books now carry akashictome:defined_mod so morphing works

// Ask the item registry directly: Item.of() with an unknown id throws an error that escapes try/catch.
const $Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const $RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
const itemExists = (id) => $Registries.ITEM.containsKey($RL.parse(id))

function buildTome() {
  const parts = []
  TOME_ITEMS.forEach(id => {
    if (!Platform.isLoaded(id.split(':')[0]) || !itemExists(id)) { console.warn(`Forfeit tome: skipping ${id} (no such item)`); return }
    // akashictome:defined_mod is what the Tome stamps on a book when you craft it in; morphing looks books up by it.
    parts.push(`{id:"${id}",count:1,components:{"akashictome:defined_mod":"${id.split(':')[0]}"}}`)
  })
  TOME_PATCHOULI.forEach(([mod, book]) => {
    if (Platform.isLoaded(mod)) parts.push(`{id:"patchouli:guide_book",count:1,components:{"patchouli:book":"${book}","akashictome:defined_mod":"${book.split(':')[0]}"}}`)
  })
  return Item.of(`akashictome:tome[akashictome:tool_content=[${parts.join(',')}]]`)
}

PlayerEvents.loggedIn(event => {
  const player = event.player
  if (player.persistentData.getBoolean(TOME_FLAG)) return
  try {
    player.give(buildTome())
    player.persistentData.putBoolean(TOME_FLAG, true)
    player.tell(Text.of('[Forfeit Skies] ').darkPurple().append(Text.of('Here is your Akashic Tome with every guide book inside. Right-click it, pick a book, right-click again to read.').gray()))
    // Some mods hand out their own starter book on first join (no config switch for these). They're all in the
    // Tome, so tidy up the loose copies a few seconds later. Only runs on this first join, never again.
    // Target by UUID (a fixed hex format) rather than building the command from the player name.
    const uuid = String(player.uuid)
    if (/^[0-9a-f-]{36}$/i.test(uuid)) {
      event.server.scheduleInTicks(100, () => {
        STARTER_BOOKS.forEach(pred => event.server.runCommandSilent(`clear ${uuid} ${pred}`))
      })
    }
  } catch (e) {
    console.error(`Forfeit tome: could not build the tome: ${e}`)
  }
})

// Loose starter books removed on first join (item predicates for /clear).
const STARTER_BOOKS = [
  'ftbquests:book', 'alshanex_familiars:familiar_guide', 'ars_nouveau:worn_notebook', 'alexsmobs:animal_dictionary',
  'integrateddynamics:on_the_dynamics_of_integration',
  'patchouli:guide_book[patchouli:book="divinerpg:divine"]', 'patchouli:guide_book[patchouli:book="advancedperipherals:manual"]',
  'patchouli:guide_book[patchouli:book="patchouli:mods"]',
]
