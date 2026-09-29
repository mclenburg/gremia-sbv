import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GremiaBrOpenActionsPanel, GremiaBrReadContextPanel } from '../../src/app/features/gremia-br/GremiaBrWorkspacePanels';
import { EMPTY_GREMIA_BR_DASHBOARD } from '../../src/app/features/gremia-br/gremiaBrWorkspaceModel';

describe('Gremia.BR Offene Aktionen', () => {
  it('zeigt eigene Aufgaben mit benannter Tabelle und textlichem Status ohne vertrauliche Details', () => {
    const html = renderToStaticMarkup(<GremiaBrOpenActionsPanel overview={{
      ...EMPTY_GREMIA_BR_DASHBOARD,
      ownTasks: [{ id: 'task-1', title: 'Stellungnahme prüfen', status: 'BLOCKED', dueAt: '2026-10-01T10:00:00.000Z' }],
      ownAccessApprovals: [{ id: 'approval-1', resourceType: 'DOCUMENT', status: 'PENDING', requestedAt: '2026-10-01T11:00:00.000Z' }],
    }} />);

    expect(html).toContain('aria-label="Eigene offene Gremia.BR-Aktionen"');
    expect(html).toContain('Stellungnahme prüfen');
    expect(html).toContain('Blockiert');
    expect(html).toContain('Zugriffsantrag');
    expect(html).toContain('Beantragt');
    expect(html).toContain('Fällig');
    expect(html).not.toContain('task-1');
    expect(html).not.toContain('approval-1');
  });

  it('zeigt den letzten manuellen Abruf und eine eindeutige Aktualisierungsaktion', () => {
    const html = renderToStaticMarkup(<GremiaBrReadContextPanel busy={false} onRefresh={() => undefined} lastFetchedAt="2026-10-01T10:00:00.000Z" />);

    expect(html).toContain('Gremia.BR aktualisieren');
    expect(html).toContain('Letzter erfolgreicher Abruf');
    expect(html).toContain('dateTime="2026-10-01T10:00:00.000Z"');
  });
});
