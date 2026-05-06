import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const view = readFileSync('src/app/features/workplace-accommodation/WorkplaceAccommodationView.tsx', 'utf8');

describe('0.8.10 WorkplaceAccommodationView accessibility', () => {
  it('uses useAnnouncer for user initiated navigation feedback', () => {
    expect(view).toContain("useAnnouncer");
    expect(view).toContain('const announce = useAnnouncer()');
    expect(view).toContain('function openAccommodation');
    expect(view).toContain('announce(`Arbeitsplatzgestaltungsmaßnahme');
  });

  it('does not announce from render-only summary calculations', () => {
    expect(view).not.toContain('useEffect(');
    expect(view).toContain('onClick={() => openAccommodation(item)}');
  });
});
