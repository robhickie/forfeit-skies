// Forfeit Skies: /shipname <name> lets anyone name the airship they are looking at (or standing on).
// /sable is op-only (permission level 2), so this runs `sable name set @v "<name>"` from the player's own position
// and view with level 2 for that one command. Sable's own success/failure message goes back to the player.
// Commands are registered at server start: a new or changed command needs a restart, not just a script reload.
const SHIPNAME_MAX = 32

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event
  event.register(Commands.literal('shipname')
    .executes(ctx => {
      ctx.source.sendSystemMessage(Text.of('Look at your airship (or stand on it) and type /shipname <name>').gray())
      return 1
    })
    .then(Commands.argument('name', Arguments.GREEDY_STRING.create(event))
      .executes(ctx => {
        const player = ctx.source.player
        if (!player) return 0
        let name = String(Arguments.GREEDY_STRING.getResult(ctx, 'name'))
          .replace(/§./g, '').replace(/[\\"]/g, '').trim().substring(0, SHIPNAME_MAX)
        if (!name) {
          player.tell(Text.of('Give the ship a name, e.g. /shipname The Lark').gray())
          return 0
        }
        const src = player.createCommandSourceStack().withPermission(2)
        player.server.getCommands().performPrefixedCommand(src, `sable name set @v "${name}"`)
        console.info(`[shipname] ${player.username} named a ship "${name}"`)
        return 1
      })))
})
