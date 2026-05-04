import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('services/reportService.ts', 'utf8');

describe('0.8.5-a report PDF layout fix', () => {
  it('renders markdown report sections with flat report-section containers', () => {
    expect(source).toContain('function markdownToReportHtml');
    expect(source).toContain('let inSection = false');
    expect(source).toContain('function closeSection()');
    expect(source).toContain('function startSection(headingHtml: string)');
    expect(source).toContain('<section class="report-section">');
  });

  it('does not use the old markdown heading behavior that nested unclosed boxes', () => {
    expect(source).not.toContain('<section class="box"><h2>${inlineMarkdown(line.slice(3))}</h2>');
    expect(source).not.toContain('<section class="box"><table><tbody>');
  });

  it('keeps report CSS flat and printable', () => {
    expect(source).toContain('.box, .report-section');
    expect(source).toContain('break-inside: avoid');
    expect(source).toContain('.report-table-section');
  });
});
