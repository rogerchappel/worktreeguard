/**
 * Safety policy layer for worktreeguard.
 * Defines guard rules for destructive operations, token redaction,
 * and lane-count constraints.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function enforceMaxLanes(repo, count, max = 10) {
  if (count >= max) {
    throw new PolicyError(
      `refusing to create lane: ${count}/${max} active. Release one first or raise maxActiveLanes in .worktreeguard/config.json`,
      'LANE_LIMIT'
    );
  }
}

export function checkPolicy(repo, lanes, config) {
  const violations = [];
  const counts = { dirty: 0, stale: 0, duplicate: 0 };
  for (const lane of lanes) {
    if (lane.dirty) counts.dirty++;
    if (lane.stale) counts.stale++;
    if (lane.duplicateBranch) counts.duplicate++;
  }
  if (counts.duplicate > 0) {
    violations.push(`duplicate branch detected in ${counts.duplicate} lane(s) — risk of concurrent mutation`);
  }
  if (counts.dirty > 5) {
    violations.push(`${counts.dirty} dirty lanes — consider cleaning up or committing before creating more`);
  }
  if (counts.stale > 3) {
    violations.push(`${counts.stale} stale lanes — run "worktreeguard status" and release expired leases`);
  }
  return { ok: violations.length === 0, violations, counts };
}

export function redactSecrets(text) {
  const patterns = [
    /ghp_[A-Za-z0-9_]{20,}/g,
    /github_pat_[A-Za-z0-9_]{20,}/g,
    /sk-[A-Za-z0-9_]{20,}/g,
    /xox[baprs]-[A-Za-z0-9_\-]{10,}/g,
  ];
  let result = String(text);
  for (const re of patterns) {
    result = result.replace(re, '[REDACTED]');
  }
  return result;
}

export function isExpiringSoon(expiresAt, warnHours = 24) {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  if (isNaN(expiry)) return false;
  return (expiry - Date.now()) < warnHours * 3600 * 1000 && expiry > Date.now();
}

export class PolicyError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
