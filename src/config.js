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

const CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIG));

function invalid(field, expectation) {
  throw new Error(`Invalid .worktreeguard/config.json field "${field}": ${expectation}`);
}

function nonEmptyString(config, field) {
  const value = config[field];
  if (typeof value !== 'string' || !value.trim()) invalid(field, 'must be a non-empty string');
}

function safeRefValue(config, field) {
  nonEmptyString(config, field);
  const value = config[field];
  if (/\s|[~^:?*\[\\]|\.\.|@\{|(^|\/)\.|\.$|\/$|^\//.test(value)) {
    invalid(field, 'must be a safe Git branch or prefix value');
  }
}

function safeRelativePath(config, field) {
  nonEmptyString(config, field);
  const value = config[field];
  if (/^(?:\/|[A-Za-z]:[\\/])/.test(value) || value.split(/[\\/]+/).some(part => part === '..')) {
    invalid(field, 'must be a relative path without parent-directory traversal');
  }
}

export function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Invalid .worktreeguard/config.json: expected a JSON object');
  }
  for (const field of Object.keys(config)) {
    if (!CONFIG_KEYS.has(field)) invalid(field, 'is not a supported configuration field');
  }
  safeRefValue(config, 'lanePrefix');
  safeRefValue(config, 'defaultBase');
  for (const field of ['worktreeRoot', 'lockDir', 'releaseDir']) safeRelativePath(config, field);
  if (!Number.isFinite(config.defaultDays) || config.defaultDays <= 0) invalid('defaultDays', 'must be a finite number greater than zero');
  if (!Number.isInteger(config.maxActiveLanes) || config.maxActiveLanes < 1) invalid('maxActiveLanes', 'must be a positive integer');
  if (!Number.isFinite(config.warnBeforeExpiryHours) || config.warnBeforeExpiryHours < 0) invalid('warnBeforeExpiryHours', 'must be a finite number greater than or equal to zero');
  if (!Array.isArray(config.redactPatterns) || config.redactPatterns.some(value => typeof value !== 'string' || !value)) {
    invalid('redactPatterns', 'must be an array of non-empty strings');
  }
  return config;
}

export function loadConfig(repo) {
  const cfgPath = join(repo, '.worktreeguard', 'config.json');
  if (!existsSync(cfgPath)) return { ...DEFAULT_CONFIG };
  try {
    const user = JSON.parse(readFileSync(cfgPath, 'utf8'));
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new Error('expected a JSON object');
    }
    return validateConfig({ ...DEFAULT_CONFIG, ...user });
  } catch (err) {
    if (err.message.startsWith('Invalid .worktreeguard/config.json')) throw err;
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
