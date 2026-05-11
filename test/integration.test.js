import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { run } from '../src/index.js';

function sh(cmd, cwd) {
  const r = spawnSync('bash', ['-lc', cmd], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
}

function repo() {
  const d = mkdtempSync(join(tmpdir(), 'wtg-int-'));
  sh('git init -b main && git config user.email test@example.com && git config user.name Test && echo "# repo" > README.md && git add . && git commit -m "init"', d);
  return d;
}

test('lease creates worktree on disk', () => {
  const r = repo();
  run(['lease', r, '--task', 'test-worktree']);
  // Verify worktree was created
  const wtList = sh('git worktree list', r);
  assert.ok(wtList.includes('agent/test-worktree'));
});

test('lease with custom base branch', () => {
  const r = repo();
  sh('git branch develop', r);
  run(['lease', r, '--task', 'custom-base', '--base', 'develop']);
  const wtList = sh('git worktree list', r);
  assert.ok(wtList.includes('agent/custom-base'));
});

test('lease with custom --days expiry', () => {
  const r = repo();
  run(['lease', r, '--task', 'short-lived', '--days', '1']);
  const status = JSON.parse(run(['status', r, '--json']));
  const lane = status.lanes.find(l => l.task === 'short-lived');
  assert.ok(lane, 'lane should exist');
  assert.ok(lane.expiresAt, 'lane should have expiry');
  // 1 day expiry should be within 48 hours from now
  assert.ok(Date.parse(lane.expiresAt) - Date.now() < 48 * 3600000);
});

test('lease prevents duplicate task', () => {
  const r = repo();
  run(['lease', r, '--task', 'dupe-task']);
  // Second lease for same task should fail (worktree path already exists)
  assert.throws(() => run(['lease', r, '--task', 'dupe-task']), /refusing to lease/);
});

test('multiple leases appear in status', () => {
  const r = repo();
  run(['lease', r, '--task', 'task-alpha']);
  run(['lease', r, '--task', 'task-beta']);
  const status = JSON.parse(run(['status', r, '--json']));
  const tasks = status.lanes.map(l => l.task);
  assert.ok(tasks.includes('task-alpha'));
  assert.ok(tasks.includes('task-beta'));
});

test('status --format markdown', () => {
  const r = repo();
  run(['lease', r, '--task', 'md-task']);
  const out = run(['status', r, '--format', 'markdown']);
  assert.match(out, /WorktreeGuard Report/);
  assert.match(out, /md-task/);
});

test('doctor detects stale lease', async () => {
  const r = repo();
  // Create a lease with a past expiry date by manipulating the lock file
  run(['lease', r, '--task', 'stale-test']);
  const locksDir = join(r, '.worktreeguard', 'leases');
  const lockPath = join(locksDir, 'stale-test.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  lock.expiresAt = '2020-01-01T00:00:00.000Z';
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');

  const report = JSON.parse(run(['doctor', r, '--json']));
  const staleLane = report.lanes.find(l => l.task === 'stale-test');
  assert.ok(staleLane, 'stale-test lane should exist');
  assert.ok(staleLane.risks.includes('stale'), 'stale risk should be flagged');
});

test('release archives lease to .worktreeguard/releases', () => {
  const r = repo();
  run(['lease', r, '--task', 'release-demo']);
  const lane = JSON.parse(run(['status', r, '--json'])).lanes.find(l => l.task === 'release-demo');
  run(['release', r, 'release-demo', '--force']);
  const releasesDir = join(r, '.worktreeguard', 'releases');
  const releaseFile = join(releasesDir, 'release-demo.json');
  assert.ok(existsSync(releaseFile), 'release archive should exist');
  const archived = JSON.parse(readFileSync(releaseFile, 'utf8'));
  assert.ok(archived.releasedAt, 'archived lease should have releasedAt timestamp');
});

test('--version flag', () => {
  assert.match(run(['--version']), /0\.1\.0/);
});

test('unknown command throws helpful error', () => {
  assert.throws(() => run(['bananas']), /unknown command/);
});
