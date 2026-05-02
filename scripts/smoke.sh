#!/usr/bin/env bash
set -euo pipefail
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
repo="$tmp/repo"
git init -b main "$repo" >/dev/null
git -C "$repo" config user.email smoke@example.com
git -C "$repo" config user.name Smoke
printf 'hello\n' > "$repo/README.md"
git -C "$repo" add README.md
git -C "$repo" commit -m init >/dev/null
node src/index.js lease "$repo" --task smoke --json >/tmp/worktreeguard-smoke.json
node src/index.js status "$repo" --format markdown | grep -q 'WorktreeGuard Report'
node src/index.js doctor "$repo" --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s); if(!j.lanes.some(l=>l.task==="smoke")) process.exit(1)})'
node src/index.js release "$repo" smoke --force >/dev/null
