// Forfeit Skies: balance v1
// Two goals:
//  1. Cross-path links: key mid/late items need something from another path,
//     so the Create, magic and tech players trade with each other.
//  2. Slow down a few things that are too strong too early.
// Every change keeps the item craftable; nothing is removed outright.
// Edit freely: each block is independent. Changes apply on server restart (or /reload).

ServerEvents.recipes(event => {

  // ---------- 1. Cross-path links ----------

  // TECH needs CREATE: AE2 controller takes 2 Create precision mechanisms instead of 2 fluix crystals.
  event.remove({ id: 'ae2:network/blocks/controller' })
  event.shaped('ae2:controller', ['aba', 'pcp', 'aba'], {
    a: 'ae2:smooth_sky_stone_block',
    b: 'ae2:fluix_crystal',
    p: 'create:precision_mechanism',
    c: 'ae2:engineering_processor'
  }).id('forfeit:ae2/controller')

  // TECH needs MAGIC: Mekanism Digital Miner takes a block of Ars Nouveau source gems instead of a basic circuit.
  event.replaceInput({ id: 'mekanism:digital_miner' }, '#c:circuits/basic', 'ars_nouveau:source_gem_block')

  // MAGIC needs CREATE: Ars Nouveau Enchanting Apparatus takes a precision mechanism instead of a diamond.
  event.replaceInput({ id: 'ars_nouveau:enchanting_apparatus' }, '#c:gems/diamond', 'create:precision_mechanism')

  // MAGIC needs TECH: Iron's Spells netherite spell book takes Mekanism reinforced alloy instead of blood vials.
  // Create: Wizardry adds a Create-machine route to the same book that would skip this; remove it.
  event.remove({ id: 'irons_spellbooks:sequenced_assembly/netherite_spell_book' })
  event.replaceInput({ id: 'irons_spellbooks:netherite_spell_book' }, 'irons_spellbooks:blood_vial', 'mekanism:alloy_reinforced')

  // CREATE needs TECH: the advanced (gyroscopic) propeller bearing needs an AE2 logic processor instead of a wooden slab.
  // The basic propeller bearing is unchanged, so anyone can still build a first airship.
  event.replaceInput({ id: 'aeronautics:gyroscopic_propeller_bearing' }, '#minecraft:wooden_slabs', 'ae2:logic_processor')

  // TECH needs CREATE: Powah's Energizing Orb (gate to all of Powah) needs a precision mechanism.
  event.remove({ id: 'powah:crafting/energizing_orb' })
  event.shaped('powah:energizing_orb', ['gpg', 'gcg', 'rrr'], {
    g: '#c:glass_blocks',
    p: 'create:precision_mechanism',
    c: 'powah:dielectric_casing',
    r: 'powah:dielectric_rod_horizontal'
  }).id('forfeit:powah/energizing_orb')

  // ---------- 2. Slow down strong items ----------

  // Industrial Foregoing Laser Drill (makes ore from nothing): end-game.
  // Diamond gears -> Mekanism atomic alloy, pistons -> AE2 engineering processors.
  event.replaceInput({ id: 'industrialforegoing:laser_drill' }, '#c:gears/diamond', 'mekanism:alloy_atomic')
  event.replaceInput({ id: 'industrialforegoing:laser_drill' }, 'minecraft:piston', 'ae2:engineering_processor')

  // Industrial Foregoing Mob Duplicator: needs a Nether Star (beat the Wither first).
  event.replaceInput({ id: 'industrialforegoing:mob_duplicator' }, 'minecraft:redstone', 'minecraft:nether_star')

  // Torchmaster Mega Torch (stops ALL hostile spawns in a huge area): diamond blocks instead of gold blocks.
  event.replaceInput({ id: 'torchmaster:megatorch' }, '#c:storage_blocks/gold', 'minecraft:diamond_block')
})
