// Forfeit Skies: keep player save files small.
// Quark's Automatic Recipe Unlock grants all ~31,500 recipes on every login (we keep it on because it also stops
// thousands of recipe advancements loading, which makes joins slower). That bloats every player file to ~2.7 MB and
// made each 5-minute autosave freeze the server for ~2 s. JEI shows every recipe anyway, so empty the vanilla
// recipe book a few seconds after each login.
PlayerEvents.loggedIn(event => {
  const name = event.player.username
  event.server.scheduleInTicks(100, () => {
    event.server.runCommandSilent(`recipe take ${name} *`)
  })
})
