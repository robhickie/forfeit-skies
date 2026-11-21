// Forfeit Skies: run Chunky pre-generation only while nobody is online.
// - Anyone joins: Chunky pauses at once.
// - Server empty for 5 minutes: `chunky continue`, then `save-all flush` every minute while it runs
//   (Chunky outpaces chunk saving; without the flush the unload backlog swamps the main thread within minutes).
// - Nothing to continue (task finished or none started): Chunky just says so, nothing happens.
// Start a new area with e.g. `chunky radius 4500` + `chunky start` while nobody is on; this script carries it on.
let forfeitIdleMinutes = 0
let forfeitPregenRunning = false
// Distant Horizons is client-only again (2026-11-21), so idle pre-generation is back on.
// Set to true only if Distant Horizons is removed from the server again (or Chunky is replaced).
const FORFEIT_IDLE_PREGEN_ENABLED = true

ServerEvents.tick(event => {
  const server = event.server
  if (server.tickCount % 1200 != 0) return // once a minute
  if (server.playerList.playerCount > 0) {
    // Anyone online: make sure Chunky is paused, however it was started (by this script or by hand).
    forfeitIdleMinutes = 0
    server.runCommandSilent('chunky pause')
    forfeitPregenRunning = false
    return
  }
  if (!FORFEIT_IDLE_PREGEN_ENABLED) return
  forfeitIdleMinutes++
  if (forfeitIdleMinutes < 5) return
  if (!forfeitPregenRunning) {
    server.runCommandSilent('chunky continue')
    forfeitPregenRunning = true
  } else {
    server.runCommandSilent('save-all flush')
  }
})

PlayerEvents.loggedIn(event => {
  // Always pause on join, even if Chunky was started by hand (not by this script): generation + players + Distant Horizons don't mix.
  forfeitIdleMinutes = 0
  event.server.runCommandSilent('chunky pause')
  forfeitPregenRunning = false
})
