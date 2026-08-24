#!/usr/bin/env bash
set -euo pipefail

readonly REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_root="$(mktemp -d "${TMPDIR:-/tmp}/worktreeguard-install-docs.XXXXXX")"
trap 'rm -rf "$install_root"' EXIT

package_dir="$install_root/package"
prefix_dir="$install_root/prefix"
fixture_repo="$install_root/fixture-repo"
mkdir -p "$package_dir" "$fixture_repo"

tarball="$(cd "$package_dir" && npm pack "$REPOSITORY_ROOT" --silent)"
[ "$tarball" = 'worktreeguard-0.2.0.tgz' ]
if git -C "$REPOSITORY_ROOT" rev-parse --verify --quiet refs/tags/v0.2.0 >/dev/null; then
  echo 'release candidate tag v0.2.0 already exists' >&2
  exit 1
fi
npm install --global --prefix "$prefix_dir" "$package_dir/$tarball"

cli="$prefix_dir/bin/worktreeguard"
"$cli" --help | grep -Fq 'worktreeguard lease <repo>'
"$cli" --version | grep -Fxq 'v0.2.0'

grep -Fq 'worktreeguard release ./my-repo fix-login-timeout --pr https://github.com/org/repo/pull/12' "$REPOSITORY_ROOT/docs/PRD.md"
git -C "$fixture_repo" init --quiet
if "$cli" release "$fixture_repo" fix-login-timeout >"$install_root/release.out" 2>"$install_root/release.err"; then
  echo 'documented release invocation unexpectedly succeeded without a lease' >&2
  exit 1
fi
grep -Fq 'no lease found for fix-login-timeout' "$install_root/release.err"

echo "Packed CLI and documented release invocation passed"
