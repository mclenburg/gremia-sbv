import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GremiaBrOpenActionsPanel, GremiaBrReadContextPanel } from '../../src/app/features/gremia-br/GremiaBrWorkspacePanels';
import { GremiaBrTaskDetailDialog } from '../../src/app/features/gremia-br/GremiaBrTaskDetailDialog';
import { EMPTY_GREMIA_BR_DASHBOARD } from '../../src/app/features/gremia-br/gremiaBrWorkspaceModel';

describe('Gremia.BR Offene Aktionen', () => {
  it('zeigt eigene Aufgaben mit benannter Tabelle und textlichem Status ohne vertrauliche Details', () => {
    const html = renderToStaticMarkup(<GremiaBrOpenActionsPanel overview={{
      ...EMPTY_GREMIA_BR_DASHBOARD,
      ownTasks: [{ id: 'task-1', title: 'Stellungnahme prüfen', status: 'BLOCKED', dueAt: '2026-10-01T10:00:00.000Z', subjectType: 'AGENDA_ITEM' }],
      ownAccessApprovals: [{ id: 'approval-1', resourceType: 'DOCUMENT', status: 'PENDING', requestedAt: '2026-10-01T11:00:00.000Z' }],
    }} onOpenTask={() => undefined} />);

    expect(html).toContain('aria-label="Eigene offene Gremia.BR-Aktionen"');
    expect(html).toContain('aria-label="Details zu Stellungnahme prüfen"');
    expect(html).toContain('Stellungnahme prüfen');
    expect(html).toContain('Blockiert');
    expect(html).toContain('Tagesordnungspunkt');
    expect(html).toContain('Zugriffsantrag');
    expect(html).toContain('Beantragt');
    expect(html).toContain('Fällig');
    expect(html).not.toContain('task-1');
    expect(html).not.toContain('approval-1');
  });

  it('zeigt Details nur im zugänglichen Dialog und ohne technische Kennungen', () => {
    const html = renderToStaticMarkup(<GremiaBrTaskDetailDialog
      title="Stellungnahme prüfen"
      detail={{ id: 'task-1', title: 'Stellungnahme prüfen', status: 'OPEN', version: 3, description: 'Vertraulicher Aufgabentext' }}
      busy={false}
      error=""
      transitionOptions={null}
      selectedTransition=""
      optionsBusy={false}
      transitionBusy={false}
      status=""
      onLoadTransitions={() => undefined}
      onSelectTransition={() => undefined}
      onSubmitTransition={() => undefined}
      onReloadDetail={() => undefined}
      onClose={() => undefined}
    />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Vertraulicher Aufgabentext');
    expect(html).toContain('Schließen');
    expect(html).toContain('Statusänderungen abrufen');
    expect(html).not.toContain('task-1');
  });

  it('bietet nur die vom Server gelieferten Statusoptionen in einer zugänglichen Suche an', () => {
    const html = renderToStaticMarkup(<GremiaBrTaskDetailDialog
      title="Prüfung"
      detail={{ id: 'task-1', title: 'Prüfung', status: 'OPEN', version: 3 }}
      busy={false}
      error=""
      transitionOptions={{ from: 'OPEN', allowed: ['IN_PROGRESS', 'BLOCKED'] }}
      selectedTransition=""
      optionsBusy={false}
      transitionBusy={false}
      status=""
      onLoadTransitions={() => undefined}
      onSelectTransition={() => undefined}
      onSubmitTransition={() => undefined}
      onReloadDetail={() => undefined}
      onClose={() => undefined}
    />);

    expect(html).toContain('Neuer Status');
    expect(html).toContain('In Bearbeitung');
    expect(html).toContain('Blockiert');
    expect(html).toContain('Status wählen');
    expect(html).not.toContain('Erledigt');
  });

  it('benennt die schreibende Aktion mit dem ausgewählten Zielstatus', () => {
    const html = renderToStaticMarkup(<GremiaBrTaskDetailDialog
      title="Prüfung"
      detail={{ id: 'task-1', title: 'Prüfung', status: 'OPEN', version: 3 }}
      busy={false}
      error=""
      transitionOptions={{ from: 'OPEN', allowed: ['IN_PROGRESS'] }}
      selectedTransition="IN_PROGRESS"
      optionsBusy={false}
      transitionBusy={false}
      status=""
      onLoadTransitions={() => undefined}
      onSelectTransition={() => undefined}
      onSubmitTransition={() => undefined}
      onReloadDetail={() => undefined}
      onClose={() => undefined}
    />);

    expect(html).toContain('Status zu In Bearbeitung ändern');
  });

  it('zeigt den letzten manuellen Abruf und eine eindeutige Aktualisierungsaktion', () => {
    const html = renderToStaticMarkup(<GremiaBrReadContextPanel busy={false} onRefresh={() => undefined} lastFetchedAt="2026-10-01T10:00:00.000Z" />);

    expect(html).toContain('Gremia.BR aktualisieren');
    expect(html).toContain('Letzter erfolgreicher Abruf');
    expect(html).toContain('möglicherweise veraltet');
    expect(html).toContain('dateTime="2026-10-01T10:00:00.000Z"');
  });
});
