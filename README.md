# worktreeguard

worktreeguard is a local-first CLI for leasing, inspecting, and releasing Git worktrees so coding agents do not collide in the same checkout.

It wraps `git worktree` with a small safety layer: predictable lanes, JSON lock metadata, dirty/stale/missing/unsafe worktree detection, and stable reports for humans and orchestrators.

## 60-second demo

```sh
git clone <repo> demo-repo
cd worktreeguard
node src/index.js lease ../demo-repo --task fix-login-timeout --base main
node src/index.js status ../demo-repo --format markdown
node src/index.js doctor ../demo-repo --json
node src/index.js release ../demo-repo fix-login-timeout --force
```

For a self-contained smoke test:

```sh
npm run smoke
```

## Install

```sh
npm install -g worktreeguard
worktreeguard --help
```

For local development from this repository:

```sh
npm install
npm test
bash scripts/validate.sh
```

## CLI reference

```sh
worktreeguard lease <repo> --task <slug> [--base main] [--root <dir>] [--json]
worktreeguard status [repo|--root <dir>] [--format text|json|markdown] [--json]
worktreeguard doctor <repo> [--format text|json|markdown] [--json]
worktreeguard release <repo> <task> [--pr <url>] [--force] [--json]
```

### `lease`

Creates a branch and worktree for a task. By default, lanes are created under a sibling `.worktrees` directory and branches use `agent/<task>`.

The command writes lock metadata in both places:

- `<repo>/.worktreeguard/leases/<task>.json`
- `<worktree>/.worktreeguard/lease.json`

### `status`

Inspects one repo or all immediate Git repos under `--root`. Reports active lanes and risk flags.

### `doctor`

Runs the same inspection for one repo and is intended as a gate before handoff or review.

### `release`

Archives the lease and removes the worktree. It refuses dirty worktrees unless `--force` is provided.

## Risk flags

- `dirty` — uncommitted files are present.
- `stale` — the lease expiry has passed.
- `missing-worktree` — a lock points at a path that no longer exists.
- `duplicate-branch` — multiple worktrees use the same branch.
- `missing-upstream` — the branch has no configured upstream.

## Output formats

Human text is the default. Use `--format markdown` for review packets and `--json` or `--format json` for automation.

```sh
worktreeguard status ./my-repo --format markdown
worktreeguard doctor ./my-repo --json
```

## Local-first safety model

- No hidden network calls in status, doctor, or release.
- `lease` tolerates offline use; best-effort fetch failures do not block local creation.
- No telemetry, hosted service, daemon, or background mutation.
- No dirty worktree removal without explicit `--force`.
- Obvious token-looking strings in command errors/status details are redacted.

## Non-goals

- No autonomous merge, rebase, publish, or PR creation.
- No deleting dirty worktrees by default.
- No credential discovery or environment dumping.
- No hosted coordinator in V1.

## Agent handoff

See [examples/agent-handoff.md](examples/agent-handoff.md) for a minimal orchestration flow. The intended pattern is:

1. lease an isolated lane for the agent,
2. run the agent inside that lane,
3. attach Markdown status for review,
4. attach JSON status to orchestration logs,
5. release only after work is clean or explicitly forced.

## Verify

```sh
npm test
npm run smoke
bash scripts/validate.sh
```

`scripts/validate.sh` checks required repo files and runs package scripts that exist. Missing optional `agent-qc` is treated as a skip, not a failure.

## Documentation

- [Product requirements](docs/PRD.md)
- [Task breakdown](docs/TASKS.md)
- [Orchestration plan](docs/ORCHESTRATION.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

MIT
