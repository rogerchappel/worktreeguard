import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceMaxLanes,
  checkPolicy,
  redactSecrets,
  isExpiringSoon,
  PolicyError,
} from '../src/policy.js';

// enforceMaxLanes
test('enforceMaxLanes passes under limit', () => {
  assert.doesNotThrow(() => enforceMaxLanes('/repo', 5, 10));
});

test('enforceMaxLanes throws at limit', () => {
  assert.throws(() => enforceMaxLanes('/repo', 10, 10), /refusing to create lane/);
});

test('enforceMaxLanes throws over limit', () => {
  assert.throws(() => enforceMaxLanes('/repo', 15, 10), /refusing to create lane/);
});

// checkPolicy
test('no violations on clean lanes', () => {
  const result = checkPolicy('/repo', [
    { dirty: false, stale: false, duplicateBranch: false },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test('duplicate branch flagged', () => {
  const result = checkPolicy('/repo', [
    { dirty: false, stale: false, duplicateBranch: true },
  ]);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some(v => v.includes('duplicate branch')));
});

test('many dirty lanes triggers warning', () => {
  const lanes = Array.from({ length: 6 }, () => ({ dirty: true, stale: false, duplicateBranch: false }));
  const result = checkPolicy('/repo', lanes);
  assert.ok(result.violations.some(v => v.includes('dirty lanes')));
});

test('many stale lanes triggers warning', () => {
  const lanes = Array.from({ length: 4 }, () => ({ dirty: false, stale: true, duplicateBranch: false }));
  const result = checkPolicy('/repo', lanes);
  assert.ok(result.violations.some(v => v.includes('stale lanes')));
});

// redactSecrets
test('redacts GitHub classic token', () => {
  const out = redactSecrets('token=ghp_abcdefghij1234567890klmnopqrstuv');
  assert.ok(out.includes('[REDACTED]'));
  assert.ok(!out.includes('ghp_abcdefghij1234567890klmnopqrstuv'));
});

test('redacts GitHub fine-grained token', () => {
  const out = redactSecrets('PAT=github_pat_AAAAAABBBBBBCCCCCDDDDDEEEEEFFFFF');
  assert.ok(out.includes('[REDACTED]'));
});

test('redacts OpenAI key', () => {
  const out = redactSecrets('key=sk-1234567890abcdefghijklmnopqrs');
  assert.ok(out.includes('[REDACTED]'));
});

test('redacts Slack token', () => {
  const out = redactSecrets('xoxb-SLACK-DUMMY-TOKEN-REDACTTEST');
  assert.ok(out.includes('[REDACTED]'));
});

test('safe text passes through unchanged', () => {
  const text = 'hello world, no secrets here';
  assert.equal(redactSecrets(text), text);
});

// isExpiringSoon
test('returns true for lease expiring in 1 hour', () => {
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  assert.equal(isExpiringSoon(expiresAt, 24), true);
});

test('returns false for lease expiring in 2 days', () => {
  const expiresAt = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
  assert.equal(isExpiringSoon(expiresAt, 24), false);
});

test('returns false for already expired lease', () => {
  const expiresAt = new Date(Date.now() - 3600 * 1000).toISOString();
  assert.equal(isExpiringSoon(expiresAt, 24), false);
});

test('returns false for null expiry', () => {
  assert.equal(isExpiringSoon(null), false);
});

test('returns false for invalid date string', () => {
  assert.equal(isExpiringSoon('not-a-date'), false);
});

// PolicyError
test('PolicyError has code property', () => {
  const err = new PolicyError('test', 'SOME_CODE');
  assert.equal(err.code, 'SOME_CODE');
  assert.equal(err.message, 'test');
});
