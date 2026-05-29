import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8').replace(/\s+/g, ' ');

describe('Textarea Industrial Design', () => {
  it('gestaltet große Textfelder in Industrial-Formularen nicht mit Browser-Grau', () => {
    expect(css).toContain('.industrial-form textarea');
    expect(css).toContain('.industrial-settings-form textarea');
    expect(css).toContain('background: #050505');
    expect(css).toContain('caret-color: var(--sbv-yellow)');
    expect(css).toContain('color-scheme: dark');
  });

  it('zieht Textareas in Modalen und im Light-Mode in den zentralen Formularvertrag', () => {
    expect(css).toContain('.industrial-modal-grid textarea');
    expect(css).toContain("html[data-theme='light'] .industrial-modal-grid textarea");
    expect(css).toContain("html[data-theme='light'] .industrial-settings-form textarea");
  });
});
