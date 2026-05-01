# ORCHESTRATION: worktreeguard

## StackForge Scaffold

Recommended initial scaffold:

```bash
cd /Users/roger/Developer/my-opensource/stackforge
pnpm dev init oss-cli worktreeguard \
  --prd /Users/roger/Developer/my-opensource/oss-ideas/ideas/ready/worktreeguard/PRD.md \
  --tasks /Users/roger/Developer/my-opensource/oss-ideas/ideas/ready/worktreeguard/TASKS.md
```

Then copy this file into `docs/ORCHESTRATION.md` in the generated repo.

## Agent Lane Plan

- **Lane 1: CLI skeleton + command surface** — build commands, help text, config loading, and structured output.
- **Lane 2: Core engine + fixtures** — implement deterministic operations and fixture coverage.
- **Lane 3: Reports + docs** — build Markdown/JSON reports, README examples, and handoff snippets.
- **Lane 4: Safety + validation** — add redaction/refusal tests, smoke tests, and `scripts/validate.sh` hardening.

## Review Gates

- Every implementation task lands through a PR-linked branch or worktree.
- Run `scripts/validate.sh` before handoff.
- Include generated report examples in the PR when relevant.
- Use `branchbrief`/`prpack` after the first meaningful implementation slice.

## Integration Notes

- Keep the V1 local-first and deterministic.
- Prefer explicit config files over hidden discovery when safety matters.
- Emit JSON for future CrewCmd/OpenClaw orchestration and Markdown for human review.
- Do not add hosted services, telemetry, or autonomous publish/merge behavior in V1.
