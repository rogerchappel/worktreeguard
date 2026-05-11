import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatReport } from '../src/formatter.js';
import { redactSecrets } from '../src/policy.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

// Schema validation helpers
function validateReport(report) {
  assert.ok(report.repo, 'report must have repo');
  assert.ok(report.generatedAt, 'report must have generatedAt');
  assert.ok(typeof report.summary === 'object', 'report must have summary');
  assert.ok(Array.isArray(report.lanes), 'report must have lanes array');
  for (const lane of report.lanes) {
    assert.ok(lane.path, 'lane must have path');
    assert.ok(typeof lane.task === 'string' || lane.task === null, 'lane task must be string or null');
    assert.ok(Array.isArray(lane.risks), 'lane risks must be array');
    assert.ok(Array.isArray(lane.dirtyFiles), 'lane dirtyFiles must be array');
  }
}

function validateFixtures() {
  const files = ['empty-repo.json', 'healthy-repo.json', 'dirty-repo.json'];
  return files.map(f => JSON.parse(readFileSync(join(fixturesDir, f), 'utf8')));
}

// All fixtures must match the report schema
test('all fixtures pass report schema validation', () => {
  const reports = validateFixtures();
  for (const report of reports) {
    validateReport(report);
  }
});

// Markdown roundtrip: format and verify key markers
test('fixtures render to markdown without errors', () => {
  const reports = validateFixtures();
  for (const report of reports) {
    const md = formatReport(report, 'markdown');
    assert.ok(md.includes('WorktreeGuard Report'), `${report.repo} missing header`);
    assert.ok(md.includes(report.repo.split('/').pop()), `${report.repo} missing repo name`);
  }
});

// JSON roundtrip must parse
test('json format output is parseable', () => {
  const reports = validateFixtures();
  for (const report of reports) {
    const json = formatReport(report, 'json');
    const parsed = JSON.parse(json);
    assert.equal(parsed.repo, report.repo);
    assert.equal(parsed.lanes.length, report.lanes.length);
  }
});

// Dirty fixture redaction test - simulates secrets in dirty files
test('dirty fixture dirtyFiles with secrets are redacted', () => {
  const dirty = JSON.parse(readFileSync(join(fixturesDir, 'dirty-repo.json'), 'utf8'));
  // Simulate a token in dirty files
  dirty.lanes[0].dirtyFiles.push('token ghp_abcdefghij1234567890xyz');
  const md = formatReport(dirty, 'markdown');
  assert.ok(!md.includes('ghp_abcdefghij1234567890xyz'), 'secret should be redacted in output');
});

// Empty repo summary numbers
test('empty repo has zero counts', () => {
  const empty = JSON.parse(readFileSync(join(fixturesDir, 'empty-repo.json'), 'utf8'));
  assert.equal(empty.summary.worktrees, 0);
  assert.equal(empty.summary.dirty, 0);
  assert.equal(empty.summary.stale, 0);
  assert.equal(empty.lanes.length, 0);
});

// Healthy repo counts
test('healthy repo has expected lane count', () => {
  const healthy = JSON.parse(readFileSync(join(fixturesDir, 'healthy-repo.json'), 'utf8'));
  assert.equal(healthy.summary.worktrees, 2);
  assert.equal(healthy.summary.dirty, 0);
  assert.equal(healthy.lanes.length, 2);
});
