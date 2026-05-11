/**
 * Output formatter for worktreeguard.
 * Renders lease reports in text, JSON, and Markdown formats.
 * Designed for both terminal consumption and CI/agent handoff.
 */

import { basename } from 'node:path';
import { redactSecrets, isExpiringSoon } from './policy.js';

export function formatReport(report, format = 'text', options = {}) {
  if (format === 'json') return JSON.stringify(report, null, 2);
  const reports = report.repos || [report];
  const md = format === 'markdown';
  const heading = (level, text) => md ? `${'#'.repeat(level + 1)} ${text}` : text;
  const lines = [];

  lines.push(heading(0, 'WorktreeGuard Report'));
  if (md) lines.push('');
  lines.push(`Generated: ${report.generatedAt ?? reports[0]?.generatedAt ?? 'unknown'}`);
  if (md) lines.push('');

  for (const r of reports) {
    lines.push(heading(1, basename(r.repo)));
    if (md) lines.push('');

    // Summary table
    const summary = r.summary || {};
    if (md) {
      lines.push(`| Metric | Count |`);
      lines.push(`|---|---|`);
      lines.push(`| Worktrees | ${summary.worktrees ?? 0} |`);
      lines.push(`| Dirty | ${summary.dirty ?? 0} |`);
      lines.push(`| Stale | ${summary.stale ?? 0} |`);
      lines.push(`| Risks | ${summary.risks ?? r.risks?.length ?? 0} |`);
      if (md) lines.push('');
    } else {
      lines.push(`worktrees=${summary.worktrees ?? 0}  dirty=${summary.dirty ?? 0}  stale=${summary.stale ?? 0}  risks=${r.risks?.length ?? summary.risks ?? 0}`);
    }

    // Lanes
    if (md && r.lanes?.length) {
      lines.push(`| Task | Branch | Path | Status | Risks |`);
      lines.push(`|---|---|---|---|---|`);
      for (const lane of r.lanes) {
        const status = lane.dirty
          ? '🔴 dirty'
          : lane.stale
            ? '🟡 stale'
            : lane.missingWorktree
              ? '⚫ missing'
              : '🟢 ok';
        const risks = lane.risks?.length ? lane.risks.map(redactSecrets).join(', ') : '—';
        const task = lane.task ?? basename(lane.path);
        const branch = lane.branch ?? 'detached';
        const path = lane.path;
        lines.push(`| ${task} | ${branch} | ${path} | ${status} | ${risks} |`);
      }
      lines.push('');
    } else if (r.lanes?.length) {
      for (const lane of r.lanes) {
        const task = lane.task ?? basename(lane.path);
        const branch = lane.branch ?? 'detached';
        const status = lane.dirty
          ? `dirty [${lane.risks.join(',')}]`
          : lane.risks?.length
            ? lane.risks.join(',')
            : 'ok';
        lines.push(`- ${task} [${branch}] ${status} ${lane.path}`);
      }
      lines.push('');
    }

    // Expiry warnings
    if (md && r.lanes) {
      const expiring = r.lanes.filter(l => isExpiringSoon(l.expiresAt));
      if (expiring.length) {
        lines.push(heading(2, '⏰ Expiring Soon'));
        lines.push('');
        for (const lane of expiring) {
          const hoursLeft = Math.round((Date.parse(lane.expiresAt) - Date.now()) / 3600000);
          lines.push(`- **${lane.task}** — expires in ~${hoursLeft}h`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function formatSummary(reports) {
  const list = reports.repos || (Array.isArray(reports) ? reports : [reports]);
  const total = list.length;
  const dirty = list.reduce((n, r) => n + (r.summary?.dirty ?? 0), 0);
  const stale = list.reduce((n, r) => n + (r.summary?.stale ?? 0), 0);
  const lanes = list.reduce((n, r) => n + (r.lanes?.length ?? 0), 0);
  return { total, lanes, dirty, stale };
}
