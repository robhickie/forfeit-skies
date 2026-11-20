// Forfeit Skies: waystones are a big investment. (Use costs are in the server's config/waystones-common.toml.)
ServerEvents.recipes(event => {
  // Warp stone: late game on purpose (airships are the main way to travel). 4 diamonds, 4 eyes of ender, 1 netherite ingot.
  event.remove({ id: 'waystones:warp_stone' })
  event.shaped('waystones:warp_stone', ['DED', 'EGE', 'DED'], {
    D: 'minecraft:diamond', E: 'minecraft:ender_eye', G: 'minecraft:netherite_ingot'
  }).id('forfeit:warp_stone')
  // Every waystone style: gold blocks instead of obsidian along the bottom
  event.replaceInput({ mod: 'waystones', output: /waystones:.*waystone$/ }, 'minecraft:obsidian', 'minecraft:gold_block')
  // Scrolls: one per craft instead of three (same patterns as Waystones' own recipes)
  event.remove({ id: 'waystones:warp_scroll' })
  event.shaped('waystones:warp_scroll', ['GDG', 'GEG', 'PPP'], { G: '#c:nuggets/gold', D: 'minecraft:ink_sac', E: 'minecraft:ender_eye', P: 'minecraft:paper' }).id('forfeit:warp_scroll')
  event.remove({ id: 'waystones:return_scroll' })
  event.shaped('waystones:return_scroll', ['GEG', 'PIP'], { G: '#c:nuggets/gold', E: 'minecraft:ender_eye', I: 'minecraft:ink_sac', P: 'minecraft:paper' }).id('forfeit:return_scroll')
  event.remove({ id: 'waystones:portal_scroll' })
  event.shaped('waystones:portal_scroll', ['SIS', 'SES', 'PPP'], { S: 'minecraft:amethyst_shard', I: 'minecraft:ink_sac', E: 'minecraft:ender_pearl', P: 'minecraft:paper' }).id('forfeit:portal_scroll')
  // Warp dust (for warp plates): two per craft instead of four
  event.remove({ id: 'waystones:warp_dust' })
  event.shapeless('2x waystones:warp_dust', ['minecraft:ender_pearl', 'minecraft:amethyst_shard']).id('forfeit:warp_dust')
})
