// Forfeit Skies: cap natural spawns in the overworld (Rob, 2026-11-22; ambient caps 2026-11-24).
// Every 5 s count overworld monsters and a few decorative mob types; while a count is at its cap, natural spawns of that kind
// are skipped. Spawners, structures, raids, bosses, summons, breeding and spawn eggs are never blocked
// (only MobSpawnType NATURAL / CHUNK_GENERATION).
const FORFEIT_MONSTER_LIMIT = 120
// Decorative mobs that pile up with many spread-out players (they cost tick time and do nothing).
const FORFEIT_TYPE_LIMITS = {
  'naturalist:butterfly': 15,
  'naturalist:bird': 15,
  'vampirism:blinding_bat': 10,
  'naturalist:whale': 2           // 7 whales were 3.5% of tick time (2026-11-24)
}
// Nether caps (counted in the Nether only). Striders kept respawning around the Nether hub: 1 -> 94 in under 3 minutes.
const FORFEIT_NETHER_LIMITS = {
  'minecraft:strider': 12,
  'alexsmobs:laviathan': 4        // big multi-part lava mobs
}
let forfeitNetherCounts = {}
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
    let ncounts = {}
    let forfeitNetherIter = event.server.getLevel('minecraft:the_nether').getAllEntities().iterator()
    while (forfeitNetherIter.hasNext()) {
      let forfeitNetherE = forfeitNetherIter.next()
      if (!forfeitNetherE) continue
      let forfeitNetherT = String(forfeitNetherE.type)
      if (FORFEIT_NETHER_LIMITS[forfeitNetherT] !== undefined) ncounts[forfeitNetherT] = (ncounts[forfeitNetherT] || 0) + 1
    }
    forfeitNetherCounts = ncounts
  } catch (err) {
    if (!forfeitMobLimitErrorLogged) { console.error('forfeit_moblimit count failed: ' + err); forfeitMobLimitErrorLogged = true }
  }
})

EntityEvents.checkSpawn(event => {
  const reason = String(event.type)
  if (reason != 'NATURAL' && reason != 'CHUNK_GENERATION') return
  const dim = String(event.level.dimension)
  const t = String(event.entity.type)
  if (dim == 'minecraft:the_nether') {
    const ncap = FORFEIT_NETHER_LIMITS[t]
    if (ncap !== undefined && (forfeitNetherCounts[t] || 0) >= ncap) event.cancel()
    return
  }
  if (dim != 'minecraft:overworld') return
  const cap = FORFEIT_TYPE_LIMITS[t]
  if (cap !== undefined) {
    if ((forfeitTypeCounts[t] || 0) >= cap) event.cancel()
    return
  }
  if (forfeitMonsterCount >= FORFEIT_MONSTER_LIMIT && event.entity.isMonster()) event.cancel()
})

// Striders never despawn, and Nether chunk generation (pre-generation!) spawned groups of them on every lava lake, so each
// Nether area a player visits loads dozens of stored striders. Over the cap, unsaddled striders loading in are dropped.
EntityEvents.spawned('minecraft:strider', event => {
  if ((forfeitNetherCounts['minecraft:strider'] || 0) < FORFEIT_NETHER_LIMITS['minecraft:strider']) return
  const e = event.entity
  try { if (e.isSaddled() || e.isVehicle() || e.hasCustomName()) return } catch (err) { return }
  event.cancel()
})
