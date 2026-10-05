import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseProcessDraft, CaseProcessType } from './casesViewProcessUtils';
import { fromDateTimeLocalValue } from './caseWorkbenchFormat';

type ProcessCreator = (
  bridge: Window['gremiaSbv'] | null,
  record: CaseRecord,
  draft: CaseProcessDraft,
) => Promise<{ id: string }>;

function draftDueAt(draft: CaseProcessDraft): string | undefined {
  return draft.dueAt ? fromDateTimeLocalValue(draft.dueAt) : undefined;
}

const creators: Record<CaseProcessType, ProcessCreator> = {
  prevention: async (bridge, record, draft) => {
    if (!bridge?.prevention) throw new Error('Präventionsdienst ist nicht erreichbar.');
    return bridge.prevention.create({
      caseId: record.id,
      hazardDescription: draft.description.trim() || `Präventionsverfahren aus Fallakte ${record.caseNumber} gestartet.`,
      employerResponseDueAt: draftDueAt(draft),
      difficultyType: 'gesundheitlich_arbeitsplatzbezogen',
      riskType: 'ueberlastung',
      personStatus: 'unklar',
      contactIds: [],
      createDefaultDeadlines: true,
    });
  },
  bem: async (bridge, record, draft) => {
    if (!bridge?.bem) throw new Error('BEM-Dienst ist nicht erreichbar.');
    return bridge.bem.create({
      caseId: record.id,
      title: draft.title.trim() || 'BEM-Verfahren',
      triggerDescription: draft.description.trim() || `BEM-Verfahren aus Fallakte ${record.caseNumber} gestartet.`,
      triggerType: 'sbv_anregung',
      responseDueAt: draftDueAt(draft),
      contactIds: [],
      createDefaultDeadlines: true,
    });
  },
  participation: async (bridge, record, draft) => {
    if (!bridge?.participation) throw new Error('Beteiligungsdienst ist nicht erreichbar.');
    return bridge.participation.create({
      caseId: record.id,
      title: draft.title.trim() || 'SBV-Beteiligung',
      measureType: 'sonstiges',
      riskLevel: 'erhoeht',
      decisionStage: 'unklar',
      personStatus: 'unklar',
      firstKnownAt: new Date().toISOString(),
      statementDueAt: draftDueAt(draft),
      violationSummary: draft.description.trim() || undefined,
      nextStep: 'Beteiligung nach § 178 Abs. 2 SGB IX in der Fallakte weiter prüfen.',
      createDefaultDeadlines: true,
    });
  },
  workplace_accommodation: async (bridge, record, draft) => {
    if (!bridge?.workplaceAccommodation) throw new Error('Arbeitsplatzgestaltungsdienst ist nicht erreichbar.');
    return bridge.workplaceAccommodation.create({
      caseId: record.id,
      title: draft.title.trim() || 'Arbeitsplatzgestaltung',
      requestedAdjustment: draft.description.trim() || 'Behinderungsgerechte Arbeitsplatzgestaltung prüfen.',
      barrierOrLimitation: draft.description.trim() || undefined,
      category: 'sonstiges',
      status: 'angefragt',
      riskLevel: 'erhoeht',
      implementationDueAt: draftDueAt(draft),
      nextStep: 'Arbeitsplatzgestaltung nach § 164 Abs. 4 SGB IX in der Fallakte weiter prüfen.',
      createDefaultDeadlines: true,
    });
  },
  termination_hearing: async (bridge, record, draft) => {
    if (!bridge?.termination) throw new Error('Kündigungsdienst ist nicht erreichbar.');
    return bridge.termination.create({
      caseId: record.id,
      status: 'eingang',
      terminationType: 'sonstiges',
      protectionStatus: 'unklar',
      receivedAt: new Date().toISOString(),
      sbvStatementDueAt: draftDueAt(draft),
      employerReason: draft.description.trim() || undefined,
    });
  },
  equalization: async (bridge, record, draft) => {
    if (!bridge?.equalization) throw new Error('Gleichstellungsdienst ist nicht erreichbar.');
    const created = await bridge.equalization.create({
      caseId: record.id,
      applicationStatus: 'beratung',
      objectionDueAt: draftDueAt(draft),
    });
    if (draft.description.trim()) {
      await bridge.cases.createNote({
        caseId: record.id,
        caseIds: [record.id],
        title: 'Gleichstellung/GdB – verschlüsselte Startnotiz',
        noteDate: new Date().toISOString(),
        noteType: 'interne_notiz',
        participants: '',
        content: `[[equalization:${created.id}]]\n${draft.description.trim()}`,
        nextSteps: 'Gleichstellungs-/GdB-Verfahren weiter bearbeiten.',
        containsHealthData: true,
        confidentialLevel: 'hoch_sensibel',
      });
    }
    return created;
  },
};

const successMessages: Record<CaseProcessType, string> = {
  prevention: 'Präventionsverfahren wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.',
  bem: 'BEM-Verfahren wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.',
  participation: 'SBV-Beteiligungsmaßnahme wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.',
  workplace_accommodation: 'Arbeitsplatzgestaltung wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.',
  termination_hearing: 'Kündigungsanhörung wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.',
  equalization: 'Gleichstellungs-/GdB-Verfahren wurde direkt an der Fallakte angelegt und im Fallbaum ergänzt.',
};

export async function createCaseProcess(bridge: Window['gremiaSbv'] | null, record: CaseRecord, draft: CaseProcessDraft) {
  const created = await creators[draft.processType](bridge, record, draft);
  return { id: created.id, message: successMessages[draft.processType] };
}
