// Forfeit Skies: your grave keeps part of your XP.
// Vanilla drops at most 100 XP points as orbs on death and deletes the rest; GraveStone stores items only.
// Here, on death, GRAVE_XP_KEEP of your total XP points goes into your grave (no vanilla orbs drop) and the rest is lost.
// Breaking your own grave gives it back. If someone else (an admin) breaks it, the owner gets it on their next
// respawn/login. If no grave was placed (nothing to store), the share comes back on respawn instead.
// On death the player is also told the grave's coordinates, and a grave with no items in it is removed.
// Stored in server.persistentData keyed by the grave's Death id, so it survives restarts, reloads and cloned graves.
const GRAVE_XP_KEEP = 0.5
const GRAVE_XP_STORE = 'forfeitGraveXp'          // deathId -> { owner, xp, t }
const GRAVE_XP_PENDING = 'forfeitGraveXpPending' // owner uuid -> points to give on respawn/login
const $GraveBlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const $GraveCompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')

const graveXpMsg = text => Text.of('[Forfeit Skies] ').darkPurple().append(Text.of(text).gray())
function graveXpTell(player, text) {
  console.info('[gravexp] ' + player.username + ': ' + text)
  player.tell(graveXpMsg(text))
}

// Vanilla total XP points at the start of level L.
function graveXpForLevel(L) {
  if (L <= 16) return L * L + 6 * L
  if (L <= 31) return 2.5 * L * L - 40.5 * L + 360
  return 4.5 * L * L - 162.5 * L + 2220
}

function graveXpTotal(p) {
  let L = p.experienceLevel
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
  let pend = graveXpStore(server, GRAVE_XP_PENDING)
  pend.putInt(uuid, pend.getInt(uuid) + xp)
  server.persistentData.put(GRAVE_XP_PENDING, pend)
}

function graveXpPayPending(player) {
  let server = player.server
  let uuid = String(player.uuid)
  if (player.isDeadOrDying()) return // still on the death screen: wait for the respawn
  let pend = graveXpStore(server, GRAVE_XP_PENDING)
  if (!pend.contains(uuid)) return
  let xp = pend.getInt(uuid)
  pend.remove(uuid)
  server.persistentData.put(GRAVE_XP_PENDING, pend)
  if (xp > 0) {
    player.giveExperiencePoints(xp)
    graveXpTell(player, `You got ${xp} XP back from your grave.`)
  }
}

// A grave holding nothing but obituary books (GraveStone gives one per death) counts as empty.
function graveXpOnlyObituaries(death) {
  let items = death.getAllItems()
  for (let i = 0; i < items.size(); i++) {
    let stack = items.get(i)
    if (!stack.isEmpty() && String(stack.id) !== 'gravestone:obituary') return false
  }
  return true
}

// GraveStone puts the grave in the death column (moved up to free space, or clamped to the build limits for void deaths).
function graveXpFindGrave(level, x, z, uuid, since) {
  let best = null
  let minY = level.getMinBuildHeight()
  let maxY = level.getMaxBuildHeight()
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let y = minY; y < maxY; y++) {
        let pos = new $GraveBlockPos(x + dx, y, z + dz)
        let be = level.getBlockEntity(pos)
        if (!be || !be.getDeath) continue
        let death = be.getDeath()
        if (!death || String(death.getPlayerUUID()) !== uuid) continue
        let t = Number(death.getTimestamp())
        if (t < since) continue
        if (!best || t > best.t) best = { id: String(death.getId()), t: t, pos: pos, empty: graveXpOnlyObituaries(death) }
      }
    }
  }
  return best
}

// GraveStone always places a grave, even with nothing in it: remove empty ones (keeping water if it was waterlogged).
function graveXpRemoveEmpty(level, pos) {
  let block = level.getBlock(pos)
  let wet = String(block.blockState).indexOf('waterlogged=true') >= 0
  block.set(wet ? 'minecraft:water' : 'minecraft:air')
}

