// Forfeit Skies Mod Book (Patchouli book "patchouli:mods": patchouli_books/mods/, built by docs/guide-tools/build-modbook.mjs).
// It is NOT given on join any more: it lives inside the Akashic Tome (see forfeit_tome.js).
// Lost it? Craft a book + compass.
const MOD_BOOK = 'patchouli:guide_book[patchouli:book="patchouli:mods"]'

ServerEvents.recipes(event => {
  event.shapeless(Item.of(MOD_BOOK), ['minecraft:book', 'minecraft:compass']).id('forfeit:mod_book')
})
