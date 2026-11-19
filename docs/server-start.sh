#!/bin/bash
# Forfeit Skies: sync the pack from GitHub (exact latest commit, so never a stale cache), then start NeoForge.
cd /home/container
REPO=robhickie/forfeit-skies
SHA=$(curl -fsS -m 15 "https://api.github.com/repos/$REPO/commits/main" -H "Accept: application/vnd.github.sha" 2>/dev/null)
if [[ "$SHA" =~ ^[0-9a-f]{40}$ ]]; then REF=$SHA; else REF=main; echo "[Forfeit Skies] Could not get latest commit, using main"; fi
echo "[Forfeit Skies] Syncing pack @ ${REF:0:7}..."
java -jar packwiz-installer-bootstrap.jar -g -s server "https://raw.githubusercontent.com/$REPO/$REF/pack.toml" || echo "[Forfeit Skies] WARNING: pack sync failed, starting with current mods"
echo "[Forfeit Skies] Starting server..."
exec java -Xms2G -XX:MaxRAMPercentage=90.0 -Dterminal.jline=false -Dterminal.ansi=true @libraries/net/neoforged/neoforge/21.1.267/unix_args.txt nogui
