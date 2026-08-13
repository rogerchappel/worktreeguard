import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULT_CONFIG, loadConfig } from '../src/config.js';

function configured(value) {
  const repo = mkdtempSync(join(tmpdir(), 'wtg-config-'));
  mkdirSync(join(repo, '.worktreeguard'));
  writeFileSync(join(repo, '.worktreeguard', 'config.json'), JSON.stringify(value));
  return repo;
}

test('DEFAULT_CONFIG has expected keys', () => {
  assert.ok(DEFAULT_CONFIG.lanePrefix);
  assert.ok(DEFAULT_CONFIG.defaultDays === 7);
  assert.ok(DEFAULT_CONFIG.defaultBase === 'main');
  assert.ok(DEFAULT_CONFIG.worktreeRoot === '.worktrees');
  assert.ok(Array.isArray(DEFAULT_CONFIG.redactPatterns));
  assert.ok(DEFAULT_CONFIG.maxActiveLanes === 10);
  assert.ok(DEFAULT_CONFIG.warnBeforeExpiryHours === 24);
});

test('loadConfig returns defaults for nonexistent path', () => {
  const cfg = loadConfig('/tmp/nonexistent-repo-xyz-12345');
  assert.deepEqual(cfg, DEFAULT_CONFIG);
});

test('loadConfig merges and validates supported values', () => {
  const config = loadConfig(configured({ defaultDays: 2.5, maxActiveLanes: 3, warnBeforeExpiryHours: 0 }));
  assert.equal(config.defaultDays, 2.5);
  assert.equal(config.maxActiveLanes, 3);
  assert.equal(config.warnBeforeExpiryHours, 0);
});

for (const [field, value, expectation] of [
  ['defaultDays', '7', /field "defaultDays".*finite number greater than zero/],
  ['defaultDays', null, /field "defaultDays"/],
  ['maxActiveLanes', 0, /field "maxActiveLanes".*positive integer/],
  ['maxActiveLanes', 1.5, /field "maxActiveLanes".*positive integer/],
  ['warnBeforeExpiryHours', -1, /field "warnBeforeExpiryHours"/],
  ['lanePrefix', '../agent', /field "lanePrefix".*safe Git/],
  ['defaultBase', 'feature branch', /field "defaultBase".*safe Git/],
  ['worktreeRoot', '../outside', /field "worktreeRoot".*relative path/],
  ['lockDir', '/tmp/leases', /field "lockDir".*relative path/],
  ['releaseDir', '', /field "releaseDir".*non-empty/],
  ['redactPatterns', ['ok', ''], /field "redactPatterns".*non-empty strings/],
  ['unexpected', true, /field "unexpected".*not a supported/],
]) {
  test(`loadConfig rejects invalid ${field}`, () => {
    assert.throws(() => loadConfig(configured({ [field]: value })), expectation);
  });
}

for (const value of [null, [], 'config']) {
  test(`loadConfig rejects non-object JSON: ${JSON.stringify(value)}`, () => {
    assert.throws(() => loadConfig(configured(value)), /Invalid \.worktreeguard\/config\.json: expected a JSON object/);
  });
}
