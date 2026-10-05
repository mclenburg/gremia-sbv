import { describe, expect, it, vi } from 'vitest';
import { createRecruitingMutations } from '../../../src/app/features/recruiting/createRecruitingMutations';
import { emptyInterviewForm, emptyParticipationForm, recruitingFollowUpInput } from '../../../src/app/features/recruiting/recruitingParticipationViewSupport';
import type { RecruitingParticipationRecord } from '../../../src/domain/models/recruiting-participation.model';

function setup() {
  const selected: RecruitingParticipationRecord = {
    id: 'synthetic-recruiting', vacancyTitle: 'Synthetische Stelle', status: 'draft',
    documentsComplete: false, hasSeverelyDisabledApplicants: true, interviewCount: 0,
    decisionBeforeHearing: false, flaggedForViolationReview: false,
    createdAt: '2031-05-01T08:00:00.000Z', updatedAt: '2031-05-01T08:00:00.000Z',
  };
  const state = {
    form: { ...emptyParticipationForm(), vacancyTitle: '  Synthetische Stelle  ', vacancyReference: ' REC-1 ' },
    interviewForm: { ...emptyInterviewForm(), interviewDate: '2031-05-02', applicantRef: ' Bewerbung 1 ', proceduralNote: ' Synthetische Notiz ' },
    selected: selected as RecruitingParticipationRecord | null,
    setSaving: vi.fn(), setError: vi.fn(), setMessage: vi.fn(), setQuery: vi.fn(),
    setStatusFilter: vi.fn(), creatingRef: { current: true }, setCreateOpen: vi.fn(),
    setInterviewForm: vi.fn(), announce: vi.fn(), reload: vi.fn(async () => undefined),
  };
  const service = {
    create: vi.fn(async () => selected), update: vi.fn(async () => selected),
    addInterview: vi.fn(async () => ({ id: 'synthetic-interview' })),
  };
  // Only the IPC operations used by the actions are needed at this boundary.
  const getService = vi.fn(async () => service as unknown as Window['gremiaSbv']['recruitingParticipations']);
  return { state, service, getService, actions: createRecruitingMutations(state, getService) };
}

