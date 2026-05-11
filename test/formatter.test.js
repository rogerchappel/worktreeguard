import test from 'node:test';
import assert from 'node:assert/strict';
import { formatReport, formatSummary } from '../src/formatter.js';

function makeReport() {
  return {
    repo: '/tmp/test-repo',
    generatedAt: '2026-05-12T10:00:00.000Z',
    summary: { worktrees: 2, dirty: 1, stale: 0, risks: 1 },
    risks: ['dirty'],
    lanes: [
      {
        path: '/tmp/worktrees/test-repo-fix-login',
        branch: 'agent/fix-login',
        head: 'abc1234',
        task: 'fix-login',
        owner: 'roger',
        expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        pr: null,
        dirty: false,
        dirtyFiles: [],
        risks: [],
        missingWorktree: false,
        stale: false,
        duplicateBranch: false,
        upstreamMissing: false,
      },
      {
        path: '/tmp/worktrees/test-repo-add-validation',
        branch: 'agent/add-validation',
        head: 'def5678',
        task: 'add-validation',
        owner: 'agent',
        expiresAt: new Date(Date.now() + 600000).toISOString(), // 10 min = soon
        pr: null,
        dirty: true,
        dirtyFiles: [' M package.json', ' M src/index.js'],
        risks: ['dirty'],
        missingWorktree: false,
        stale: false,
        duplicateBranch: false,
        upstreamMissing: false,
      },
    ],
  };
}

test('text format renders lanes', () => {
  const report = makeReport();
  const out = formatReport(report, 'text');
  assert.match(out, /WorktreeGuard Report/);
  assert.match(out, /test-repo/);
  assert.match(out, /fix-login/);
  assert.match(out, /add-validation/);
  assert.match(out, /dirty/);
});

test('markdown format renders tables', () => {
  const report = makeReport();
  const out = formatReport(report, 'markdown');
  assert.match(out, /\| Metric \| Count \|/);
  assert.match(out, /\| Task \| Branch \| Path \| Status \| Risks \|/);
  assert.match(out, /🟢 ok/);
  assert.match(out, /🔴 dirty/);
  assert.ok(out.includes('| Worktrees | 2 |'));
  assert.ok(out.includes('| Dirty | 1 |'));
});

test('markdown format includes expiry warnings for soon-to-expire lanes', () => {
  const report = makeReport();
  const out = formatReport(report, 'markdown');
  // One lane expires in 10 min -> triggers warning
  assert.match(out, /⏰|Expiring Soon/);
});

test('json format is valid JSON', () => {
  const report = makeReport();
  const out = formatReport(report, 'json');
  const parsed = JSON.parse(out);
  assert.equal(parsed.repo, '/tmp/test-repo');
  assert.equal(parsed.lanes.length, 2);
});

test('formatSummary aggregates across repos', () => {
  const reports = [
    { summary: { dirty: 1, stale: 0 }, lanes: [{}, {}] },
    { summary: { dirty: 0, stale: 2 }, lanes: [{}] },
  ];
  const result = formatSummary(reports);
  assert.equal(result.total, 2);
  assert.equal(result.lanes, 3);
  assert.equal(result.dirty, 1);
  assert.equal(result.stale, 2);
});

test('missing worktree renders with missing status in markdown', () => {
  const report = {
    repo: '/tmp/test-repo',
    generatedAt: '2026-05-12T10:00:00.000Z',
    summary: { worktrees: 1, dirty: 0, stale: 0, risks: 1 },
    risks: ['missing-worktree'],
    lanes: [
      {
        path: '/tmp/deleted/worktree',
        branch: 'agent/orphaned-task',
        head: null,
        task: 'orphaned-task',
        owner: 'ghost',
        expiresAt: null,
        pr: null,
        dirty: false,
        dirtyFiles: [],
        risks: ['missing-worktree'],
        missingWorktree: true,
        stale: false,
        duplicateBranch: false,
        upstreamMissing: false,
      },
    ],
  };
  const out = formatReport(report, 'markdown');
  assert.match(out, /⚫ missing/);
});
