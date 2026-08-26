import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  buildRendererConsoleDiagnostic,
  shouldForwardRendererConsoleDiagnostics,
} from '../../electron/rendererConsoleDiagnostics';

function appSourceFiles(directory = join(process.cwd(), 'src/app')): string[] {
  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    const absolute = join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) return appSourceFiles(absolute);
    return /\.(?:ts|tsx)$/.test(entry) ? [absolute] : [];
  });
}

describe('Renderer-Diagnostik', () => {
  it('nutzt keine direkt aktive Browser-Konsole in der Anwendungsschicht', () => {
    const offenders = appSourceFiles()
      .filter((file) => !file.endsWith('src/app/core/diagnostics/rendererDiagnostics.ts'))
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        return /console\.(?:log|info|warn|error|debug)\s*\(/.test(source)
          ? [relative(process.cwd(), file)]
          : [];
      });

    expect(offenders).toEqual([]);
  });

  it('leitet Renderer-Konsolenmeldungen nicht standardmäßig und niemals mit Rohinhalt weiter', () => {
    expect(shouldForwardRendererConsoleDiagnostics(false, undefined)).toBe(false);
    expect(shouldForwardRendererConsoleDiagnostics(true, '1')).toBe(false);
    expect(shouldForwardRendererConsoleDiagnostics(false, '1')).toBe(true);

    const diagnostic = buildRendererConsoleDiagnostic(2, 'Name: Erika Muster, GdB 80', 42);
    expect(diagnostic.prefix).toBe('Gremia.SBV renderer console error');
    expect(diagnostic.metadata).toEqual({ level: 2, line: 42, messageLength: 26 });
    expect(JSON.stringify(diagnostic)).not.toContain('Erika');
    expect(JSON.stringify(diagnostic)).not.toContain('GdB');
  });
});
