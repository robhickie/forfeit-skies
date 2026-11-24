// Forfeit Skies: per-dimension world borders (Rob, 2026-11-24).
// Vanilla has ONE border (the overworld's, set with /worldborder) and copies it into every other dimension.
// This script sets EVERY dimension's border (overworld included - it comes first, because changing it copies its size into
// all other dimensions, which the rest of the list then overrides), and re-applies them every minute.
// /worldborder is no longer the place to change borders: edit this list, upload, `kubejs reload server-scripts`.
// Keep each border at least 128 blocks inside the pre-generated area. Sizes are full widths in blocks, centred on 0,0.
const FORFEIT_BORDERS = {
  'minecraft:overworld': 6000,           // ±3000; pre-generated to ±5000
  'minecraft:the_nether': 3840,          // ±1920; pre-generated to ±2048
  'minecraft:the_end': 6000,             // ±3000; pre-generating to ±3200 (24 Nov); no way in yet
  'aether:the_aether': 3840,             // ±1920; pre-generated to ±2048
  'undergarden:undergarden': 2000,       // ±1000; pre-generated to ±1152
  'deeperdarker:otherside': 2000,
  'the_bumblezone:the_bumblezone': 2000,
  'divinerpg:eden': 2000, 'divinerpg:wildwood': 2000, 'divinerpg:apalachia': 2000, 'divinerpg:skythern': 2000,
  'divinerpg:mortum': 2000, 'divinerpg:iceika': 2000, 'divinerpg:arcana': 2000, 'divinerpg:vethea': 2000,
  // Storage/utility dimensions place things far from 0,0: give them the maximum border so nothing breaks.
  'ae2:spatial_storage': 59999968,
  'irons_spellbooks:pocket_dimension': 59999968
}

function forfeitApplyBorders(server, logAll) {
  let fbIds = Object.keys(FORFEIT_BORDERS)
  for (let fbI = 0; fbI < fbIds.length; fbI++) {
    let id = fbIds[fbI]
    let size = FORFEIT_BORDERS[id]
    try {
      let level = server.getLevel(id)
      if (!level) { if (logAll) console.info(`forfeit_borders: ${id} not loaded`); continue }
      let b = level.getWorldBorder()
      if (Math.abs(b.getSize() - size) > 0.5 || b.getCenterX() != 0 || b.getCenterZ() != 0) {
        b.setCenter(0, 0)
        b.setSize(size)
        console.info(`forfeit_borders: ${id} border set to ${size}`)
      } else if (logAll) {
        console.info(`forfeit_borders: ${id} border is ${size}`)
      }
    } catch (err) {
      console.error(`forfeit_borders: ${id} failed: ${err}`)
    }
  }
}

ServerEvents.loaded(event => forfeitApplyBorders(event.server, true))

ServerEvents.tick(event => {
  if (event.server.tickCount % 1200 == 600) forfeitApplyBorders(event.server, false)
})
