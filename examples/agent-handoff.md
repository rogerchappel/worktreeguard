# Agent handoff example

```sh
worktreeguard lease ./my-repo --task fix-login-timeout --base main --json
worktreeguard status ./my-repo --format markdown
worktreeguard doctor ./my-repo --json
```

Attach the Markdown report to a human review and the JSON report to orchestration logs. Dirty, stale, missing, duplicate-branch, and missing-upstream risks should block automated handoff until acknowledged.
