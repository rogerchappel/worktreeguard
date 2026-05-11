/**
 * worktreeguard configuration loader.
 * Reads optional `.worktreeguard/config.json` from the repo root.
 * Falls back to built-in defaults.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_CONFIG = {
  lanePrefix: 'agent',
  defaultDays: 7,
  defaultBase: 'main',
  worktreeRoot: '.worktrees',
  lockDir: '.worktreeguard/leases',
  releaseDir: '.worktreeguard/releases',
  redactPatterns: ['ghp_', 'github_pat_', 'sk-', 'xoxb-', 'xoxp-', 'xoxr-', 'xoxs-'],
  maxActiveLanes: 10,
  warnBeforeExpiryHours: 24,
};

export function loadConfig(repo) {
  const cfgPath = join(repo, '.worktreeguard', 'config.json');
  if (!existsSync(cfgPath)) return { ...DEFAULT_CONFIG };
  try {
    const user = JSON.parse(readFileSync(cfgPath, 'utf8'));
    return { ...DEFAULT_CONFIG, ...user };
  } catch (err) {
    throw new Error(`Invalid .worktreeguard/config.json: ${err.message}`);
  }
}

export function getLaneBranch(task, config = DEFAULT_CONFIG) {
  return `${config.lanePrefix}/${slugify(task)}`;
}

export function getWorktreePath(repo, task, config = DEFAULT_CONFIG) {
  const root = join(repo, '..', config.worktreeRoot);
  return join(root, `${basename(repo)}-${slugify(task)}`);
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function basename(p) {
  return p.replace(/[/\\]+$/, '').split(/[/\\]/).pop();
}
