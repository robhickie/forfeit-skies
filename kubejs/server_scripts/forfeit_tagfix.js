// Discerning the Eldritch lists discerning_the_eldritch:echo_greatsword in #minecraft:swords,
// but that item is never registered in this pack. In 1.21 one missing entry makes the whole tag fail,
// and the failure cascades: minecraft:swords -> enchantable/sword -> sharp_weapon -> weapon ->
// enchantable/durability. With durability broken, Mending and Unbreaking fit on nothing at all.
// Removing the missing entry lets the whole chain load again. (found 2026-11-28)
ServerEvents.tags('item', event => {
  event.remove('minecraft:swords', 'discerning_the_eldritch:echo_greatsword')
  // Same problem, smaller lists (each mod tags an item that isn't registered here):
  event.remove('minecraft:enchantable/equippable', 'darkermagic:whispers_staff') // Curse of Binding
  event.remove('c:raw_materials/jade', 'iss_magicfromtheeast:raw_jade') // breaks c:raw_materials too
  event.remove('relics:relics', 'reliquified_irons_spells_and_spellbooks:bloodied_voodoo_doll')
})
