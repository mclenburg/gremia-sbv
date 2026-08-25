import { test, expect, assertNoRuntimeErrors } from './support/productTest';

test.describe.configure({ mode: 'serial' });

let recruitingId = '';

test('Stellenbesetzungsbeteiligung und Interview vollständig CRUD', async ({ productPage, runtimeErrors }) => {
  const recruiting = await productPage.evaluate(async () => window.gremiaSbv.recruitingParticipations.create({ vacancyTitle: 'Systemadministration E2E', vacancyReference: 'VAC-E2E', hasSeverelyDisabledApplicants: true, severelyDisabledApplicantCount: 1, documentsComplete: false }));
  recruitingId = recruiting.id;
  const changed = await productPage.evaluate(async ({ id }) => window.gremiaSbv.recruitingParticipations.update(id, { documentsComplete: true, sbvParticipated: true }), { id: recruitingId });
  expect(changed.documentsComplete).toBe(true);
  const interview = await productPage.evaluate(async ({ id }) => window.gremiaSbv.recruitingParticipations.addInterview({ recruitingParticipationId: id, interviewDate: new Date().toISOString(), applicantRef: 'Bewerbung E2E', sbvInvited: true }), { id: recruitingId });
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.recruitingParticipations.updateInterview(id, { sbvAttended: true, followUpNeeded: true }), { id: interview.id });
  expect(await productPage.evaluate(async ({ id }) => window.gremiaSbv.recruitingParticipations.listInterviews(id), { id: recruitingId })).toHaveLength(1);
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.recruitingParticipations.deleteInterview(id), { id: interview.id })).deleted).toBe(true);
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.recruitingParticipations.delete(id), { id: recruitingId })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('SBV-Ressourcen und Schulungsanspruch CRUD', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async () => window.gremiaSbv.sbvResources.create({ kind: 'training', title: 'SBV Grundlagenschulung E2E', legalBasis: '§ 179 Abs. 4 SGB IX', status: 'requested' }));
  const changed = await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvResources.update(id, { status: 'approved', costNote: 'Übernahme bestätigt' }), { id: row.id });
  expect(changed.status).toBe('approved');
  expect((await productPage.evaluate(async () => window.gremiaSbv.sbvResources.dashboard())).trainings).toBeGreaterThanOrEqual(1);
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvResources.delete(id), { id: row.id })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('SBV-Kontrollprotokoll CRUD inklusive Wiedervorlage', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async () => window.gremiaSbv.sbvControlProtocols.create({ title: 'Monatsgespräch E2E', partner: 'employer', topic: 'cooperation', result: 'Nachholung zugesagt', followUpDueAt: new Date(Date.now() + 86_400_000).toISOString() }));
  const changed = await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvControlProtocols.update(id, { status: 'closed', nextSteps: 'Kontrolle' }), { id: row.id });
  expect(changed.nextSteps).toBe('Kontrolle');
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvControlProtocols.delete(id), { id: row.id })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Beteiligungsverstoß anlegen, ändern, Status wechseln, Wiedervorlage und löschen', async ({ productPage, runtimeErrors }) => {
  const source = await productPage.evaluate(async () => window.gremiaSbv.cases.create({ caseNumber: 'E2E-VIOL-1', displayName: 'Verstoß E2E', category: 'diskriminierung', isPseudonymized: true, personBindingState: 'anonymous_request' }));
  const violation = await productPage.evaluate(async ({ sourceId }) => window.gremiaSbv.sbvParticipationViolations.create({ stage: 'request', status: 'draft', violationType: 'not_heard', sourceContextType: 'case', sourceContextId: sourceId, caseId: sourceId, subject: 'Unterbliebene Anhörung', measureDescription: 'Versetzung', wrongBehavior: 'Keine Anhörung', requiredBehavior: 'Vorherige Unterrichtung und Anhörung' }), { sourceId: source.id });
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvParticipationViolations.update(id, { consequenceWarning: 'Aussetzung verlangt' }), { id: violation.id });
  const opened = await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvParticipationViolations.changeStatus(id, { status: 'open', note: 'E2E eröffnet' }), { id: violation.id });
  expect(opened.status).toBe('open');
  const followUp = await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvParticipationViolations.createFollowUp(id, new Date(Date.now() + 3_600_000).toISOString()), { id: violation.id });
  expect(followUp.deadlineId).toBeTruthy();
  const documentResult = await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvParticipationViolations.generateDocument(id, { privacyMode: 'case_reference' }), { id: violation.id });
  expect(documentResult.previewStatus).toBe('requested');
  expect(documentResult.filename).toMatch(/\.pdf$/);
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvParticipationViolations.listEvents(id), { id: violation.id })).length).toBeGreaterThan(1);
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.sbvParticipationViolations.delete(id), { id: violation.id })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});
