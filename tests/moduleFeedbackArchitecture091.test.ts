import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function collectFeatureViews(dir = 'src/app/features'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) return collectFeatureViews(path);
    return entry.isFile() && entry.name.endsWith('View.tsx') ? [path] : [];
  });
}

describe('module feedback architecture', () => {
  it('requires reusable ModuleFeedback in every ModuleFrame-backed feature view', () => {
    const missing = collectFeatureViews()
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return source.includes('<ModuleFrame') && !source.includes('<ModuleFeedback');
      });

    expect(missing).toEqual([]);
  });

  it('routes process overview feedback through the shared ModuleFeedback-backed overview page', () => {
    const missingFeedbackItems = collectFeatureViews()
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return source.includes('<ProcessOverviewPage') && !source.includes('feedbackItems=');
      });

    expect(missingFeedbackItems).toEqual([]);
  });
});
