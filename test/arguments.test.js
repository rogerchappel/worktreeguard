import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { run } from '../src/index.js';

const cli = join(import.meta.dirname, '..', 'src', 'index.js');

function spawnCli(args, cwd = process.cwd()) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
}

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

test('executable CLI reports unknown commands without a secondary error', () => {
  const result = spawnCli(['unknown-ghp_12345678901234567890']);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'unknown command: unknown-[REDACTED]\n');
  assert.doesNotMatch(result.stderr, /ReferenceError|\n\s+at /);
});

test('executable CLI reports invalid formats without a secondary error', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'worktreeguard-cli-errors-'));
  mkdirSync(join(cwd, '.worktreeguard'));
  writeFileSync(join(cwd, '.worktreeguard', 'config.json'), JSON.stringify({ redactPatterns: ['private-'] }));
  const result = spawnCli(['status', '--format', 'private-sensitive'], cwd);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '--format must be one of: text, json, markdown\n');
  assert.doesNotMatch(result.stderr, /private-sensitive|ReferenceError|\n\s+at /);
});

test('executable CLI applies configured prefixes to error text', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'worktreeguard-cli-redaction-'));
  mkdirSync(join(cwd, '.worktreeguard'));
  writeFileSync(join(cwd, '.worktreeguard', 'config.json'), JSON.stringify({ redactPatterns: ['private-'] }));
  const result = spawnCli(['unknown-private-sensitive'], cwd);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'unknown command: unknown-[REDACTED]\n');
  assert.doesNotMatch(result.stderr, /private-sensitive|ReferenceError|\n\s+at /);
});
