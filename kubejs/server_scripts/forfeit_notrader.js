// Forfeit Skies: no Wandering Traders (2026-11-24).
// Their trades include Goety's "treasure map" offer, which searches for a Goety Wind Shrine when the offers are
// generated (Quark's Pathfinder Maps generates them on the trader's first tick). On the sky islands that search ran
// over 5 minutes on the main thread: watchdog crash, and a crash loop because the trader is still there after restart.
// Cancelling the spawn also removes traders that are loaded from saved chunks, before they tick.
EntityEvents.spawned('minecraft:wandering_trader', event => {
  event.cancel()
})
EntityEvents.spawned('minecraft:trader_llama', event => {
  event.cancel()
})
