// Forfeit Skies: cap natural hostile spawns in the overworld (Rob, 2026-11-22).
// Every 5 s count overworld monsters; while there are FORFEIT_MONSTER_LIMIT or more, natural monster spawns are skipped.
// Spawners, structures, raids, bosses, summons and spawn eggs are never blocked (only MobSpawnType NATURAL / CHUNK_GENERATION).
const FORFEIT_MONSTER_LIMIT = 120
let forfeitMonsterCount = 0
let forfeitMobLimitErrorLogged = false

ServerEvents.tick(event => {
  if (event.server.tickCount % 100 != 0) return
  try {
    let n = 0
    let forfeitMobIter = event.server.overworld().getAllEntities().iterator()
    while (forfeitMobIter.hasNext()) {
      let forfeitMobE = forfeitMobIter.next()
      if (forfeitMobE && forfeitMobE.isMonster()) n++
    }
    forfeitMonsterCount = n
  } catch (err) {
    if (!forfeitMobLimitErrorLogged) { console.error('forfeit_moblimit count failed: ' + err); forfeitMobLimitErrorLogged = true }
  }
})

EntityEvents.checkSpawn(event => {
  if (forfeitMonsterCount < FORFEIT_MONSTER_LIMIT) return
  const reason = String(event.type)
  if (reason != 'NATURAL' && reason != 'CHUNK_GENERATION') return
  if (String(event.level.dimension) != 'minecraft:overworld') return
  if (!event.entity.isMonster()) return
  event.cancel()
})
