// Forfeit Skies: AE2 meteorites never generate on the sky islands (none in 50k chunks inside the border, 2026-11-21),
// so sky stone, budding certus quartz and the four inscriber presses have no source. These recipes stand in for them:
// fairly costly, but nothing past the Nether. Presses can still be copied in the Inscriber with an iron block as usual.
ServerEvents.recipes(event => {
  // Sky stone: obsidian + blackstone around an ender pearl -> 8
  event.shaped(Item.of('ae2:sky_stone_block', 8), ['OBO', 'BEB', 'OBO'], {
    O: 'minecraft:obsidian', B: 'minecraft:blackstone', E: 'minecraft:ender_pearl'
  }).id('forfeit:ae2_sky_stone')

  // Certus source: a flawed budding certus (grows crystals; slowly decays as usual, repair with the AE2 water transform)
  event.shaped('ae2:flawed_budding_quartz', ['QSQ', 'SDS', 'QSQ'], {
    Q: 'minecraft:quartz_block', S: 'ae2:sky_stone_block', D: 'minecraft:diamond'
  }).id('forfeit:ae2_flawed_budding_quartz')

  // Inscriber presses: sky stone + iron blocks around a key item
  const press = (out, key) => event.shaped(out, ['SIS', 'IKI', 'SIS'], {
    S: 'ae2:sky_stone_block', I: 'minecraft:iron_block', K: key
  }).id(`forfeit:${out.split(':')[1]}`)
  press('ae2:calculation_processor_press', 'ae2:quartz_block')
  press('ae2:engineering_processor_press', 'minecraft:diamond_block')
  press('ae2:logic_processor_press', 'minecraft:gold_block')
  press('ae2:silicon_press', 'ae2:fluix_block')
})
