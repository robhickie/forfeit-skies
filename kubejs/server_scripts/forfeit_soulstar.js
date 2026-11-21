// Forfeit Skies: throwing a Bosses of Mass Destruction Soul Star makes the server search the whole world for the nearest
// Lich tower (like an Eye of Ender). On our island world that search froze the server for ~3 minutes (21 Nov 2026).
// Cancel the throw. Using a Soul Star on the Lich altar (a block click) still works, so the boss can still be summoned.
ItemEvents.rightClicked('bosses_of_mass_destruction:soul_star', event => {
  event.player.tell(Text.of('Soul Stars can\'t be thrown on this server (the tower search freezes everyone). Find Lich towers by exploring, then use the star on the altar.').color(0xC78BFF))
  event.cancel()
})
