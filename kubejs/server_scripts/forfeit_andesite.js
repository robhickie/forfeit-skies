// Forfeit Skies: a Create route to andesite.
// Sky islands are mostly plain stone, and Create eats andesite (alloy, casings),
// so this gives an automatable source. It's not free: it needs a Mechanical Mixer + Basin
// heated by a fuelled Blaze Burner (like brass),
// and flint means milling or crushing gravel first. Per 2 andesite: 2 cobblestone + 1 gravel + 1 flint.
// The vanilla diorite + cobblestone recipe is unchanged (needed to build the first mixer).
// Tune the counts below. Applies at server restart (or /reload).

ServerEvents.recipes(event => {
  event.custom({
    type: 'create:mixing',
    ingredients: [
      { item: 'minecraft:cobblestone' },
      { item: 'minecraft:cobblestone' },
      { item: 'minecraft:gravel' },
      { item: 'minecraft:flint' }
    ],
    results: [
      { id: 'minecraft:andesite', count: 2 }
    ],
    heat_requirement: 'heated'
  }).id('forfeit:create/mixing/andesite')
})
