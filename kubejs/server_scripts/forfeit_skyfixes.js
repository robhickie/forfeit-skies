// Forfeit Skies: fixes for things a void/island world doesn't provide naturally.
// Kelp: no oceans, so no natural kelp (Create belts need 6 dried kelp). Sugar cane + water bucket -> kelp (bucket returned).
// Plant it in any water column and it grows, so one piece starts a renewable kelp farm.
// Deep ores (diamond, gold, redstone, DivineRPG rupee/arlemite, Draconic draconium) are added at island heights by the
// data pack in kubejs/data/forfeit (worldgen + neoforge/biome_modifier/sky_ores.json).
ServerEvents.recipes(event => {
  event.shapeless('minecraft:kelp', ['minecraft:sugar_cane', 'minecraft:water_bucket']).id('forfeit:kelp_from_sugar_cane')
})
