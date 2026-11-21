// Forfeit Skies: players can't be hurt while their game is still loading in after joining.
// Joining can take 10+ seconds on this pack (the server freezes loading advancements), and mobs were killing people
// before their screen even appeared. Protection lasts until the player first moves (after a 3 s grace) or 60 s, whichever is first.
// Void damage and /kill still go through, so nobody gets stuck alive in the void.
const forfeitJoinProtect = {}
const JOIN_PROTECT_MAX_TICKS = 1200 // 60 s
const JOIN_PROTECT_MIN_TICKS = 60   // 3 s before moving can end it
const JOIN_PROTECT_ALWAYS = ['outOfWorld', 'genericKill'] // damage msgIds: void, /kill

PlayerEvents.loggedIn(event => {
  const p = event.player
  forfeitJoinProtect[String(p.uuid)] = { tick: event.server.tickCount, x: p.x, z: p.z }
})

PlayerEvents.loggedOut(event => {
  delete forfeitJoinProtect[String(event.player.uuid)]
})

EntityEvents.beforeHurt(event => {
  const e = event.entity
  if (!e.isPlayer()) return
  const key = String(e.uuid)
  const s = forfeitJoinProtect[key]
  if (!s) return
  if (JOIN_PROTECT_ALWAYS.indexOf(String(event.source.getMsgId())) >= 0) return
  const elapsed = e.server.tickCount - s.tick
  const moved = Math.hypot(e.x - s.x, e.z - s.z) > 1.5
  if (elapsed > JOIN_PROTECT_MAX_TICKS || (elapsed >= JOIN_PROTECT_MIN_TICKS && moved)) {
    delete forfeitJoinProtect[key]
    return
  }
  event.cancel()
})
