#!/usr/bin/env bash
set -euo pipefail

readonly REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_root="$(mktemp -d "${TMPDIR:-/tmp}/worktreeguard-install-docs.XXXXXX")"
trap 'rm -rf "$install_root"' EXIT

npm install --global --prefix "$install_root" "$REPOSITORY_ROOT"
"$install_root/bin/worktreeguard" --help | grep -Fq 'worktreeguard lease <repo>'

echo "Documented source install passed: worktreeguard --help"
