import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForBridge } from '../../../src/app/core/bridge/waitForBridge';
import { createProcessTemplateActions } from '../../../src/app/features/cases/processTemplateActions';
import type { ProcessTemplateModalState } from '../../../src/app/features/cases/ProcessTemplateDocumentsModal';
import type { RenderedTemplateResult, TemplateCategory, TemplateRecord } from '../../../src/domain/models/template.model';
import type { CaseRecord } from '../../../src/domain/models/case.model';

vi.mock('../../../src/app/core/bridge/waitForBridge', () => ({ waitForBridge: vi.fn() }));

const base = { id: 'process-1', caseId: 'case-1', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
const states: ProcessTemplateModalState[] = [
  { processType: 'bem', process: { ...base, title: 'BEM-Verfahren', status: 'angenommen', triggerType: 'sechs_wochen_au', employeeResponse: 'angenommen', confidentialNotes: 'Vertrauliche Notiz', contactIds: [] }, templates: [], loading: false },
  { processType: 'prevention', process: { ...base, status: 'angefordert', difficultyType: 'organisatorisch', riskType: 'ueberlastung', personStatus: 'unklar', contactIds: [] }, templates: [], loading: false },
  { processType: 'equalization', process: { ...base, applicationStatus: 'eingereicht' }, templates: [], loading: false },
  { processType: 'termination_hearing', process: { ...base, status: 'eingang', terminationType: 'ordentlich', protectionStatus: 'schwerbehindert', employerReason: 'Arbeitsunfähigkeit' }, templates: [], loading: false },
];
const categories: Record<ProcessTemplateModalState['processType'], TemplateCategory> = {
  bem: 'bem', prevention: 'praevention', equalization: 'gleichstellung', termination_hearing: 'kuendigung',
};
const template: TemplateRecord = {
  id: 'template-1', key: 'sbv-letter', title: 'Schreiben', category: 'bem', subject: 'Betreff', body: 'Text',
  tags: [], legalBasis: [], isSystem: false, createdAt: base.createdAt, updatedAt: base.updatedAt,
};
const rendered: RenderedTemplateResult = {
  templateId: template.id, title: 'Überprüfung', subject: 'Beteiligung', body: 'Maßnahme prüfen.',
  archivedId: 'archive-1', unresolvedPlaceholders: [], renderedAt: base.createdAt,
};
const selectedCase: CaseRecord = {
  id: 'case-1', caseNumber: 'SBV-42', displayName: 'Fallakte', category: 'sonstiges', status: 'offen',
  priority: 'normal', openedAt: base.createdAt, isPseudonymized: true, isLocked: false,
};

function setup(initial: ProcessTemplateModalState | null) {
  let state = initial;
  const setProcessTemplateModal = vi.fn<Parameters<typeof createProcessTemplateActions>[0]['setProcessTemplateModal']>((next) => {
    state = typeof next === 'function' ? next(state) : next;
  });
  const render = vi.fn().mockResolvedValue(rendered);
  const list = vi.fn().mockResolvedValue([]);
  const confirmDialog = vi.fn().mockResolvedValue(true);
  vi.mocked(waitForBridge).mockResolvedValue({
    templates: { render, list }, templateDefaults: { list: vi.fn().mockResolvedValue({}), save: vi.fn() },
  } as unknown as NonNullable<Window['gremiaSbv']>);
  const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } });
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const actions = createProcessTemplateActions({ processTemplateModal: initial, setProcessTemplateModal, selectedCase, confirmDialog });
  return { actions, render, list, confirmDialog, setProcessTemplateModal, anchor, createObjectURL, revokeObjectURL, current: () => state };
}

