// Forfeit Skies: cap natural spawns in the overworld (Rob, 2026-11-22; ambient caps 2026-11-24).
// Every 5 s count overworld monsters and a few decorative mob types; while a count is at its cap, natural spawns of that kind
// are skipped. Spawners, structures, raids, bosses, summons, breeding and spawn eggs are never blocked
// (only MobSpawnType NATURAL / CHUNK_GENERATION).
const FORFEIT_MONSTER_LIMIT = 120
// Decorative mobs that pile up with many spread-out players (they cost tick time and do nothing).
const FORFEIT_TYPE_LIMITS = {
  'naturalist:butterfly': 15,
  'naturalist:bird': 15,
  'vampirism:blinding_bat': 10
}
let forfeitMonsterCount = 0
let forfeitTypeCounts = {}
let forfeitMobLimitErrorLogged = false

ServerEvents.tick(event => {
  if (event.server.tickCount % 100 != 0) return
  try {
    let n = 0
    let counts = {}
    let forfeitMobIter = event.server.overworld().getAllEntities().iterator()
    while (forfeitMobIter.hasNext()) {
      let forfeitMobE = forfeitMobIter.next()
      if (!forfeitMobE) continue
      if (forfeitMobE.isMonster()) n++
      let forfeitMobT = String(forfeitMobE.type)
      if (FORFEIT_TYPE_LIMITS[forfeitMobT] !== undefined) counts[forfeitMobT] = (counts[forfeitMobT] || 0) + 1
    }
    forfeitMonsterCount = n
    forfeitTypeCounts = counts
  } catch (err) {
    if (!forfeitMobLimitErrorLogged) { console.error('forfeit_moblimit count failed: ' + err); forfeitMobLimitErrorLogged = true }
  }
})

EntityEvents.checkSpawn(event => {
  const reason = String(event.type)
  if (reason != 'NATURAL' && reason != 'CHUNK_GENERATION') return
  if (String(event.level.dimension) != 'minecraft:overworld') return
  const t = String(event.entity.type)
  const cap = FORFEIT_TYPE_LIMITS[t]
  if (cap !== undefined) {
    if ((forfeitTypeCounts[t] || 0) >= cap) event.cancel()
    return
  }
  if (forfeitMonsterCount >= FORFEIT_MONSTER_LIMIT && event.entity.isMonster()) event.cancel()
})
