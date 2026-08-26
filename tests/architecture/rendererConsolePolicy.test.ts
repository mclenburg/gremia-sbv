import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

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
});
