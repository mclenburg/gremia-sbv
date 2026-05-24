import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/app/ui/responsiveDesign.css'), 'utf8');
const deadlinePanel = fs.readFileSync(path.join(root, 'src/app/features/deadlines/DeadlineDashboardPanel.tsx'), 'utf8');

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm'));
  return match?.[1] ?? '';
}

describe('dashboard polish P10C', () => {
  it('haelt die Dashboard-Focus-Badges konsequent kantig und mit lesbarem Innenabstand', () => {
    const marker = cssBlock('.dashboard-focus-marker');

    expect(marker).toContain('border-radius: 0');
    expect(marker).toMatch(/padding:\s*0\.2rem\s+0\.7rem|padding-inline:\s*0\.7rem/);
    expect(marker).not.toContain('border-radius: 999px');
  });

  it('formatiert den Fristenzähler harmonischer als Dashboard-Metrik', () => {
    expect(deadlinePanel).toContain('className="industrial-counter industrial-deadline-counter"');
    expect(deadlinePanel).toContain('<span>Offene Fristen</span>');

    const counterStrong = cssBlock('.industrial-deadline-counter strong');
    const counterLabel = cssBlock('.industrial-deadline-counter span');

    expect(counterStrong).toContain('font-size: 2rem');
    expect(counterLabel).toContain('font-family: inherit');
    expect(counterLabel).toContain('text-transform: none');
    expect(counterLabel).toContain('font-weight: 650');
  });
});
