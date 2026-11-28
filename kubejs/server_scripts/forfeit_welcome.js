// Forfeit Skies welcome message, shown every time a player joins.
PlayerEvents.loggedIn(event => {
  const player = event.player
  const purple = (s) => Text.of(s).color(0x8E3FD1)
  const gray = (s) => Text.of(s).gray()
  player.tell(Text.of(''))
  player.tell(purple('✦ Forfeit Skies ✦').bold().append(gray('  welcome back, ').bold(false)).append(Text.of(player.username).white().bold(false)))
  player.tell(gray(' • The world is ').append(purple('floating islands')).append(gray(' over the void. Mind the edge: build bridges, grapple, or build an airship.')))
  player.tell(gray(' • New here? Open the ').append(purple('quest book')).append(gray(' (button in your inventory). Every guide is in your ')).append(purple('Akashic Tome')).append(gray('.')))
  player.tell(gray(' • See your airship from far away: look at it and type ').append(Text.of('/ssrd forceload add @v').white()).append(gray(' (one ship each please, it keeps it loaded all the time). Undo: ')).append(Text.of('/ssrd forceload remove @v').white()).append(gray('.')))
  player.tell(gray(' • Name your airship: look at it (or stand on it) and type ').append(Text.of('/shipname <name>').white()).append(gray('. If you die on it, your grave stays on the ship.')))
  player.tell(gray(' • Restarts every 6 hours (with warnings) · Backups every 12h · Hold ').append(Text.of('`').white()).append(gray(' to vein-mine.')))
  player.tell(Text.of(''))
})
