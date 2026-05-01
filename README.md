# worktreeguard

worktreeguard leases, labels, audits, and releases Git worktrees so coding agents never collide in the same checkout.

## Status

This repository is an early StackForge scaffold. The public contract is the PRD-driven V1 described in `docs/PRD.md`; implementation should stay local-first, deterministic, and reviewable.

## What it will do

- Predictable worktree lanes for agent tasks.
- Lock metadata for owner, task, base branch, expiry, and PR links.
- Status and doctor reports for dirty, stale, orphaned, or conflicting lanes.
- Non-destructive release defaults that refuse dirty work unless forced.

## Install

```sh
npm install worktreeguard
```

For local development from this repository:

```sh
npm install
npm test
```

## CLI sketch

```sh
worktreeguard lease ./my-repo --task fix-login-timeout --base main
worktreeguard status --root ~/Developer/my-opensource
worktreeguard doctor ./my-repo
worktreeguard release fix-login-timeout --pr https://github.com/org/repo/pull/12
```

These commands describe the intended V1 interface from the PRD. Keep implementation changes aligned with `docs/TASKS.md` and update this section as behavior lands.

## Local-first safety

- No hidden network calls in core flows.
- No credential exfiltration or secret value printing.
- No destructive filesystem or Git operations without explicit user intent.
- Prefer deterministic JSON/Markdown output that agents and humans can review.

## Verify

Run the local validation script before opening a pull request:

```sh
npm test
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