function graveXpWhere(level, pos) {
  let d = level.dimension
  let dim = String(d && d.location ? d.location() : d)
  let where = `${pos.getX()} ${pos.getY()} ${pos.getZ()}`
  return dim === 'minecraft:overworld' ? where : `${where} (${dim})`
}

EntityEvents.death(event => {
  let p = event.entity
  if (!p.isPlayer() || p.isSpectator() || p.isCreative()) return
  let total = graveXpTotal(p)
  let keep = Math.floor(total * GRAVE_XP_KEEP)
  let server = event.server
  let level = event.level
  let uuid = String(p.uuid)
  let x = Math.floor(p.x)
  let z = Math.floor(p.z)
  let since = Date.now() - 5000
  // Clear XP now so vanilla drops no orbs (it reads the level after this event).
  if (total > 0) {
    p.setExperienceLevels(0)
    p.setExperiencePoints(0)
    p.totalExperience = 0
  }
  server.scheduleInTicks(1, () => {
    if (!p.isDeadOrDying()) { // another mod cancelled the death: give everything back
      if (total > 0) p.giveExperiencePoints(total)
      return
    }
    let grave = graveXpFindGrave(level, x, z, uuid, since)
    if (grave && grave.empty) {
      graveXpRemoveEmpty(level, grave.pos)
      if (keep > 0) {
        graveXpAddPending(server, uuid, keep)
        graveXpTell(p, `You had no items, so no grave was left. You keep ${keep} of your ${total} XP points when you respawn.`)
      } else {
        graveXpTell(p, 'You had no items, so no grave was left.')
      }
      return
    }
    if (grave) {
      let where = graveXpWhere(level, grave.pos)
      if (keep > 0) {
        let store = graveXpStore(server, GRAVE_XP_STORE)
        let entry = new $GraveCompoundTag()
        entry.putString('owner', uuid)
        entry.putInt('xp', keep)
        entry.putLong('t', Date.now())
        store.put(grave.id, entry)
        server.persistentData.put(GRAVE_XP_STORE, store)
        graveXpTell(p, `Your grave is at ${where}. It holds your items and ${keep} of your ${total} XP points; break it to get them back. The rest of the XP is lost.`)
      } else {
        graveXpTell(p, `Your grave is at ${where}.`)
      }
      return
    }
    if (keep > 0) {
      graveXpAddPending(server, uuid, keep)
      graveXpTell(p, `No grave was placed, so you keep ${keep} of your ${total} XP points when you respawn.`)
    }
  })
})

BlockEvents.broken('gravestone:gravestone', event => {
  let be = event.block.entity
  if (!be || !be.getDeath) return
  let death = be.getDeath()
  if (!death) return
  let id = String(death.getId())
  let server = event.server
  if (!graveXpStore(server, GRAVE_XP_STORE).contains(id)) return
  let level = event.level
  let pos = event.block.pos
  let breaker = event.player ? String(event.player.uuid) : ''
  // Pay only once the grave is really gone (a claim mod may cancel the break).
  server.scheduleInTicks(1, () => {
    if (String(level.getBlock(pos).id) === 'gravestone:gravestone') return
    let store = graveXpStore(server, GRAVE_XP_STORE)
    if (!store.contains(id)) return
    let entry = store.getCompound(id)
    let owner = entry.getString('owner')
    let xp = entry.getInt('xp')
    store.remove(id)
    server.persistentData.put(GRAVE_XP_STORE, store)
    let ownerPlayer = graveXpOnline(server, owner)
    if (breaker === owner && ownerPlayer) {
      ownerPlayer.giveExperiencePoints(xp)
      graveXpTell(ownerPlayer, `You got ${xp} XP back from your grave.`)
    } else {
      graveXpAddPending(server, owner, xp)
      if (ownerPlayer && !ownerPlayer.isDeadOrDying()) graveXpPayPending(ownerPlayer)
    }
  })
})

PlayerEvents.respawned(event => graveXpPayPending(event.player))
PlayerEvents.loggedIn(event => graveXpPayPending(event.player))
