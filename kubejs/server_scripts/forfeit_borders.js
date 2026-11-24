// Forfeit Skies: per-dimension world borders (Rob, 2026-11-24).
// Vanilla has ONE border (the overworld's, set with /worldborder) and copies it into every other dimension.
// This script gives the other dimensions their own size, matched to what has been pre-generated (minus a 128-block margin),
// and re-applies it every minute in case the overworld border changes (that change is copied to every dimension again).
// The overworld border itself is still set with /worldborder (it is saved in level.dat).
// Sizes are full widths in blocks, centred on 0,0.
const FORFEIT_BORDERS = {
  'minecraft:the_nether': 3840,          // pre-generated to ±2048
  'minecraft:the_end': 3840,             // not pre-generated yet; no way in
  'aether:the_aether': 3840,             // pre-generated to ±2048
  'undergarden:undergarden': 1792,       // pre-generated to ±1024
  'deeperdarker:otherside': 1792,
  'the_bumblezone:the_bumblezone': 1792,
  'divinerpg:eden': 1792, 'divinerpg:wildwood': 1792, 'divinerpg:apalachia': 1792, 'divinerpg:skythern': 1792,
  'divinerpg:mortum': 1792, 'divinerpg:iceika': 1792, 'divinerpg:arcana': 1792, 'divinerpg:vethea': 1792,
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
