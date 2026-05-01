# PRD: worktreeguard

Status: ready
Decision: build now

## Scorecard

Total: 91/100
Band: build now
Last scored: 2026-05-02
Scored by: Atlas

| Criterion | Points | Notes |
|---|---:|---|
| Problem pain | 19/20 | Clear pain in high-throughput agentic development workflows. |
| Demand signal | 18/20 | Strong internal OSS sprint need plus adjacent public tooling demand. |
| V1 buildability | 19/20 | Feasible as a deterministic local-first CLI with fixtures and smoke tests. |
| Differentiation | 13/15 | Focused on agent handoff/review gaps rather than broad platform replacement. |
| Agentic workflow leverage | 15/15 | Directly improves agent dispatch, supervision, verification, or handoff quality. |
| Distribution potential | 7/10 | Easy to demo with real repo/PR workflows and build-in-public examples. |

## Pitch

A local-first CLI that leases, labels, audits, and cleans git worktrees so coding agents never collide in the same checkout.

## Why It Matters

Agent throughput depends on isolated lanes. Humans and agents still create ad-hoc worktrees, forget branches, reuse dirty folders, and accidentally mix tasks. WorktreeGuard makes workspace isolation a visible, deterministic primitive before an orchestrator dispatches work.

## Qualification

### Pub Test

“A local-first CLI that leases, labels, audits, and cleans git worktrees so coding agents never collide in the same checkout.” is understandable in one sentence by a developer who has used coding agents, CI, or multi-branch OSS workflows.

### Competitors / Adjacent Tools

- git worktree — powerful primitive, but no task leases, stale-lane audit, or agent-safe policy layer.
- git-town / gh-stack style workflows — useful branch helpers, but not focused on concurrent agent lanes.
- CrewCmd/OpenClaw ad-hoc worktree conventions — prove the pain and give V1 fixtures.

### Star / Demand Signal

Agent coding workflows, CI-heavy repos, and local OSS factories repeatedly need better proof, isolation, reproducibility, and review affordances. The recent sprint pipeline already has `repoctx`, `taskbrief`, `branchbrief`, `qualitygate`, `prpack`, `tooltrace`, `stackforge`, and `crewcmd`; this idea fills a neighboring gap without replacing those projects.

### Real Problem

Roger's OSS sprint is pushing multiple agents, repos, branches, checks, and handoffs at once. This project removes one recurring source of ambiguity or failure from that pipeline while remaining useful to any developer team adopting coding agents.

### V1 Buildability

V1 can be implemented as a TypeScript CLI using deterministic filesystem/git/process operations, fixture repos, and Markdown/JSON output. It does not require a hosted backend, hidden LLM calls, or privileged credentials.

## V1 Scope

- `worktreeguard lease <repo> --task <slug>` creates a branch + worktree under a predictable root.
- Lock file with owner, task, base branch, expiry, and PR link fields.
- `status` shows active, dirty, stale, and blocked lanes across repos.
- `release` refuses dirty/unpushed work unless explicit `--force`.
- `doctor` detects duplicate branch use, missing upstreams, orphaned worktrees, and stale locks.
- Markdown/JSON report for orchestrator handoff.

## Out of Scope

- No autonomous merge/rebase decisions.
- No background daemon in V1.
- No deleting dirty worktrees without explicit force.

## CLI/API Sketch

```bash
worktreeguard lease ./my-repo --task fix-login-timeout --base main
worktreeguard status --root ~/Developer/my-opensource
worktreeguard doctor ./my-repo
worktreeguard release fix-login-timeout --pr https://github.com/org/repo/pull/12
```

## Verification

- Fixture repo tests for lease/status/release flows.
- Dirty worktree refusal tests.
- JSON schema snapshot for status report.
- Shell smoke test with real `git worktree` commands in temp dirs.

## Agent Prompt

Build `worktreeguard`, a local-first TypeScript CLI for safe agent worktree leasing. Focus on deterministic git commands, non-destructive defaults, JSON/Markdown status reports, and fixtures that prove dirty/stale lane handling.
