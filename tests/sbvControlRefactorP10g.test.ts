import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SbvResourceRecord } from '../src/app/core/models/sbv-resource.model';
import {
  filterProtocolsForQuery,
  filterResourcesForQuery,
  initialProtocolForm,
  initialResourceForm,
  isProtocolTitleMissing,
  isResourceTitleMissing,
  legalBasisForKind,
  protocolOperationAnnouncement,
  protocolOperationNotice,
  updateProtocolFormValue,
  resourceFormFromRecord,
  resourceOperationAnnouncement,
  resourceOperationNotice,
  updateResourceFormValue,
} from '../src/app/features/sbv-control/sbvControlLogic';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function lineCount(path: string): number {
  return source(path).split('\n').length;
}

const resource: SbvResourceRecord = {
  id: 'res-1',
  kind: 'training',
  title: 'Grundlagenschulung SBV I',
  legalBasis: '§ 179 Abs. 4 Satz 3 SGB IX',
  startedAt: '2026-05-20T00:00:00.000Z',
  endedAt: '2026-05-21T00:00:00.000Z',
  provider: 'Gewerkschaft',
  participants: 'Vertrauensperson',
  taskContext: 'BEM-Begleitung und Beteiligungsrechte',
  necessityReason: 'Erforderlich für Amtsführung',
  employerReaction: 'genehmigt',
  costNote: 'Seminarkosten genehmigt',
  status: 'approved',
  notes: 'Hotel separat',
  createdAt: '2026-05-19T10:00:00.000Z',
  updatedAt: '2026-05-19T10:00:00.000Z'
};

describe('SBV-Steuerung Refactor P10g', () => {
  it('zerlegt die ehemalige Großdatei in kleine fachliche Komponenten und einen Ressourcen-Hook', () => {
    expect(lineCount('src/app/features/sbv-control/SbvControlView.tsx')).toBeLessThan(250);
    expect(lineCount('src/app/features/sbv-control/components/ResourceForm.tsx')).toBeLessThan(180);
    expect(lineCount('src/app/features/sbv-control/components/ResourceSection.tsx')).toBeLessThan(140);
    expect(lineCount('src/app/features/sbv-control/hooks/useSbvResources.ts')).toBeLessThan(180);

    expect(statSync('src/app/features/sbv-control/components/ObligationsList.tsx').isFile()).toBe(true);
    expect(statSync('src/app/features/sbv-control/components/InclusionPanel.tsx').isFile()).toBe(true);
    expect(statSync('src/app/features/sbv-control/components/ReportsPanel.tsx').isFile()).toBe(true);
    expect(statSync('src/app/features/sbv-control/components/ProtocolSection.tsx').isFile()).toBe(true);
    expect(statSync('src/app/features/sbv-control/hooks/useSbvControlProtocols.ts').isFile()).toBe(true);
  });

  it('hält Ressourcen-Formularverhalten fachlich in zentralen Funktionen fest', () => {
    expect(isResourceTitleMissing(initialResourceForm)).toBe(true);
    expect(isResourceTitleMissing({ ...initialResourceForm, title: '  Schulung  ' })).toBe(false);
    expect(legalBasisForKind('equipment')).toBe('§ 179 Abs. 8 SGB IX');

    const updated = updateResourceFormValue(initialResourceForm, 'kind', 'deputy_involvement');
    expect(updated.kind).toBe('deputy_involvement');
    expect(updated.legalBasis).toContain('§ 178 Abs. 1 Satz 4 SGB IX');
  });

  it('filtert und editiert Ressourcen ohne UI-Stringabhängigkeit', () => {
    expect(filterResourcesForQuery([resource], 'gewerkschaft')).toEqual([resource]);
    expect(filterResourcesForQuery([resource], 'nicht vorhanden')).toEqual([]);

    const form = resourceFormFromRecord(resource);
    expect(form.startedAt).toBe('2026-05-20');
    expect(form.endedAt).toBe('2026-05-21');
    expect(form.provider).toBe('Gewerkschaft');
  });

  it('hält übergreifende Steuerungsprotokolle ohne Fallzuordnung fachlich zentral', () => {
    expect(isProtocolTitleMissing(initialProtocolForm)).toBe(true);
    const updated = updateProtocolFormValue(initialProtocolForm, 'topic', 'inclusion_agreement');
    expect(updated.legalContext).toContain('§ 166 SGB IX');
    expect(filterProtocolsForQuery([{
      id: 'prot-1',
      title: 'Regelung Homeoffice',
      partner: 'employer',
      topic: 'workplace_rules',
      meetingAt: '2026-06-12',
      legalContext: '§ 178 Abs. 1 SGB IX',
      status: 'follow_up_open',
      createdAt: '2026-06-12T08:00:00.000Z',
      updatedAt: '2026-06-12T08:00:00.000Z',
    }], 'homeoffice')).toHaveLength(1);
    expect(protocolOperationNotice('create')).toBe('Steuerungsprotokoll angelegt.');
    expect(protocolOperationAnnouncement('update')).toBe('Steuerungsprotokoll wurde aktualisiert.');
  });

  it('liefert konsistente Nutzer- und Screenreader-Rückmeldungen für Ressourcenoperationen', () => {
    expect(resourceOperationNotice('create')).toBe('Nachweis protokolliert.');
    expect(resourceOperationNotice('update')).toBe('Nachweis aktualisiert.');
    expect(resourceOperationNotice('delete')).toBe('Nachweis gelöscht.');
    expect(resourceOperationAnnouncement('create')).toBe('Nachweis wurde protokolliert.');
    expect(resourceOperationAnnouncement('update')).toBe('Nachweis wurde aktualisiert.');
    expect(resourceOperationAnnouncement('delete')).toBe('Nachweis wurde gelöscht.');
  });

  it('bindet useAnnouncer im Ressourcen-Hook statt in der View-Großdatei an', () => {
    const hook = source('src/app/features/sbv-control/hooks/useSbvResources.ts');
    const view = source('src/app/features/sbv-control/SbvControlView.tsx');

    expect(hook).toContain('useAnnouncer');
    expect(hook.match(/announce\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(view).not.toContain('async function saveResource');
    expect(view).not.toContain('async function deleteResource');
  });
});
