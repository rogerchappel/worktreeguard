#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig, getLaneBranch } from './config.js';
import { redactSecrets, enforceMaxLanes, isExpiringSoon } from './policy.js';

export const VERSION = '0.1.0';
const LOCK_DIR = '.worktreeguard/leases';
const WORKTREE_LOCK = '.worktreeguard/lease.json';

class CliError extends Error { constructor(message, code = 1) { super(message); this.exitCode = code; } }

function git(repo, args, opts = {}) {
  const res = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', ...opts });
  if (res.status !== 0 && !opts.allowFailure) throw new CliError(`git ${args.join(' ')} failed: ${(res.stderr || res.stdout).trim()}`);
  return { status: res.status ?? 0, stdout: res.stdout || '', stderr: res.stderr || '' };
}
function isGitRepo(p) { return existsSync(join(p, '.git')) || git(p, ['rev-parse', '--git-dir'], { allowFailure: true }).status === 0; }
function repoTopLevel(repo) { return git(repo, ['rev-parse', '--show-toplevel']).stdout.trim(); }
function defaultBranch(repo) { return git(repo, ['branch', '--show-current'], { allowFailure: true }).stdout.trim() || 'main'; }
function slugify(s) { const out = String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''); if (!out) throw new CliError('task must contain at least one safe character'); return out; }
function nowIso() { return new Date().toISOString(); }
function addDays(days) { return new Date(Date.now() + days * 86400000).toISOString(); }
function readJson(path, fallback) { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } }
function writeJson(path, value) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function redact(value) { return String(value).replace(/(ghp_|github_pat_|sk-|xox[baprs]-)[A-Za-z0-9_\-]+/g, '$1[REDACTED]'); }
function parseArgs(argv) {
  const flags = {}; const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [raw, inline] = a.slice(2).split('=', 2);
      if (['json','force','help','version'].includes(raw)) flags[raw] = true;
      else flags[raw] = inline ?? argv[++i];
    } else positional.push(a);
  }
  return { flags, positional };
}
function parseWorktrees(repo) {
  const out = git(repo, ['worktree', 'list', '--porcelain']).stdout;
  const entries = []; let cur = null;
  for (const line of out.split('\n')) {
    if (!line.trim()) { if (cur) entries.push(cur); cur = null; continue; }
    const [key, ...rest] = line.split(' '); const val = rest.join(' ');
    if (key === 'worktree') cur = { path: val };
    else if (cur && key === 'HEAD') cur.head = val;
    else if (cur && key === 'branch') cur.branch = val.replace('refs/heads/', '');
    else if (cur && ['bare','detached','prunable'].includes(key)) cur[key] = val || true;
  }
  if (cur) entries.push(cur);
  return entries;
}
function dirty(path) { return git(path, ['status', '--porcelain'], { allowFailure: true }).stdout.trim(); }
function upstreamMissing(path, branch) {
  if (!branch) return false;
  return git(path, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], { allowFailure: true }).status !== 0;
}
function loadLocks(repo) {
  const dir = join(repo, LOCK_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).map(f => readJson(join(dir, f), null)).filter(Boolean);
}
function inspectRepo(repoInput) {
  const repo = repoTopLevel(resolve(repoInput));
  const worktrees = parseWorktrees(repo);
  const locks = loadLocks(repo);
  const lockByPath = new Map(locks.map(l => [resolve(l.path), l]));
  const branchCounts = new Map();
  for (const wt of worktrees) if (wt.branch) branchCounts.set(wt.branch, (branchCounts.get(wt.branch) || 0) + 1);
  const lanes = worktrees.map(wt => {
    const p = resolve(wt.path); const d = dirty(p); const lock = lockByPath.get(p) || readJson(join(p, WORKTREE_LOCK), null);
    const risks = [];
    if (!existsSync(p)) risks.push('missing-worktree');
    if (d) risks.push('dirty');
    if (lock?.expiresAt && Date.parse(lock.expiresAt) < Date.now()) risks.push('stale');
    if (wt.branch && branchCounts.get(wt.branch) > 1) risks.push('duplicate-branch');
    if (upstreamMissing(p, wt.branch)) risks.push('missing-upstream');
    return { path: p, branch: wt.branch || null, head: wt.head || null, task: lock?.task || null, owner: lock?.owner || null, expiresAt: lock?.expiresAt || null, pr: lock?.pr || null, dirty: Boolean(d), dirtyFiles: d ? d.split('\n').map(redact) : [], risks };
  });
  const paths = new Set(lanes.map(l => l.path));
  for (const lock of locks) if (!existsSync(lock.path) || !paths.has(resolve(lock.path))) lanes.push({ path: resolve(lock.path), branch: lock.branch || null, task: lock.task, owner: lock.owner || null, expiresAt: lock.expiresAt || null, pr: lock.pr || null, dirty: false, dirtyFiles: [], risks: ['missing-worktree'] });
  const risks = [...new Set(lanes.flatMap(l => l.risks))];
  return { repo, generatedAt: nowIso(), summary: { worktrees: lanes.length, dirty: lanes.filter(l => l.dirty).length, risks: risks.length }, risks, lanes };
}
function findRepos(root) {
  const r = resolve(root);
  if (isGitRepo(r)) return [repoTopLevel(r)];
  const repos = [];
  for (const name of readdirSync(r)) { const p = join(r, name); if (statSync(p).isDirectory() && isGitRepo(p)) repos.push(repoTopLevel(p)); }
  return [...new Set(repos)];
}
function formatReport(report, format = 'text') {
  if (format === 'json') return JSON.stringify(report, null, 2);
  const reports = report.repos || [report];
  const md = format === 'markdown';
  const lines = [];
  if (md) lines.push('# WorktreeGuard Report', ''); else lines.push('WorktreeGuard report');
  for (const r of reports) {
    lines.push(`${md ? '## ' : ''}${r.repo}`);
    lines.push(`worktrees=${r.summary.worktrees} dirty=${r.summary.dirty} risks=${r.risks.length ? r.risks.join(',') : 'none'}`);
    for (const lane of r.lanes) lines.push(`- ${lane.task || basename(lane.path)} [${lane.branch || 'detached'}] ${lane.risks.length ? lane.risks.join(',') : 'ok'} ${lane.path}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}
function lease(repoInput, flags) {
  const repo = repoTopLevel(resolve(repoInput)); const task = slugify(flags.task); const base = flags.base || defaultBranch(repo);
  const branch = flags.branch || `agent/${task}`; const root = resolve(flags.root || join(dirname(repo), '.worktrees'));
  const path = resolve(flags.path || join(root, `${basename(repo)}-${task}`));
  if (existsSync(path)) throw new CliError(`refusing to lease into existing path: ${path}`);
  git(repo, ['fetch', '--all', '--prune'], { allowFailure: true });
  git(repo, ['worktree', 'add', '-b', branch, path, base]);
  const lock = { task, owner: flags.owner || process.env.USER || 'unknown', repo, path, branch, base, createdAt: nowIso(), expiresAt: flags.expiresAt || addDays(Number(flags.days || 7)), pr: flags.pr || null };
  writeJson(join(repo, LOCK_DIR, `${task}.json`), lock); writeJson(join(path, WORKTREE_LOCK), lock);
  return lock;
}
function release(repoInput, taskOrPath, flags) {
  const repo = repoTopLevel(resolve(repoInput)); const locks = loadLocks(repo); const key = taskOrPath && slugify(taskOrPath);
  const lock = locks.find(l => l.task === key || resolve(l.path) === resolve(taskOrPath || ''));
  if (!lock) throw new CliError(`no lease found for ${taskOrPath}`);
  if (existsSync(lock.path) && dirty(lock.path) && !flags.force) throw new CliError('refusing to release dirty worktree without --force');
  lock.releasedAt = nowIso(); if (flags.pr) lock.pr = flags.pr;
  const archived = join(repo, '.worktreeguard/releases', `${lock.task}.json`); writeJson(archived, lock);
  if (existsSync(lock.path)) git(repo, ['worktree', 'remove', flags.force ? '--force' : '', lock.path].filter(Boolean));
  rmSync(join(repo, LOCK_DIR, `${lock.task}.json`), { force: true });
  return lock;
}
function help() { return `worktreeguard ${VERSION}\n\nUsage:\n  worktreeguard lease <repo> --task <slug> [--base main] [--root <dir>] [--json]\n  worktreeguard status [repo|--root <dir>] [--format text|json|markdown] [--json]\n  worktreeguard doctor <repo> [--format text|json|markdown] [--json]\n  worktreeguard release <repo> <task> [--pr <url>] [--force] [--json]\n`; }
export function run(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArgs(argv); const cmd = positional.shift();
  if (!cmd || flags.help || cmd === 'help') return help(); if (flags.version || cmd === 'version') return VERSION;
  const format = flags.json ? 'json' : (flags.format || 'text');
  if (cmd === 'lease') return formatReport({ repos: [{ ...inspectRepo(lease(positional[0] || '.', flags).repo), action: 'leased' }] }, format);
  if (cmd === 'status') { const root = flags.root || positional[0] || '.'; const repos = findRepos(root).map(inspectRepo); return formatReport(repos.length === 1 ? repos[0] : { generatedAt: nowIso(), repos }, format); }
  if (cmd === 'doctor') return formatReport(inspectRepo(positional[0] || '.'), format);
  if (cmd === 'release') { const lock = release(positional[0] || '.', positional[1], flags); return format === 'json' ? JSON.stringify({ released: lock }, null, 2) : `released ${lock.task} (${lock.path})`; }
  throw new CliError(`unknown command: ${cmd}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { console.log(run()); } catch (err) { console.error(redact(err.message || String(err))); process.exit(err.exitCode || 1); }
}
