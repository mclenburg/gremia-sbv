import type { CaseRecord } from '../../../core/models/case.model';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type { ControlSectionId } from '../sbvControlTypes';
import type { useSbvOfficeWorkflows } from '../hooks/useSbvOfficeWorkflows';
import { MeetingsWorkspace } from './MeetingsWorkspace';
import { AssemblyWorkspace } from './AssemblyWorkspace';
import { ComplaintsWorkspace } from './ComplaintsWorkspace';
import { ObligationsWorkspace } from './ObligationsWorkspace';
import { InclusionAgreementWorkspace } from './InclusionAgreementWorkspace';

type OfficeState = ReturnType<typeof useSbvOfficeWorkflows>;

export function SbvOfficeSections({ activeSection, cases, state, onNotice }: {
  activeSection: ControlSectionId;
  cases: CaseRecord[];
  state: OfficeState;
  onNotice: (message: string) => void;
}) {
  if (activeSection === 'meetings') {
    return <MeetingsWorkspace records={state.meetings} onCreate={async (input) => { const bridge = await state.bridge(); const created = await bridge.meetings.create(input); await state.load(); return created; }} onAgenda={async (id, input) => { const bridge = await state.bridge(); const saved = await bridge.meetings.saveAgenda(id, input); await state.load(); return saved; }} onAgendaFollowUp={async (agendaId, dueAt) => { const bridge = await state.bridge(); await bridge.meetings.createAgendaFollowUp(agendaId, dueAt); onNotice('Wiedervorlage angelegt.'); }} onJournal={async (id, activity) => { const bridge = await state.bridge(); return bridge.meetings.journalPrefill(id, activity); }} />;
  }
  if (activeSection === 'assembly') {
    return <AssemblyWorkspace records={state.assemblies} onSave={async (input) => { const bridge = await state.bridge(); await bridge.assemblies.save(input); await state.load(); }} onGenerateDocument={async (id, kind) => { const bridge = await state.bridge(); const result = await bridge.assemblies.generateDocument(id, kind); onNotice(`Dokument verschlüsselt gespeichert: ${result.filename}`); }} onCreateFollowUp={async (id, dueAt) => { const bridge = await state.bridge(); await bridge.assemblies.createFollowUp(id, dueAt); onNotice('Wiedervorlage angelegt.'); }} />;
  }
  if (activeSection === 'complaints') {
    return <ComplaintsWorkspace cases={cases} records={state.complaints} templates={state.templates} onSave={async (input) => { const bridge = await state.bridge(); await bridge.complaints.save(input); await state.load(); }} onCreateQuickNote={async (caseId, template) => { const bridge = await waitForBridge(); if (!bridge?.cases) throw new Error('Fallakten-Bridge ist nicht verfügbar.'); await bridge.cases.createNote({ caseId, title: template.title, noteType: 'interne_notiz', content: template.checklist.map((step) => `☐ ${step}`).join('\n'), nextSteps: '', containsHealthData: false, confidentialLevel: 'normal' }); onNotice('Schnellfall-Checkliste als Fallnotiz angelegt.'); }} />;
  }
  if (activeSection === 'obligations') {
    return <ObligationsWorkspace reviews={state.obligations} officers={state.officers} onEnsure={async (year) => { const bridge = await state.bridge(); await bridge.obligations.ensureAnnual(year); await state.load(); }} onSaveReview={async (input) => { const bridge = await state.bridge(); await bridge.obligations.save(input); await state.load(); }} onSaveOfficer={async (input) => { const bridge = await state.bridge(); await bridge.officers.save(input); await state.load(); }} onAttachEvidence={async (id) => { const bridge = await state.bridge(); const docs = await bridge.documents.selectAndAttach('employer_obligation_review', id, 'Nachweis Arbeitgeberpflicht'); if (docs.length) onNotice(`${docs.length} Nachweis${docs.length === 1 ? '' : 'e'} verschlüsselt gespeichert.`); }} />;
  }
  if (activeSection === 'inclusion') {
    return <InclusionAgreementWorkspace records={state.agreements} onSave={async (input) => { const bridge = await state.bridge(); await bridge.agreements.save(input); await state.load(); }} onSaveTopic={async (id, input) => { const bridge = await state.bridge(); await bridge.agreements.saveTopic(id, input); await state.load(); }} onRequestDraft={async (dueAt) => { const bridge = await state.bridge(); return bridge.agreements.requestDraft(dueAt); }} onResponseDeadline={async (id, dueAt) => { const bridge = await state.bridge(); await bridge.agreements.createResponseDeadline(id, dueAt); onNotice('Antwortfrist als Wiedervorlage angelegt.'); }} />;
  }
  return null;
}
