import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function collectFeatureComponents(dir = 'src/app/features'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) return collectFeatureComponents(path);
    return entry.isFile() && (entry.name.endsWith('View.tsx') || entry.name.endsWith('Panel.tsx')) ? [path] : [];
  });
}

describe('module feedback architecture', () => {
  it('requires reusable ModuleFeedback in every ModuleFrame-backed feature view', () => {
    const missing = collectFeatureComponents()
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return source.includes('<ModuleFrame') && !source.includes('<ModuleFeedback');
      });

    expect(missing).toEqual([]);
  });

  it('requires async panels with visible status changes to use the shared live announcer', () => {
    const missingAnnouncer = collectFeatureComponents()
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        const hasAsyncOperation = source.includes('async function') || source.includes('async (');
        const hasVisibleStatusChange = source.includes('setError(') || source.includes('setMessage(') || source.includes('setInfo(');
        return file.endsWith('Panel.tsx') && hasAsyncOperation && hasVisibleStatusChange && !source.includes('useAnnouncer');
      });

    expect(missingAnnouncer).toEqual([]);
  });

  it('routes process overview feedback through the shared ModuleFeedback-backed overview page', () => {
    const missingFeedbackItems = collectFeatureComponents()
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return source.includes('<ProcessOverviewPage') && !source.includes('feedbackItems=');
      });

    expect(missingFeedbackItems).toEqual([]);
  });
});
