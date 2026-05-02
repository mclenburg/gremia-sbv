import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('Accessibility CSS', () => {
  const css = fs.readFileSync('src/app/accessibility.css', 'utf8');

  it('stellt sichtbare Fokusmarkierung bereit', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline');
  });

  it('stellt deaktivierte Dashboard-Kacheln klar dar', () => {
    expect(css).toContain('.industrial-dashboard-card.is-disabled');
    expect(css).toContain('cursor: not-allowed');
  });
});
