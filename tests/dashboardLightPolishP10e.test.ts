import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/app/ui/responsiveDesign.css'), 'utf8');
const deadlinePanel = fs.readFileSync(path.join(root, 'src/app/features/deadlines/DeadlineDashboardPanel.tsx'), 'utf8');

function cssBlock(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = Array.from(css.matchAll(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'gm')));
  return matches.at(-1)?.[1] ?? '';
}

describe('dashboard light polish P10E', () => {
  it('haelt Fristen-Badges im Dashboard kantig und mit ausreichendem Innenabstand', () => {
    expect(deadlinePanel).toContain('<DeadlineStateBadge state={item.dashboardState} />');
    expect(deadlinePanel).toContain('<DeadlineSeverityBadge severity={item.severity} />');

    const badge = cssBlock('.industrial-deadline-panel .industrial-status-badge');
    expect(badge).toContain('border-radius: 0');
    expect(badge).toContain('padding-inline: 0.7rem');
  });

  it('setzt den Fristen-Warnhinweis kompakt neben das Icon statt in eine zweite Grid-Zeile', () => {
    expect(deadlinePanel).toContain('className="industrial-alert-danger"');

    const alert = cssBlock('.industrial-deadline-panel .industrial-alert-danger');
    const paragraph = cssBlock('.industrial-deadline-panel .industrial-alert-danger p');

    expect(alert).toContain('display: flex');
    expect(alert).toContain('align-items: flex-start');
    expect(alert).toContain('gap: 0.65rem');
    expect(paragraph).toContain('margin: 0');
  });

  it('stellt die Versionsbox im Light-Mode auf helle Industrial-Flaechen um', () => {
    const version = cssBlock("html[data-theme='light'] .industrial-version-badge");
    const strong = cssBlock("html[data-theme='light'] .industrial-version-badge strong");

    expect(version).toContain('background: linear-gradient(135deg, rgba(250, 250, 245, 0.95), rgba(226, 225, 214, 0.98))');
    expect(version).toContain('color: var(--text-secondary)');
    expect(strong).toContain('color: var(--industrial-accent)');
  });
});
