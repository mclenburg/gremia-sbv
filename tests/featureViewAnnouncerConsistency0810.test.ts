import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const participation = readFileSync('src/app/features/participation/ParticipationView.tsx', 'utf8');
const workplace = readFileSync('src/app/features/workplace-accommodation/WorkplaceAccommodationView.tsx', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');

describe('0.8.10 feature view announcer consistency', () => {
  it('keeps feature views with relevant status or navigation feedback wired to useAnnouncer', () => {
    expect(participation).toContain('useAnnouncer');
    expect(participation).toContain("announce(error, 'assertive')");
    expect(workplace).toContain('useAnnouncer');
    expect(workplace).toContain('openAccommodation');
  });

  it('keeps native Electron dependency rebuild tied to npm install without npx auto install wording', () => {
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps');
    expect(readme).toContain('electron-builder install-app-deps');
    expect(readme).not.toContain('npx electron-builder install-app-deps');
  });
});
