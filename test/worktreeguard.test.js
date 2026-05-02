import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { run } from '../src/index.js';
function sh(c, cwd) { const r = spawnSync('bash', ['-lc', c], { cwd, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr || r.stdout); return r.stdout; }
function repo() { const d = mkdtempSync(join(tmpdir(), 'wtg-')); sh('git init -b main && git config user.email test@example.com && git config user.name Test && echo hi > README.md && git add . && git commit -m init', d); return d; }
test('help and version', () => { assert.match(run(['--help']), /lease/); assert.match(run(['version']), /^0\.1\.0/); });
test('lease, status json, dirty risk, and release refusal', () => {
  const r = repo(); const out = run(['lease', r, '--task', 'Fix Login', '--json']); const data = JSON.parse(out); assert.equal(data.repos[0].action, 'leased');
  const lane = JSON.parse(run(['status', r, '--json'])).lanes.find(l => l.task === 'fix-login'); assert.ok(lane.path);
  writeFileSync(join(lane.path, 'dirty.txt'), 'secret ghp_abcdef1234567890');
  const status = JSON.parse(run(['doctor', r, '--json'])); const dirty = status.lanes.find(l => l.task === 'fix-login'); assert.ok(dirty.risks.includes('dirty')); assert.match(dirty.dirtyFiles.join('\n'), /REDACTED|dirty.txt/);
  assert.throws(() => run(['release', r, 'fix-login']), /dirty/); assert.match(run(['release', r, 'fix-login', '--force']), /released fix-login/);
});
test('missing worktree is reported from lock', () => {
  const r = repo(); run(['lease', r, '--task', 'gone']); const lane = JSON.parse(run(['status', r, '--json'])).lanes.find(l => l.task === 'gone'); sh(`rm -rf ${JSON.stringify(lane.path)}`, r);
  const report = JSON.parse(run(['doctor', r, '--json'])); assert.ok(report.lanes.find(l => l.task === 'gone').risks.includes('missing-worktree'));
});
