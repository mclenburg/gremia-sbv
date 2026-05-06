import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

describe('0.8.12 native dependency postinstall guard', () => {
  it('keeps electron-builder install-app-deps as exact postinstall contract', () => {
    expect(packageJson.scripts.postinstall).toBe('electron-builder install-app-deps');
    expect(packageJson.scripts.postinstall).not.toContain('npx');
  });
});
