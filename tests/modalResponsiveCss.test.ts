import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('modal responsive css', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/caseModalResponsive.css'), 'utf8');

  it('verhindert horizontales Überlaufen des Backdrops', () => {
    expect(css).toContain('.industrial-modal-backdrop');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('max-width: 100vw');
  });

  it('begrenzt Modals auf den Viewport und erlaubt vertikales Scrollen', () => {
    expect(css).toContain('max-width: calc(100vw - 1.5rem)');
    expect(css).toContain('max-height: calc(100vh - 1.5rem)');
    expect(css).toContain('overflow-y: auto');
  });

  it('erzwingt umbrechende Formularraster und responsive Buttons', () => {
    expect(css).toContain('repeat(auto-fit, minmax(min(17rem, 100%), 1fr))');
    expect(css).toContain('flex-wrap: wrap');
    expect(css).toContain('@media (max-width: 720px)');
  });
});
