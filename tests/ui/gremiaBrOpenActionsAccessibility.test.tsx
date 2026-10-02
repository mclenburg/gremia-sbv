import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GremiaBrAccessApprovalsPanel, GremiaBrOpenActionsPanel, GremiaBrReadContextPanel } from '../../src/app/features/gremia-br/GremiaBrWorkspacePanels';
import { GremiaBrTaskDetailDialog } from '../../src/app/features/gremia-br/GremiaBrTaskDetailDialog';
import { GremiaBrProcedureOwnTasks } from '../../src/app/features/gremia-br/GremiaBrProcedureReferenceViews';
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

  it('trennt abgeschlossene Anträge von offenen Aktionen und zeigt eigene Status datensparsam an', () => {
    const overview = {
      ...EMPTY_GREMIA_BR_DASHBOARD,
      ownAccessApprovals: [
        { id: 'approval-1', resourceType: 'DOCUMENT', status: 'PENDING' as const, requestedAt: '2026-10-01T11:00:00.000Z' },
        { id: 'approval-2', resourceType: 'DOCUMENT', status: 'APPROVED' as const, requestedAt: '2026-09-30T11:00:00.000Z' },
      ],
    };
    const openActions = renderToStaticMarkup(<GremiaBrOpenActionsPanel overview={overview} onOpenTask={() => undefined} />);
    const requests = renderToStaticMarkup(<GremiaBrAccessApprovalsPanel approvals={overview.ownAccessApprovals} />);

    expect(openActions).toContain('Beantragt');
    expect(openActions).not.toContain('Genehmigt');
    expect(requests).toContain('aria-label="Eigene Gremia.BR-Zugriffsanträge"');
    expect(requests).toContain('Ausstehend');
    expect(requests).toContain('Genehmigt');
    expect(requests).not.toContain('approval-1');
    expect(requests).not.toContain('approval-2');
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

  it('zeigt eine zugängliche Statussuche, ohne geschlossene Optionen vorwegzunehmen', () => {
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
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Status wählen');
    expect(html).not.toContain('In Bearbeitung');
    expect(html).not.toContain('Blockiert');
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

  it('zeigt im Verfahren nur eigene offene Aufgaben mit passendem Verfahrensbezug', () => {
    const html = renderToStaticMarkup(<GremiaBrProcedureOwnTasks
      procedureId="procedure-1"
      tasks={[
        { id: 'own-task', title: 'Stellungnahme abschließen', status: 'OPEN', subjectType: 'PROCEDURE', subjectId: 'procedure-1' },
        { id: 'other-procedure', title: 'Anderes Verfahren', status: 'OPEN', subjectType: 'PROCEDURE', subjectId: 'procedure-2' },
        { id: 'meeting-task', title: 'Sitzungsaufgabe', status: 'OPEN', subjectType: 'MEETING', subjectId: 'procedure-1' },
      ]}
      onOpenTask={() => undefined}
    />);

    expect(html).toContain('aria-label="Eigene offene Aufgaben dieses Verfahrens"');
    expect(html).toContain('Stellungnahme abschließen');
    expect(html).toContain('aria-label="Details zu Stellungnahme abschließen"');
    expect(html).not.toContain('Anderes Verfahren');
    expect(html).not.toContain('Sitzungsaufgabe');
    expect(html).not.toContain('own-task');
  });
});
