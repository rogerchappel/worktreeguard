import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, loadConfig } from '../src/config.js';

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
