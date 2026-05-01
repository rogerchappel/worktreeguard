# TASKS: worktreeguard

## Build Slices

1. **CLI foundation**
   - Create TypeScript CLI package with `--help`, `--version`, structured errors, and JSON-friendly output.
   - Add package scripts for `check`, `test`, `build`, and `smoke`.

2. **Core domain model**
   - Define input, output, config, and report schemas for the V1 workflow.
   - Add fixture data for happy path, failure path, and edge cases.

3. **Deterministic engine**
   - Implement the local filesystem/git/process operations required by the PRD.
   - Keep network calls disabled by default and make any optional enrichment explicit.

4. **Markdown + JSON reporting**
   - Emit machine-readable JSON and human-readable Markdown.
   - Include reviewer-oriented summaries, risks, and next steps.

5. **Safety and redaction**
   - Refuse destructive actions unless explicit.
   - Redact obvious secrets and avoid printing environment values.
   - Add tests for unsafe inputs and refusal paths.

6. **Validation fixtures**
   - Add fixture repos/files that exercise the main workflow.
   - Snapshot the generated reports.
   - Add a shell smoke test that runs the CLI end-to-end in a temp directory.

7. **Docs and examples**
   - Update README with install, quickstart, CLI reference, examples, and safety model.
   - Add an agent handoff example showing how this tool fits the OSS sprint pipeline.

## Acceptance Criteria

- `pnpm check`, `pnpm test`, and `pnpm build` pass.
- `scripts/validate.sh` passes from a clean checkout.
- The main CLI workflow works against fixtures without network access.
- Generated Markdown and JSON reports are stable under snapshot tests.
- README includes a 60-second demo path and explicit non-goals.
