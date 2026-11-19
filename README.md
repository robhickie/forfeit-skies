# Forfeit Skies

A Minecraft 1.21.1 (NeoForge) modpack for the Forfeit crew: **Create + Create Aeronautics** airships,
**magic** (Ars Nouveau, Iron's Spells, Occultism) and **tech** (Mekanism, Applied Energistics 2),
with exploration, dungeons and new mobs.

## How to play (first time only)

1. Install [Prism Launcher](https://prismlauncher.org/) and sign in with your Microsoft account.
2. Download **`Forfeit-Skies-Prism.zip`** from the [Releases page](../../releases/latest).
3. In Prism: **Add Instance → Import → choose the zip → OK**.
4. Select the instance, **Edit → Settings → Memory**, set Maximum memory to **8192 MB** (6144 minimum).
5. Press **Launch**. The first launch downloads all the mods (a minute or two).
6. Multiplayer → Add Server → ask in Discord for the address.

## Updates

Nothing to do. Every time you press **Launch**, the pack checks this repo and downloads any changes
before the game starts. If you're ever told your mods don't match the server, just close the game and launch again.

## For the pack maintainer

The pack is managed with [packwiz](https://packwiz.infra.link/). Mod metadata lives in `mods/*.pw.toml`.

```bash
packwiz modrinth add <slug>     # add a mod
packwiz update --all            # update everything
packwiz remove <slug>
packwiz refresh                 # after editing config files
# bump `version` in pack.toml, commit, push. Then restart the server: it syncs on start.
```
