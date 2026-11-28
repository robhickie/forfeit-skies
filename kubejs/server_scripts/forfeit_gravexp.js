// Forfeit Skies: your grave keeps part of your XP.
// Vanilla drops at most 100 XP points as orbs on death and deletes the rest; GraveStone stores items only.
// Here, on death, GRAVE_XP_KEEP of your total XP points goes into your grave (no vanilla orbs drop) and the rest is lost.
// Breaking your own grave gives it back. If someone else (an admin) breaks it, the owner gets it on their next
// respawn/login. Only if GraveStone could not place a grave at all does the share come back on respawn instead.
// On death the player is told the grave's coordinates. A grave with no items keeps the XP on its own; a grave with
// no items and no XP (obituary books don't count) is removed.
// Stored in server.persistentData keyed by the grave's Death id, so it survives restarts, reloads and cloned graves.
const GRAVE_XP_KEEP = 0.5
const GRAVE_XP_STORE = 'forfeitGraveXp'          // deathId -> { owner, xp, t }
const GRAVE_XP_PENDING = 'forfeitGraveXpPending' // owner uuid -> points to give on respawn/login
const $GraveBlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const $GraveCompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
const $GraveNbtUtils = Java.loadClass('net.minecraft.nbt.NbtUtils')
const $GraveUtils = Java.loadClass('de.maxhenkel.gravestone.GraveUtils')
// Sable airships live in their own block space; gravestone_sable_compat puts the grave there (ship-local position).
let $GraveSable = null
try { $GraveSable = Java.loadClass('dev.ryanhcode.sable.companion.SableCompanion') } catch (e) { console.warn('[gravexp] Sable not found: ' + e) }

// Where GraveStone (with gravestone_sable_compat) will look: the ship-local block position when the player is on a ship.
function graveXpDeathSpot(p) {
  let pos = $GraveBlockPos.containing(p.position())
  let ship = null
  try {
    let sub = $GraveSable ? $GraveSable.INSTANCE.getTrackingOrVehicleSubLevel(p) : null
    if (sub) {
      pos = $GraveBlockPos.containing(sub.logicalPose().transformPositionInverse(p.position()))
      let name = sub.getName()
      ship = name ? `the airship "${name}"` : 'your airship'
    }
  } catch (e) { console.error('[gravexp] ship lookup failed: ' + e) }
  return { x: pos.getX(), y: pos.getY(), z: pos.getZ(), ship: ship }
}

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

function graveXpDim(level) {
  let d = level.dimension
  return String(d && d.location ? d.location() : d)
}

// GraveStone places no grave when there are no items to keep. Then we place one ourselves, on the spot GraveStone
// would pick and with the NBT layout it writes, so the XP still waits in a grave. Returns { id, pos, empty } or null.
function graveXpPlaceGrave(server, level, p, x, y, z) {
  try {
    let gpos = $GraveUtils.getGraveStoneLocation(level, new $GraveBlockPos(x, y, z))
    if (!gpos) return null
    let r = () => Math.floor(Math.random() * 4294967296) - 2147483648
    let owner = String($GraveNbtUtils.createUUID(p.uuid))
    let facing = 'north'
    try { facing = String(p.getDirection().getOpposite().getSerializedName()) } catch (e) {}
    let death = `{Id:[I;${r()},${r()},${r()},${r()}],PlayerUuid:${owner},PlayerName:"${p.username}",` +
      `Timestamp:${Date.now()}L,PosX:${p.x}d,PosY:${p.y}d,PosZ:${p.z}d,Dimension:"${graveXpDim(level)}",` +
      `MainInventory:[],ArmorInventory:[],OffHandInventory:[]}`
    server.runCommandSilent(`execute in ${graveXpDim(level)} run setblock ${gpos.getX()} ${gpos.getY()} ${gpos.getZ()} ` +
      `gravestone:gravestone[facing=${facing}]{Death:${death}}`)
    let be = level.getBlockEntity(gpos)
    if (!be || !be.getDeath || !be.getDeath()) return null
    return { id: String(be.getDeath().getId()), pos: gpos, empty: true }
  } catch (e) {
    console.error('[gravexp] could not place an XP grave: ' + e)
    return null
  }
}

function graveXpWhere(level, pos) {
  let dim = graveXpDim(level)
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
  let spot = graveXpDeathSpot(p) // ship-local when dying on an airship
  let x = spot.x
  let y = spot.y
  let z = spot.z
  let worldWhere = graveXpWhere(level, $GraveBlockPos.containing(p.position()))
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
    if (!grave && keep > 0) grave = graveXpPlaceGrave(server, level, p, x, y, z)
    if (grave && grave.empty && keep <= 0) { // nothing to keep at all: no grave
      graveXpRemoveEmpty(level, grave.pos)
      graveXpTell(p, 'You had no items or XP, so no grave was left.')
      return
    }
    if (grave) {
      let holds = grave.empty ? 'It holds' : 'It holds your items and'
      let where = spot.ship ? `on ${spot.ship}, near ${worldWhere}` : `at ${graveXpWhere(level, grave.pos)}`
      if (keep > 0) {
        let store = graveXpStore(server, GRAVE_XP_STORE)
        let entry = new $GraveCompoundTag()
        entry.putString('owner', uuid)
        entry.putInt('xp', keep)
        entry.putLong('t', Date.now())
        store.put(grave.id, entry)
        server.persistentData.put(GRAVE_XP_STORE, store)
        graveXpTell(p, `Your grave is ${where}. ${holds} ${keep} of your ${total} XP points; break it to get them back. The rest of the XP is lost.`)
      } else {
        graveXpTell(p, `Your grave is ${where}.`)
      }
      return
    }
    if (keep > 0) {
      graveXpAddPending(server, uuid, keep)
      graveXpTell(p, `No grave could be placed, so you keep ${keep} of your ${total} XP points when you respawn.`)
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
  let stored = graveXpStore(server, GRAVE_XP_STORE).contains(id)
  console.info('[gravexp] grave ' + id + ' stored XP: ' + stored)
  if (!stored) return
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
