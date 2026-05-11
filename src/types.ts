// WorktreeGuard type definitions

export interface LeaseInfo {
  task: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  base: string;
  createdAt: string;
  expiresAt: string;
  pr?: string | null;
  releasedAt?: string | null;
}

export interface WorktreeLane {
  path: string;
  branch: string | null;
  head: string | null;
  task: string | null;
  owner: string | null;
  expiresAt: string | null;
  pr: string | null;
  dirty: boolean;
  dirtyFiles: string[];
  risks: string[];
  stale: boolean;
  missingWorktree: boolean;
  upstreamMissing: boolean;
  duplicateBranch: boolean;
}

export interface RepoSummary {
  worktrees: number;
  dirty: number;
  stale: number;
  risks: number;
}

export interface InspectReport {
  repo: string;
  generatedAt: string;
  summary: RepoSummary;
  risks: string[];
  lanes: WorktreeLane[];
}

export type RiskFlag =
  | 'dirty'
  | 'stale'
  | 'missing-worktree'
  | 'duplicate-branch'
  | 'missing-upstream'
  | 'unpushed-commits';

export type OutputFormat = 'text' | 'json' | 'markdown';

export interface LeaseOptions {
  task: string;
  base?: string;
  owner?: string;
  days?: number;
  pr?: string;
  expiresAt?: string;
  root?: string;
  path?: string;
  branch?: string;
  json?: boolean;
}

export interface ReleaseOptions {
  pr?: string;
  force?: boolean;
  json?: boolean;
}

export interface StatusOptions {
  root?: string;
  format: OutputFormat;
  json?: boolean;
}
