# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

These changes form the v0.2.0 release candidate; they ship when the `v0.2.0`
tag is pushed and the Release workflow runs.

### Added

- Add a release-state regression check that fails when the changelog
  advertises a shipped release whose tag does not exist, so changelog and
  package version drift cannot silently return.
- Add configurable lease policy, reporting formats, expiry warnings, and stable
  JSON/Markdown output for orchestrator handoff.
- Add integration, policy, formatting, CLI, installation, and package smoke
  coverage to the release gate.

### Fixed

- Validate repository configuration, lease records, command arity, option
  values, canonical paths, and lane limits before mutating a worktree.
- Honor configured worktree, lock, release, reporting, and redaction settings.
- Keep status and doctor risk reports consistent for malformed, missing,
  duplicated, stale, dirty, and upstream-less worktrees.
- Restore executable diagnostics and the source-install package entry point.
- Reject values attached to boolean CLI flags so inputs such as `--force=false` cannot enable destructive behavior.

## [0.1.0] - 2026-05-04

### Added

- Initial local-first CLI with lease, status, doctor, and release commands.
- Git worktree leases, safety checks, lock metadata, and text/JSON reporting.

## Release Links

[Unreleased]: https://github.com/rogerchappel/worktreeguard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/rogerchappel/worktreeguard/releases/tag/v0.1.0
