# Release candidate readiness

Generated: 2026-05-05T21:27:11Z
Branch: `release-candidate/readiness`
Base: `main`

## Verification

Status: PASS

Checks run:
- `npm ci`
- `npm run release:check`
- `bash scripts/validate.sh`
- `node releasebox check .`

## Check output summary

    ## npm ci
    ```
    npm ci
    ```
    ```text
    
    up to date, audited 1 package in 254ms
    
    found 0 vulnerabilities
    ```
    RESULT: 0 (1s)
    
    ## npm run release:check
    ```
    npm run release:check
    ```
    ```text
    
    > worktreeguard@0.1.0 release:check
    > npm run check && npm test && npm run smoke && npm pack --dry-run
    
    
    > worktreeguard@0.1.0 check
    > node --check src/index.js && node --check test/worktreeguard.test.js
    
    
    > worktreeguard@0.1.0 test
    > node --test
    
    ✔ help and version (0.64225ms)
    ✔ lease, status json, dirty risk, and release refusal (326.995417ms)
    ✔ missing worktree is reported from lock (293.658541ms)
    ℹ tests 3
    ℹ suites 0
    ℹ pass 3
    ℹ fail 0
    ℹ cancelled 0
    ℹ skipped 0
    ℹ todo 0
    ℹ duration_ms 692.416333
    
    > worktreeguard@0.1.0 smoke
    > bash scripts/smoke.sh
    
    npm notice
    npm notice package: worktreeguard@0.1.0
    npm notice Tarball Contents
    npm notice 1.1kB LICENSE
    npm notice 3.8kB README.md
    npm notice 743B docs/orchestration.json
    npm notice 1.5kB docs/ORCHESTRATION.md
    npm notice 4.1kB docs/PRD.md
    npm notice 302B docs/README.md
    npm notice 4.2kB docs/release-candidate.md
    npm notice 1.7kB docs/TASKS.md
    npm notice 404B examples/agent-handoff.md
    npm notice 1.1kB package.json
    npm notice 9.7kB src/index.js
    npm notice Tarball Details
    npm notice name: worktreeguard
    npm notice version: 0.1.0
    npm notice filename: worktreeguard-0.1.0.tgz
    npm notice package size: 10.6 kB
    npm notice unpacked size: 28.6 kB
    npm notice shasum: e1b94bb9e51e45d7c7b130672aeac8aa8d2a6e59
    npm notice integrity: sha512-qMJZz7S5X33WB[...]LFKlh7TJ6ckXw==
    npm notice total files: 11
    npm notice
    worktreeguard-0.1.0.tgz
    ```
    RESULT: 0 (2s)
    
    ## bash scripts/validate.sh
    ```
    bash scripts/validate.sh
    ```
    ```text
    Checking worktreeguard required files...
    PASS: required file exists: README.md
    PASS: required file exists: AGENTS.md
    PASS: required file exists: CONTRIBUTING.md
    PASS: required file exists: SECURITY.md
    PASS: required file exists: .github/pull_request_template.md
    PASS: required file exists: scripts/validate.sh
    
    Checking worktreeguard required directories...
    PASS: required directory exists: .github
    PASS: required directory exists: docs
    PASS: required directory exists: scripts
    
    Running local project checks where present...
    NOTE: using package manager: npm
    
    > worktreeguard@0.1.0 check
    > node --check src/index.js && node --check test/worktreeguard.test.js
    
    PASS: package script: check
    
    > worktreeguard@0.1.0 test
    > node --test
    
    ✔ help and version (1.371417ms)
    ✔ lease, status json, dirty risk, and release refusal (562.061ms)
    ✔ missing worktree is reported from lock (1219.387666ms)
    ℹ tests 3
    ℹ suites 0
    ℹ pass 3
    ℹ fail 0
    ℹ cancelled 0
    ℹ skipped 0
    ℹ todo 0
    ℹ duration_ms 1923.95425
    PASS: package script: test
    
    > worktreeguard@0.1.0 build
    > npm run check
    
    
    > worktreeguard@0.1.0 check
    > node --check src/index.js && node --check test/worktreeguard.test.js
    
    PASS: package script: build
    NOTE: agent-qc not installed; skipping optional agent check
    
    Validation passed.
    ```
    RESULT: 0 (4s)
    
    ## ReleaseBox check
    ```
    node '/Users/roger/Developer/my-opensource/releasebox/bin/releasebox.js' check .
    ```
    ```text
    ✅ releasebox config: node-cli
    ✅ ci workflow: .github/workflows/ci.yml
    ✅ release dry run workflow: .github/workflows/release-dry-run.yml
    ✅ task breakdown: docs/TASKS.md
    ✅ orchestration plan: docs/ORCHESTRATION.md
    ✅ dependabot config: .github/dependabot.yml
    ✅ npm test script: node --test
    ✅ build script: npm run check
    ✅ smoke script: bash scripts/smoke.sh
    ✅ bin entry: {"worktreeguard":"./src/index.js"}
    ```
    RESULT: 0 (0s)
    
