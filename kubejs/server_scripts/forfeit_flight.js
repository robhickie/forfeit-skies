// Forfeit Skies: airships are THE way to fly (Rob, 2026-11-22). Craftable personal flight is disabled;
// elytra-style chestplates (which also need a vanilla Elytra) cost a Nether Star on top.
// Gliders, Aether parachutes and Flying Fish Boots stay: they only slow a fall / glide.
const FORFEIT_NO_FLIGHT = [
  // jetpacks
  'create_jetpack:jetpack', 'create_jetpack:netherite_jetpack',
  'create_sa:andesite_jetpack_chestplate', 'create_sa:brass_jetpack_chestplate',
  'create_sa:copper_jetpack_chestplate', 'create_sa:netherite_jetpack_chestplate',
  'mekanism:jetpack', 'mekanism:jetpack_armored',
  'mekanism:module_jetpack_unit', 'mekanism:module_gravitational_modulating_unit',
  // PneumaticCraft jet boots + elytra upgrade
  'pneumaticcraft:jet_boots_upgrade_1', 'pneumaticcraft:jet_boots_upgrade_2', 'pneumaticcraft:jet_boots_upgrade_3',
  'pneumaticcraft:jet_boots_upgrade_4', 'pneumaticcraft:jet_boots_upgrade_5', 'pneumaticcraft:elytra_upgrade',
  // Ars Nouveau
  // (Belt of Levitation stays: it only lifts you a little above the ground - a climbing aid, no use over the void)
  'ars_nouveau:thread_gliding', 'ars_nouveau:glyph_glide', 'ars_nouveau:ritual_flight',
  // DivineRPG Angelic armour (full set = flight)
  'divinerpg:angelic_helmet', 'divinerpg:angelic_chestplate', 'divinerpg:angelic_leggings', 'divinerpg:angelic_boots',
  // Draconic Evolution flight modules
  'draconicevolution:item_wyvern_flight', 'draconicevolution:item_draconic_flight', 'draconicevolution:item_chaotic_flight'
]

ServerEvents.recipes(event => {
  FORFEIT_NO_FLIGHT.forEach(id => event.remove({ output: id }))

  // Wings that need a vanilla Elytra: add a Nether Star
  event.remove({ output: 'alexsmobs:tarantula_hawk_elytra' })
  event.shaped('alexsmobs:tarantula_hawk_elytra', ['WEW', ' S '], {
    W: 'alexsmobs:tarantula_hawk_wing', E: 'minecraft:elytra', S: 'minecraft:nether_star'
  }).id('forfeit:tarantula_hawk_elytra')

  event.remove({ output: 'deeperdarker:soul_elytra' })
  event.shaped('deeperdarker:soul_elytra', ['BCB', 'DED', 'BSB'], {
    B: 'deeperdarker:sculk_bone', C: 'deeperdarker:soul_crystal', D: 'deeperdarker:soul_dust',
    E: 'minecraft:elytra', S: 'minecraft:nether_star'
  }).id('forfeit:soul_elytra')

  const wingedChest = (out, chest) => {
    event.remove({ output: out })
    event.shaped(out, [' E ', 'SCS', ' N '], {
      E: 'minecraft:elytra', C: chest, S: 'minecraft:nether_star', N: 'minecraft:netherite_ingot'
    }).id(`forfeit:${out.split(':')[1]}`)
  }
  wingedChest('cataclysm:ignitium_elytra_chestplate', 'cataclysm:ignitium_chestplate')
  wingedChest('cataclysm_spellbooks:cursium_mage_elytra', 'cataclysm_spellbooks:cursium_mage_chestplate')
  wingedChest('cataclysm_spellbooks:ignis_chestplate_elytra', 'cataclysm_spellbooks:ignis_chestplate')
})
