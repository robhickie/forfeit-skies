// Forfeit Skies: Create "Tuff Enough" recipes, rebuilt for NeoForge.
// Create: Tuff Enough (modrinth.com/mod/create-tuff-enough) is Fabric-only, so its recipes
// (v1.0.1) are copied here as plain data. Fabric fluid amounts converted: 20250 = 250 mB, 8100 = 100 mB.
// Left out on purpose (Rob, 2026-11-23):
//  - Coal block -> diamond and gold blocks -> ancient debris (superheated "rare" recipes)
//  - its tuff crushing (tuff -> gold nuggets / raw copper)
//  - lapis synthesis (2 blue dye + calcite + gold nugget -> ~3.4 lapis loops: lapis makes blue dye)
//  - red sand washing (clashes with Create's own red sand washing)
// Also changed:
//  - Create's own tuff crushing (flint + gold/copper/zinc/iron/electrum nuggets) is removed.
//  - Crushing Crimsite/Ochrum/Veridium/Asurine now gives 1 nugget (natural or crafted). Without
//    this, nugget + gravel + lava -> ore stone -> crushing gave 2-8x the nuggets back (infinite metal).
// Applies at server restart (or /reload).

ServerEvents.recipes(event => {
  const lava = mb => ({ type: 'neoforge:single', fluid: 'minecraft:lava', amount: mb })
  const water = mb => ({ type: 'neoforge:single', fluid: 'minecraft:water', amount: mb })
  const item = id => ({ item: id })
  const compact = (name, ingredients, results, extra) =>
    event.custom(Object.assign({ type: 'create:compacting', ingredients: ingredients, results: results }, extra || {}))
      .id('forfeit:tuffenough/' + name)

  // ---------- Compacting (Mechanical Press + Basin) ----------
  compact('tuff', [item('minecraft:andesite'), item('minecraft:andesite'), item('minecraft:gravel'), item('minecraft:gravel'), lava(250)],
    [{ id: 'minecraft:tuff' }])
  compact('deepslate', [item('minecraft:cobblestone'), item('minecraft:cobblestone'), item('minecraft:cobblestone'), item('minecraft:cobblestone'), lava(250)],
    [{ id: 'minecraft:deepslate', count: 2 }])
  compact('calcite', [item('minecraft:gravel'), item('minecraft:bone_meal')],
    [{ id: 'minecraft:calcite' }])
  compact('limestone', [item('minecraft:calcite'), item('minecraft:sand')],
    [{ id: 'create:limestone' }])
  compact('scoria', [item('minecraft:netherrack'), item('minecraft:cobblestone'), lava(250)],
    [{ id: 'create:scoria' }])
  compact('asurine', [item('create:zinc_nugget'), item('minecraft:gravel'), water(250)],
    [{ id: 'create:asurine' }])
  compact('crimsite', [item('minecraft:iron_nugget'), item('minecraft:gravel'), lava(250)],
    [{ id: 'create:crimsite' }])
  compact('ochrum', [item('minecraft:gold_nugget'), item('minecraft:gravel'), lava(250)],
    [{ id: 'create:ochrum' }])
  compact('veridium', [item('create:copper_nugget'), item('minecraft:gravel'), lava(250)],
    [{ id: 'create:veridium' }])

  // ---------- Mixing (heated) ----------
  event.custom({
    type: 'create:mixing',
    heat_requirement: 'heated',
    ingredients: [item('minecraft:cobblestone'), lava(100)],
    results: [{ id: 'minecraft:netherrack' }]
  }).id('forfeit:tuffenough/netherrack')

  // ---------- Haunting (Encased Fan through soul fire) ----------
  event.custom({
    type: 'create:haunting',
    ingredients: [item('minecraft:charcoal')],
    results: [{ id: 'minecraft:coal' }]
  }).id('forfeit:tuffenough/coal_from_charcoal')
  event.custom({
    type: 'create:haunting',
    ingredients: [item('create:scoria')],
    results: [{ id: 'create:scorchia' }]
  }).id('forfeit:tuffenough/scorchia')

  // ---------- Milling ----------
  event.custom({
    type: 'create:milling',
    ingredients: [item('minecraft:dried_kelp_block')],
    processing_time: 200,
    results: [{ id: 'minecraft:string', count: 4 }, { id: 'minecraft:dried_kelp', count: 2, chance: 0.25 }]
  }).id('forfeit:tuffenough/string_from_kelp')

  // ---------- No tuff -> metal ----------
  event.remove({ id: 'create:crushing/tuff' })
  event.remove({ id: 'create:crushing/tuff_recycling' })

  // ---------- Ore stones crush to 1 nugget (no metal loop) ----------
  const oreStones = {
    crimsite: 'minecraft:iron_nugget',
    ochrum: 'minecraft:gold_nugget',
    veridium: 'create:copper_nugget',
    asurine: 'create:zinc_nugget'
  }
  Object.keys(oreStones).forEach(stone => {
    event.remove({ id: 'create:crushing/' + stone })
    event.remove({ id: 'create:crushing/' + stone + '_recycling' })
    event.custom({
      type: 'create:crushing',
      ingredients: [item('create:' + stone)],
      processing_time: 250,
      results: [{ id: oreStones[stone] }]
    }).id('forfeit:crushing/' + stone)
    event.custom({
      type: 'create:crushing',
      ingredients: [{ tag: 'create:stone_types/' + stone }],
      processing_time: 250,
      results: [{ id: oreStones[stone] }]
    }).id('forfeit:crushing/' + stone + '_recycling')
  })
})
