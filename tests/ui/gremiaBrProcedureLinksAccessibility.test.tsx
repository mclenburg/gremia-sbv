import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GremiaBrProcedureLinksPanel } from '../../src/app/features/gremia-br/GremiaBrProcedureLinksPanel';
import { EMPTY_GREMIA_BR_DASHBOARD } from '../../src/app/features/gremia-br/gremiaBrWorkspaceModel';
import type { GremiaBrExternalReferenceRecord } from '../../src/domain/models/gremia-br.model';

const noop = () => undefined;

describe('Gremia.BR-Verfahrensverknüpfung', () => {
  it('zeigt fachliche Auswahl und lädt Details nur über eine ausdrücklich benannte Aktion', () => {
    const html = renderToStaticMarkup(<GremiaBrProcedureLinksPanel
      cases={[]}
      overview={{ ...EMPTY_GREMIA_BR_DASHBOARD, lastFetchedAt: '2026-09-29T10:00:00.000Z', accessibleCases: [{ id: 'remote-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }] }}
      localCaseId=""
      remoteCaseId="remote-1"
      procedureId="procedure-1"
      detail={null}
      links={[]}
      informationRequests={[]}
      informationRequestsProcedureId=""
      requestItems=""
      requestReason=""
      responseDueDate=""
      busy={false}
      disabled={false}
      onLocalCaseChange={noop}
      onRemoteCaseChange={noop}
      onProcedureChange={noop}
      onLoadDetail={noop}
      onLoadInformationRequests={noop}
      onCreateInformationRequest={noop}
      onRequestItemsChange={noop}
      onRequestReasonChange={noop}
      onResponseDueDateChange={noop}
      onLink={noop}
      onUnlink={noop}
    />);

    expect(html).toContain('Lokale Fallakte');
    expect(html).toContain('Gremia.BR-Sachverhalt');
    expect(html).toContain('BR-2026-17');
    expect(html).toContain('Verfahrensdetails laden');
    expect(html).not.toContain('Informationsanforderung erstellen');
    const visibleText = html.replace(/<[^>]*>/g, '');
    expect(visibleText).not.toContain('procedure-1');
    expect(visibleText).not.toContain('remote-1');
  });

  it('zeigt geladene Verfahrensdaten und eine gezielte Aufhebung vorhandener Beziehungen', () => {
    const link: GremiaBrExternalReferenceRecord = {
      id: 'link-1', caseId: 'local-1', sourceSystem: 'gremia_br', sourceType: 'verfahren', sourceId: 'procedure-1',
      title: 'BR-2026-17 · Arbeitsplatzgestaltung', fetchedAt: '2026-09-29T10:00:00.000Z',
      createdAt: '2026-09-29T10:00:00.000Z', updatedAt: '2026-09-29T10:00:00.000Z',
    };
    const html = renderToStaticMarkup(<GremiaBrProcedureLinksPanel
      cases={[]}
      overview={{ ...EMPTY_GREMIA_BR_DASHBOARD, lastFetchedAt: '2026-09-29T10:00:00.000Z', accessibleCases: [{ id: 'remote-1', reference: 'BR-2026-17', subject: 'Arbeitsplatzgestaltung', procedureIds: ['procedure-1'] }] }}
      localCaseId="local-1"
      remoteCaseId="remote-1"
      procedureId="procedure-1"
      detail={{ id: 'procedure-1', masterCaseId: 'remote-1', procedureType: 'SBV_PARTICIPATION', state: 'UNDER_REVIEW', workflow: 'STANDARD', openedAt: '2026-09-20T10:00:00.000Z', version: 2 }}
      links={[link]}
      informationRequests={[{ id: 'request-1', procedureId: 'procedure-1', status: 'OPEN', requestedAt: '2026-09-29T10:00:00.000Z', responseDueAt: '2026-10-05T10:00:00.000Z', version: 1 }]}
      informationRequestsProcedureId="procedure-1"
      requestItems="Unterlage zur Arbeitsplatzgestaltung"
      requestReason="Für Stellungnahme"
      responseDueDate="2026-10-05"
      busy={false}
      disabled={false}
      onLocalCaseChange={noop}
      onRemoteCaseChange={noop}
      onProcedureChange={noop}
      onLoadDetail={noop}
      onLoadInformationRequests={noop}
      onCreateInformationRequest={noop}
      onRequestItemsChange={noop}
      onRequestReasonChange={noop}
      onResponseDueDateChange={noop}
      onLink={noop}
      onUnlink={noop}
    />);

    expect(html).toContain('SBV-Beteiligung');
    expect(html).toContain('In Prüfung');
    expect(html).toContain('Verknüpfung zu BR-2026-17 · Arbeitsplatzgestaltung aufheben');
    expect(html).toContain('Bereits verknüpft');
    expect(html).toContain('Informationsanforderungen laden');
    expect(html).toContain('Antwort fällig');
    expect(html).toContain('Offen');
    expect(html).toContain('Welche Angaben fehlen?');
    expect(html).toContain('Informationsanforderung erstellen');
  });
});
