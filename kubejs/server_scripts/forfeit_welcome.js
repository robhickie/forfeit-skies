// Forfeit Skies welcome message, shown every time a player joins.
PlayerEvents.loggedIn(event => {
  const player = event.player
  const purple = (s) => Text.of(s).color(0x8E3FD1)
  const gray = (s) => Text.of(s).gray()
  player.tell(Text.of(''))
  player.tell(purple('✦ Forfeit Skies ✦').bold().append(gray('  welcome back, ').bold(false)).append(Text.of(player.username).white().bold(false)))
  player.tell(gray(' • New here? Open the ').append(purple('quest book')).append(gray(' (button in your inventory) to get started.')))
  player.tell(gray(' • Every mod is in the ').append(purple('Mod Book')).append(gray('. Lost it? Craft a book + compass.')))
  player.tell(gray(' • Daily restart 06:00 · Backups every 12h · Hold ').append(Text.of('`').white()).append(gray(' to vein-mine.')))
  player.tell(Text.of(''))
})
