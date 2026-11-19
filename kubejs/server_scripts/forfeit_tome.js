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
const TOME_FLAG = 'forfeit_got_tome_v1'

function buildTome() {
  const parts = []
  TOME_ITEMS.forEach(id => {
    const mod = id.split(':')[0]
    if (!Platform.isLoaded(mod)) return
    let ok = false
    try { ok = !Item.of(id).isEmpty() } catch (e) { ok = false }
    if (ok) parts.push(`{id:"${id}",count:1}`)
  })
  TOME_PATCHOULI.forEach(([mod, book]) => {
    if (Platform.isLoaded(mod)) parts.push(`{id:"patchouli:guide_book",count:1,components:{"patchouli:book":"${book}"}}`)
  })
  return Item.of(`akashictome:tome[akashictome:tool_content=[${parts.join(',')}]]`)
}

PlayerEvents.loggedIn(event => {
  const player = event.player
  if (player.persistentData.getBoolean(TOME_FLAG)) return
  try {
    player.give(buildTome())
    player.persistentData.putBoolean(TOME_FLAG, true)
    player.tell(Text.of('[Forfeit Skies] ').darkPurple().append(Text.of('Here is your Akashic Tome with every guide book inside. Sneak + scroll to pick a book.').gray()))
  } catch (e) {
    console.error(`Forfeit tome: could not build the tome: ${e}`)
  }
})
