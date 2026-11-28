// Forfeit Skies: your grave keeps part of your XP.
// Vanilla drops at most 100 XP points as orbs on death and deletes the rest; GraveStone stores items only.
// Here, on death, GRAVE_XP_KEEP of your total XP points goes into your grave (no vanilla orbs drop) and the rest is lost.
// Breaking your own grave gives it back. If someone else (an admin) breaks it, the owner gets it on their next
// respawn/login. If no grave was placed (nothing to store), the share comes back on respawn instead.
// Stored in server.persistentData keyed by the grave's Death id, so it survives restarts, reloads and cloned graves.
const GRAVE_XP_KEEP = 0.5
const GRAVE_XP_STORE = 'forfeitGraveXp'          // deathId -> { owner, xp, t }
const GRAVE_XP_PENDING = 'forfeitGraveXpPending' // owner uuid -> points to give on respawn/login
const $GraveBlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const $GraveCompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')

const graveXpMsg = text => Text.of('[Forfeit Skies] ').darkPurple().append(Text.of(text).gray())

// Vanilla total XP points at the start of level L.
function graveXpForLevel(L) {
  if (L <= 16) return L * L + 6 * L
  if (L <= 31) return 2.5 * L * L - 40.5 * L + 360
  return 4.5 * L * L - 162.5 * L + 2220
}

function graveXpTotal(p) {
  const L = p.experienceLevel
  return Math.max(0, Math.floor(graveXpForLevel(L) + p.experienceProgress * p.getXpNeededForNextLevel()))
}

function graveXpStore(server, key) {
  return server.persistentData.getCompound(key) // a copy when missing: always put it back after changing
}

function graveXpOnline(server, uuid) {
  let found = null
  server.players.forEach(pl => { if (String(pl.uuid) === uuid) found = pl })
  return found
}

function graveXpAddPending(server, uuid, xp) {
  const pend = graveXpStore(server, GRAVE_XP_PENDING)
  pend.putInt(uuid, pend.getInt(uuid) + xp)
  server.persistentData.put(GRAVE_XP_PENDING, pend)
}

function graveXpPayPending(player) {
  const server = player.server
  const uuid = String(player.uuid)
  if (player.isDeadOrDying()) return // still on the death screen: wait for the respawn
  const pend = graveXpStore(server, GRAVE_XP_PENDING)
  if (!pend.contains(uuid)) return
  const xp = pend.getInt(uuid)
  pend.remove(uuid)
  server.persistentData.put(GRAVE_XP_PENDING, pend)
  if (xp > 0) {
    player.giveExperiencePoints(xp)
    player.tell(graveXpMsg(`You got ${xp} XP back from your grave.`))
  }
}

// GraveStone puts the grave in the death column (moved up to free space, or clamped to the build limits for void deaths).
function graveXpFindGrave(level, x, z, uuid, since) {
  let best = null
  const minY = level.getMinBuildHeight()
  const maxY = level.getMaxBuildHeight()
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let y = minY; y < maxY; y++) {
        const be = level.getBlockEntity(new $GraveBlockPos(x + dx, y, z + dz))
        if (!be || !be.getDeath) continue
        const death = be.getDeath()
        if (!death || String(death.getPlayerUUID()) !== uuid) continue
        const t = Number(death.getTimestamp())
        if (t < since) continue
        if (!best || t > best.t) best = { id: String(death.getId()), t: t }
      }
    }
  }
  return best
}

EntityEvents.death(event => {
  const p = event.entity
  if (!p.isPlayer() || p.isSpectator() || p.isCreative()) return
  const total = graveXpTotal(p)
  if (total <= 0) return
  const keep = Math.floor(total * GRAVE_XP_KEEP)
  const server = event.server
  const level = event.level
  const uuid = String(p.uuid)
  const x = Math.floor(p.x)
  const z = Math.floor(p.z)
  const since = Date.now() - 5000
  // Clear XP now so vanilla drops no orbs (it reads the level after this event).
  p.setExperienceLevels(0)
  p.setExperiencePoints(0)
  p.totalExperience = 0
  server.scheduleInTicks(1, () => {
    if (!p.isDeadOrDying()) { // another mod cancelled the death: give everything back
      p.giveExperiencePoints(total)
      return
    }
    if (keep <= 0) return
    const grave = graveXpFindGrave(level, x, z, uuid, since)
    if (grave) {
      const store = graveXpStore(server, GRAVE_XP_STORE)
      const entry = new $GraveCompoundTag()
      entry.putString('owner', uuid)
      entry.putInt('xp', keep)
      entry.putLong('t', Date.now())
      store.put(grave.id, entry)
      server.persistentData.put(GRAVE_XP_STORE, store)
      p.tell(graveXpMsg(`Your grave holds ${keep} of your ${total} XP points. Break it to get them back; the rest is lost.`))
    } else {
      graveXpAddPending(server, uuid, keep)
      p.tell(graveXpMsg(`No grave was placed, so you keep ${keep} of your ${total} XP points when you respawn.`))
    }
  })
})

BlockEvents.broken('gravestone:gravestone', event => {
  const be = event.block.entity
  if (!be || !be.getDeath) return
  const death = be.getDeath()
  if (!death) return
  const id = String(death.getId())
  const server = event.server
  if (!graveXpStore(server, GRAVE_XP_STORE).contains(id)) return
  const level = event.level
  const pos = event.block.pos
  const breaker = event.player ? String(event.player.uuid) : ''
  // Pay only once the grave is really gone (a claim mod may cancel the break).
  server.scheduleInTicks(1, () => {
    if (String(level.getBlock(pos).id) === 'gravestone:gravestone') return
    const store = graveXpStore(server, GRAVE_XP_STORE)
    if (!store.contains(id)) return
    const entry = store.getCompound(id)
    const owner = entry.getString('owner')
    const xp = entry.getInt('xp')
    store.remove(id)
    server.persistentData.put(GRAVE_XP_STORE, store)
    const ownerPlayer = graveXpOnline(server, owner)
    if (breaker === owner && ownerPlayer) {
      ownerPlayer.giveExperiencePoints(xp)
      ownerPlayer.tell(graveXpMsg(`You got ${xp} XP back from your grave.`))
    } else {
      graveXpAddPending(server, owner, xp)
      if (ownerPlayer && !ownerPlayer.isDeadOrDying()) graveXpPayPending(ownerPlayer)
    }
  })
})

PlayerEvents.respawned(event => graveXpPayPending(event.player))
PlayerEvents.loggedIn(event => graveXpPayPending(event.player))
