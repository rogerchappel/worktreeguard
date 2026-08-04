import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { run } from '../src/index.js';

function repo() {
  const path = mkdtempSync(join(tmpdir(), 'worktreeguard-arguments-'));
  for (const args of [['init', '-q'], ['config', 'user.email', 'test@example.com'], ['config', 'user.name', 'Test User'], ['commit', '--allow-empty', '-qm', 'init']]) {
    const result = spawnSync('git', args, { cwd: path, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  return path;
}

test('status accepts its documented options', () => {
  const path = repo();
  assert.doesNotThrow(() => run(['status', path, '--format', 'markdown']));
  assert.doesNotThrow(() => run(['status', '--root', path, '--json']));
});

test('doctor accepts its documented options', () => {
  const path = repo();
  assert.doesNotThrow(() => run(['doctor', path, '--format', 'json']));
  assert.doesNotThrow(() => run(['doctor', path, '--json']));
});

test('release validates arguments before repository access', () => {
  assert.throws(() => run(['release', '/missing']), /release requires <repo> and <task>/);
  assert.throws(() => run(['release', '/missing', 'task', 'extra']), /too many arguments for release/);
  assert.throws(() => run(['release', '/missing', 'task', '--fomrat', 'json']), /unknown release option: --fomrat/);
  assert.throws(() => run(['release', '/missing', 'task', '--bogus']), /unknown release option: --bogus/);
});

test('lease validates arguments before repository access', () => {
  assert.throws(() => run(['lease', '--task', 'missing-repo']), /lease requires a repository/);
  assert.throws(() => run(['lease', '/missing', 'extra', '--task', 'too-many']), /too many arguments for lease/);
  assert.throws(() => run(['lease', '/missing', '--task', 'unknown', '--bogus']), /unknown lease option: --bogus/);
});

for (const command of ['status', 'doctor']) {
  test(`${command} rejects unknown options before repository access`, () => {
    assert.throws(() => run([command, '/missing', '--fomrat', 'json']), new RegExp(`unknown ${command} option: --fomrat`));
    assert.throws(() => run([command, '/missing', '--bogus']), new RegExp(`unknown ${command} option: --bogus`));
  });
}

test('status and doctor enforce documented positional arity', () => {
  assert.throws(() => run(['status', '/missing', 'extra']), /too many arguments for status/);
  assert.throws(() => run(['status', '/missing', '--root', '/also-missing']), /either a repository or --root/);
  assert.throws(() => run(['doctor']), /doctor requires a repository/);
  assert.throws(() => run(['doctor', '/missing', 'extra']), /too many arguments for doctor/);
});

test('status and doctor reject unsupported formats before repository access', () => {
  assert.throws(() => run(['status', '/missing', '--format', 'yaml']), /--format must be one of/);
  assert.throws(() => run(['doctor', '/missing', '--format', 'yaml']), /--format must be one of/);
});
