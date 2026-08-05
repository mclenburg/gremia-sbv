export interface ExplicitAnyFinding {
  id: string;
  file: string;
  line: number;
  column: number;
  category: string;
  symbol: string;
  context: string;
  ordinal: number;
}

export interface ExplicitAnySummary {
  total: number;
  files: number;
  byArea: Record<string, number>;
  byCategory: Record<string, number>;
  byFile: Record<string, number>;
}

export interface ExplicitAnyAudit {
  findings: ExplicitAnyFinding[];
  summary: ExplicitAnySummary;
  scannedFiles: number;
}

export interface ExplicitAnyBaseline {
  schemaVersion: 1;
  findings: Array<Omit<ExplicitAnyFinding, 'line' | 'column'>>;
}

export function auditExplicitAny(rootDirectory: string, options?: { ignoredDirectories?: string[] }): ExplicitAnyAudit;
export function collectTypeScriptFiles(rootDirectory: string, options?: { ignoredDirectories?: string[] }): string[];
export function compareWithBaseline(
  audit: ExplicitAnyAudit,
  baseline: ExplicitAnyBaseline,
): { additions: ExplicitAnyFinding[]; removals: ExplicitAnyBaseline['findings'] };
export function validateBaseline(baseline: unknown): ExplicitAnyBaseline;
export function summarizeFindings(findings: ExplicitAnyFinding[]): ExplicitAnySummary;
