import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type TempFileScope =
  | "document-preview"
  | "report-preview"
  | "report-render"
  | "misc";

export interface TempFileCleanupResult {
  deleted: number;
  failed: number;
  remaining: number;
  bytesRemaining: number;
  directories: string[];
}

export interface TempFileStatus extends TempFileCleanupResult {
  root: string;
  oldestRemainingAt?: string;
}

const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;
const TEMP_SCOPES: TempFileScope[] = [
  "document-preview",
  "report-preview",
  "report-render",
  "misc",
];

function safeFileName(name: string, fallback: string): string {
  const base = path
    .basename(name || fallback)
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim();
  return base || fallback;
}

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      result.push(entryPath);
    }
  }
  return result;
}

export class TempFileService {
  constructor(private readonly dataDir: string) {}

  get root(): string {
    return path.join(this.dataDir, "tmp");
  }

  ensureLayout(): void {
    mkdirSync(this.root, { recursive: true });
    for (const scope of TEMP_SCOPES) {
      mkdirSync(this.scopeDir(scope), { recursive: true });
    }
  }

  scopeDir(scope: TempFileScope): string {
    return path.join(this.root, scope);
  }

  buildPath(
    scope: TempFileScope,
    originalFileName: string,
    prefix = "preview",
  ): string {
    this.ensureLayout();
    const safeName = safeFileName(originalFileName, "arbeitskopie.bin");
    return path.join(
      this.scopeDir(scope),
      `${prefix}-${Date.now()}-${safeName}`,
    );
  }

  write(
    scope: TempFileScope,
    originalFileName: string,
    content: Buffer,
    prefix = "preview",
  ): string {
    const target = this.buildPath(scope, originalFileName, prefix);
    writeFileSync(target, content, { mode: 0o600 });
    return target;
  }

  cleanup(maxAgeMs = 0): TempFileCleanupResult {
    this.ensureLayout();
    const now = Date.now();
    let deleted = 0;
    let failed = 0;
    const directories = [
      this.root,
      ...TEMP_SCOPES.map((scope) => this.scopeDir(scope)),
    ];

    for (const filePath of walkFiles(this.root)) {
      try {
        const stat = statSync(filePath);
        if (maxAgeMs <= 0 || now - stat.mtimeMs >= maxAgeMs) {
          rmSync(filePath, { force: true });
          deleted += 1;
        }
      } catch {
        failed += 1;
      }
    }

    const status = this.status();
    return {
      deleted,
      failed,
      remaining: status.remaining,
      bytesRemaining: status.bytesRemaining,
      directories,
    };
  }

  cleanupStale(maxAgeMs = DEFAULT_MAX_AGE_MS): TempFileCleanupResult {
    return this.cleanup(maxAgeMs);
  }

  status(): TempFileStatus {
    this.ensureLayout();
    let remaining = 0;
    let bytesRemaining = 0;
    let oldest = Number.POSITIVE_INFINITY;
    for (const filePath of walkFiles(this.root)) {
      try {
        const stat = statSync(filePath);
        remaining += 1;
        bytesRemaining += stat.size;
        oldest = Math.min(oldest, stat.mtimeMs);
      } catch {
        // Status ist best-effort; nicht lesbare Dateien werden im Cleanup als Fehler sichtbar.
      }
    }
    return {
      root: this.root,
      deleted: 0,
      failed: 0,
      remaining,
      bytesRemaining,
      directories: [
        this.root,
        ...TEMP_SCOPES.map((scope) => this.scopeDir(scope)),
      ],
      oldestRemainingAt: Number.isFinite(oldest)
        ? new Date(oldest).toISOString()
        : undefined,
    };
  }
}