describe('Stellenbesetzungsaktionen', () => {
  it.each(['documents', 'hearing'] as const)('erstellt eine manuelle Wiedervorlage für %s ohne Fall- oder Bewerbungsbezug', (kind) => {
    const { state } = setup();
    const input = recruitingFollowUpInput(state.selected!, '2031-05-15', kind);
    expect(input).toEqual(expect.objectContaining({
      processType: 'recruiting_participation', processId: 'synthetic-recruiting',
      deadlineType: 'follow_up', dueAt: '2031-05-15T12:00:00.000Z',
      severity: kind === 'hearing' ? 'important' : 'normal',
      calculationMode: 'manual', isLegalDeadline: false,
      sourceEvent: `recruiting_participation.${kind}_follow_up`,
    }));
    expect(input.caseId).toBeUndefined();
    expect(input.title).toContain('Synthetische Stelle');
    expect(input.title).toContain(kind === 'hearing' ? 'Anhörung vor Auswahlentscheidung' : 'Unterlagen nachhalten');
    expect(input.confidentialTitle).toBe(input.title);
    expect(input.description).not.toContain('Bewerbung 1');
  });

  it('speichert bereinigte Verfahrensdaten und öffnet erst danach den bestätigten Vorgang', async () => {
    const { state, service, actions } = setup();
    expect(service.create).not.toHaveBeenCalled();
    await actions.createRecord();
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ vacancyTitle: 'Synthetische Stelle', vacancyReference: 'REC-1' }));
    expect(state.reload).toHaveBeenCalledWith('synthetic-recruiting');
    expect(state.setCreateOpen).toHaveBeenCalledWith(false);
    expect(state.creatingRef.current).toBe(false);
    expect(state.setQuery).toHaveBeenCalledWith('');
    expect(state.setStatusFilter).toHaveBeenCalledWith('all');
    expect(state.setSaving.mock.calls).toEqual([[true], [false]]);
  });

  it('hält den Entwurf während eines noch unbestätigten Speicherns offen', async () => {
    const { state, service, actions } = setup();
    let resolve!: (value: RecruitingParticipationRecord) => void;
    service.create.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = actions.createRecord();
    await vi.waitFor(() => expect(service.create).toHaveBeenCalledOnce());
    expect(state.setCreateOpen).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.setSaving).toHaveBeenLastCalledWith(true);
    resolve(state.selected!);
    await pending;
    expect(state.setCreateOpen).toHaveBeenCalledWith(false);
    expect(state.setSaving).toHaveBeenLastCalledWith(false);
  });

  it('erhält einen fehlgeschlagenen Entwurf und erlaubt eine erfolgreiche erneute Speicherung', async () => {
    const { state, service, actions } = setup();
    service.create.mockRejectedValueOnce(new Error('Synthetischer Speicherfehler'));
    await actions.createRecord();
    expect(state.setError).toHaveBeenLastCalledWith('Synthetischer Speicherfehler');
    expect(state.setCreateOpen).not.toHaveBeenCalled();
    expect(state.creatingRef.current).toBe(true);
    expect(state.announce).not.toHaveBeenCalled();
    await actions.createRecord();
    expect(state.reload).toHaveBeenCalledOnce();
    expect(state.setCreateOpen).toHaveBeenCalledWith(false);
  });

  it('aktualisiert ausschließlich den ausgewählten Vorgang', async () => {
    const { state, service, actions } = setup();
    await actions.updateRecord();
    expect(service.update).toHaveBeenCalledWith('synthetic-recruiting', expect.objectContaining({ vacancyTitle: 'Synthetische Stelle' }));
    expect(state.reload).toHaveBeenCalledWith('synthetic-recruiting');
    expect(service.create).not.toHaveBeenCalled();
    expect(state.setCreateOpen).not.toHaveBeenCalled();
  });

  it('erfasst das Gespräch im ausgewählten Kontext und leert den Entwurf erst nach Bestätigung', async () => {
    const { state, service, actions } = setup();
    await actions.addInterview();
    expect(service.addInterview).toHaveBeenCalledWith(expect.objectContaining({
      recruitingParticipationId: 'synthetic-recruiting', interviewDate: '2031-05-02T12:00:00.000Z',
      applicantRef: 'Bewerbung 1', proceduralNote: 'Synthetische Notiz', applicantReferenceMode: 'anonymous_reference',
    }));
    expect(state.setInterviewForm).toHaveBeenCalledWith(expect.objectContaining({ applicantRef: '', proceduralNote: '' }));
    expect(state.reload).toHaveBeenCalledWith('synthetic-recruiting');
  });

  it('erhält Gesprächsdaten bei fehlgeschlagener Speicherung', async () => {
    const { state, service, actions } = setup();
    service.addInterview.mockRejectedValue(new Error('Gespräch nicht gespeichert'));
    await actions.addInterview();
    expect(state.setInterviewForm).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
    expect(state.reload).not.toHaveBeenCalled();
    expect(state.setError).toHaveBeenLastCalledWith('Gespräch nicht gespeichert');
    expect(state.setSaving).toHaveBeenLastCalledWith(false);
  });

  it('ruft ohne Auswahl keine Aktualisierung oder Gesprächserfassung auf', async () => {
    const { state, getService } = setup();
    state.selected = null;
    const actions = createRecruitingMutations(state, getService);
    await actions.updateRecord();
    await actions.addInterview();
    expect(getService).not.toHaveBeenCalled();
    expect(state.setSaving).not.toHaveBeenCalled();
  });

  it('meldet einen fehlenden Dienst ohne Erfolgsanzeige und gibt die Speicherung wieder frei', async () => {
    const { state } = setup();
    await createRecruitingMutations(state, async () => null).createRecord();
    expect(state.setError).toHaveBeenLastCalledWith('Stellenbesetzungsdienst ist nicht erreichbar.');
    expect(state.announce).not.toHaveBeenCalled();
    expect(state.setCreateOpen).not.toHaveBeenCalled();
    expect(state.setSaving).toHaveBeenLastCalledWith(false);
  });
});