describe('process template workflows', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllGlobals(); });

  it.each(states)('loads only templates for the $processType process and its current status', async (initial) => {
    const fixture = setup(null);
    const status = initial.processType === 'equalization' ? initial.process.applicationStatus : initial.process.status;
    const matching = { ...template, category: categories[initial.processType], tags: [`massnahme:${initial.processType}`, `status:${status}`] };
    fixture.list.mockResolvedValue([matching, { ...matching, id: 'wrong-status', tags: [`massnahme:${initial.processType}`, 'status:unrelated'] }]);
    await fixture.actions.openProcessTemplateModal(initial.process);
    expect(fixture.list).toHaveBeenCalledExactlyOnceWith({ category: categories[initial.processType], limit: 500 });
    expect(fixture.setProcessTemplateModal.mock.calls[0][0]).toMatchObject({ loading: true, process: initial.process });
    expect(fixture.current()).toMatchObject({ processType: initial.processType, templates: [matching], loading: false });
  });

  it.each(states)('archives $processType output while preventing download after export cancellation', async (initial) => {
    const fixture = setup(initial);
    fixture.confirmDialog.mockResolvedValue(false);
    await fixture.actions.renderAndDownloadProcessTemplate(template);
    expect(fixture.render).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      templateId: template.id, caseId: selectedCase.id, archive: true,
      values: expect.objectContaining({ 'fall.aktenzeichen': 'SBV-42' }),
    }));
    expect(fixture.confirmDialog).toHaveBeenCalledOnce();
    expect(fixture.confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ variant: 'warning' }));
    const request = fixture.confirmDialog.mock.calls[0][0];
    if (initial.processType === 'bem') {
      expect(request.title).toBe('BEM-Dokument exportieren?');
      expect(request.message).toMatch(/vertrauliche BEM-Notiz/);
    } else if (initial.processType === 'termination_hearing') {
      expect(request.title).toBe('Kündigungsdokument exportieren?');
      expect(request.message).toMatch(/Gesundheits|Therapiedaten/);
    } else {
      expect(request.title).toBe('Dokument exportieren?');
    }
    expect(fixture.createObjectURL).not.toHaveBeenCalled();
    expect(fixture.anchor.click).not.toHaveBeenCalled();
    expect(fixture.current()).toMatchObject({ rendered, error: undefined, info: expect.stringMatching(/abgebrochen.*archiviert/) });
  });

  it('downloads Unicode output only after explicit confirmation and revokes its temporary URL', async () => {
    const fixture = setup(states[0]);
    let decide!: (confirmed: boolean) => void;
    fixture.confirmDialog.mockImplementation(() => new Promise<boolean>((resolve) => { decide = resolve; }));
    const pending = fixture.actions.renderAndDownloadProcessTemplate(template);
    await vi.waitFor(() => expect(fixture.confirmDialog).toHaveBeenCalled());
    expect(fixture.createObjectURL).not.toHaveBeenCalled();
    decide(true);
    await pending;
    const blob = fixture.createObjectURL.mock.calls[0][0] as Blob;
    expect(await blob.text()).toBe('Betreff: Beteiligung\n\nMaßnahme prüfen.');
    expect(fixture.anchor.download).toBe('Überprüfung.txt');
    expect(fixture.anchor.click).toHaveBeenCalledOnce();
    expect(fixture.anchor.remove).toHaveBeenCalledOnce();
    expect(fixture.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:export');
    expect(fixture.current()).toMatchObject({ rendered, error: undefined });
  });

  it('retains the rendered output and reports failures without an export decision or download', async () => {
    const fixture = setup({ ...states[0], rendered });
    fixture.render.mockRejectedValue(new Error('Erzeugung fehlgeschlagen'));
    await fixture.actions.renderAndDownloadProcessTemplate(template);
    expect(fixture.confirmDialog).not.toHaveBeenCalled();
    expect(fixture.anchor.click).not.toHaveBeenCalled();
    expect(fixture.current()).toMatchObject({ rendered, error: 'Erzeugung fehlgeschlagen' });
  });

  it('ends loading and presents an unavailable template service error', async () => {
    const fixture = setup(null);
    vi.mocked(waitForBridge).mockResolvedValue(null);
    await fixture.actions.openProcessTemplateModal(states[0].process);
    expect(fixture.current()).toMatchObject({ loading: false, templates: [], error: 'Vorlagendienst ist nicht erreichbar.' });
  });

  it('does not reopen a closed modal when confirmation completes', async () => {
    const fixture = setup(states[0]);
    fixture.confirmDialog.mockImplementation(async () => { fixture.setProcessTemplateModal(null); return false; });
    await fixture.actions.renderAndDownloadProcessTemplate(template);
    expect(fixture.current()).toBeNull();
    expect(fixture.anchor.click).not.toHaveBeenCalled();
  });
});
