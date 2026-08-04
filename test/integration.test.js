import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, realpathSync, symlinkSync } from 'node:fs';
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

function configure(r, config) {
  mkdirSync(join(r, '.worktreeguard'), { recursive: true });
  writeFileSync(join(r, '.worktreeguard', 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
}

function lock(r, task) {
  return JSON.parse(readFileSync(join(r, '.worktreeguard', 'leases', `${task}.json`), 'utf8'));
}

function assertNoLeaseSideEffects(r, task) {
  assert.equal(sh(`git branch --list agent/${task}`, r).trim(), '');
  assert.equal(
    sh('git worktree list --porcelain', r).includes(`${r}-${task}`),
    false,
    'invalid lease must not create a worktree'
  );
  assert.equal(existsSync(join(r, '.worktreeguard', 'leases', `${task}.json`)), false);
}

test('lease creates worktree on disk', () => {
  const r = repo();
  run(['lease', r, '--task', 'test-worktree']);
  // Verify worktree was created
  const wtList = sh('git worktree list', r);
  assert.ok(wtList.includes('agent/test-worktree'));
});

test('symlinked worktree roots use one canonical lane identity', () => {
  const r = repo();
  const realRoot = mkdtempSync(join(tmpdir(), 'wtg-real-root-'));
  const aliasParent = mkdtempSync(join(tmpdir(), 'wtg-alias-parent-'));
  const aliasRoot = join(aliasParent, 'root');
  symlinkSync(realRoot, aliasRoot);

  run(['lease', r, '--task', 'alias-proof', '--root', aliasRoot]);

  const report = JSON.parse(run(['status', r, '--json']));
  const lanes = report.lanes.filter(lane => lane.task === 'alias-proof');
  assert.equal(lanes.length, 1);
  assert.equal(lanes[0].path, join(realpathSync.native(realRoot), `${r.split('/').pop()}-alias-proof`));
  assert.equal(lanes[0].risks.includes('missing-worktree'), false);
  assert.equal(lock(r, 'alias-proof').path, lanes[0].path);
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

for (const [label, args, error] of [
  ['non-numeric --days', ['--days', 'nope'], /--days must be a finite positive number/],
  ['zero --days', ['--days', '0'], /--days must be a finite positive number/],
  ['past --expiresAt', ['--expiresAt', '2020-01-01T00:00:00.000Z'], /--expiresAt must be a future timestamp/],
  ['malformed --expiresAt', ['--expiresAt', 'tomorrow-ish'], /--expiresAt must be a parseable timestamp/],
  ['missing --days value', ['--days'], /--days requires a value/],
  ['missing --expiresAt value', ['--expiresAt', '--json'], /--expiresAt requires a value/],
  ['unknown lease option', ['--duration', '2'], /unknown lease option: --duration/],
]) {
  test(`lease rejects ${label} without side effects`, () => {
    const r = repo();
    assert.throws(() => run(['lease', r, '--task', `invalid-${label.replaceAll(' ', '-')}`, ...args]), error);
    assertNoLeaseSideEffects(r, `invalid-${label.replaceAll(' ', '-')}`);
  });
}

test('lease applies repository configuration', () => {
  const r = repo();
  sh('git branch stable', r);
  configure(r, {
    lanePrefix: 'custom',
    worktreeRoot: 'custom-root',
    defaultDays: 30,
    defaultBase: 'stable',
  });
  const before = Date.now();
  run(['lease', r, '--task', 'config-proof']);
  const lease = lock(r, 'config-proof');
  assert.equal(lease.branch, 'custom/config-proof');
  assert.equal(lease.path, join(r, '..', 'custom-root', `${r.split('/').pop()}-config-proof`));
  assert.equal(lease.base, 'stable');
  assert.ok(Date.parse(lease.expiresAt) - before >= 30 * 86400000 - 5000);
});

test('explicit lease flags override repository configuration', () => {
  const r = repo();
  sh('git branch configured && git branch explicit', r);
  configure(r, {
    lanePrefix: 'custom',
    worktreeRoot: 'configured-root',
    defaultDays: 30,
    defaultBase: 'configured',
  });
  const explicitRoot = join(r, '..', 'explicit-root');
  const before = Date.now();
  run(['lease', r, '--task', 'override-proof', '--branch', 'manual/override', '--root', explicitRoot, '--days', '2', '--base', 'explicit']);
  const lease = lock(r, 'override-proof');
  assert.equal(lease.branch, 'manual/override');
  assert.equal(lease.path, join(explicitRoot, `${r.split('/').pop()}-override-proof`));
  assert.equal(lease.base, 'explicit');
  assert.ok(Date.parse(lease.expiresAt) - before >= 2 * 86400000 - 5000);
});

test('lease refuses creation at configured maxActiveLanes', () => {
  const r = repo();
  configure(r, { maxActiveLanes: 1 });
  run(['lease', r, '--task', 'first']);
  assert.throws(
    () => run(['lease', r, '--task', 'second']),
    /refusing to create lane: 1\/1 active/
  );
  assert.ok(!sh('git branch --list agent/second', r).trim());
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
