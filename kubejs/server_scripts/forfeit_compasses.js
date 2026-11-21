// Forfeit Skies: structure/biome finders are endgame (Rob: "harder than netherite"). Exploring the islands by airship comes first.
// Each needs a Nether Star (the Wither), 4 netherite ingots and a diamond block. Repair recipes are unchanged.
ServerEvents.recipes(event => {
  event.remove({ id: 'explorerscompass:explorers_compass' })
  event.shaped('explorerscompass:explorerscompass', ['NDN', 'ESE', 'NCN'], {
    N: 'minecraft:netherite_ingot', D: 'minecraft:diamond_block', E: 'minecraft:ender_eye',
    S: 'minecraft:nether_star', C: 'minecraft:compass'
  }).id('forfeit:explorers_compass')

  event.remove({ id: 'naturescompass:natures_compass' })
  event.shaped('naturescompass:naturescompass', ['NDN', 'ESE', 'NCN'], {
    N: 'minecraft:netherite_ingot', D: 'minecraft:diamond_block', E: 'minecraft:emerald_block',
    S: 'minecraft:nether_star', C: 'minecraft:compass'
  }).id('forfeit:natures_compass')
})
