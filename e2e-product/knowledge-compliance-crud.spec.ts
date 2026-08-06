import { test, expect, assertNoRuntimeErrors } from './support/productTest';

test.describe.configure({ mode: 'serial' });

let caseId = '';

test.beforeAll(async ({ productPage }) => {
  const record = await productPage.evaluate(async () => window.gremiaSbv.cases.create({
    caseNumber: 'E2E-KNOW-1', displayName: 'Wissensfall E2E', category: 'sonstiges', isPseudonymized: true, personBindingState: 'anonymous_request',
  }));
  caseId = record.id;
});

test('Fallmaßnahme und Maßnahmennotiz vollständig CRUD', async ({ productPage, runtimeErrors }) => {
  const measure = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.caseMeasures.create({
    caseId: linkedCaseId, type: 'sbv_participation', title: 'E2E Maßnahme', status: 'open', summary: 'Ausgang', requiresFollowUp: true,
  }), { linkedCaseId: caseId });
  const changed = await productPage.evaluate(async ({ id }) => window.gremiaSbv.caseMeasures.update(id, { status: 'in_progress', nextStep: 'Arbeitgeber anschreiben' }), { id: measure.id });
  expect(changed.nextStep).toBe('Arbeitgeber anschreiben');
  const note = await productPage.evaluate(async ({ linkedCaseId, measureId }) => window.gremiaSbv.caseMeasures.createNote({
    caseId: linkedCaseId, measureId, measureType: 'participation', title: 'E2E Maßnahmennotiz', content: 'Dokumentierter Zwischenschritt',
  }), { linkedCaseId: caseId, measureId: measure.id });
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.caseMeasures.updateNote(id, { content: 'Geänderter Zwischenschritt' }), { id: note.id });
  expect((await productPage.evaluate(async ({ linkedCaseId, measureId }) => window.gremiaSbv.caseMeasures.listNotes(linkedCaseId, 'participation', measureId), { linkedCaseId: caseId, measureId: measure.id }))[0].content).toBe('Geänderter Zwischenschritt');
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.caseMeasures.deleteNote(id), { id: note.id })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Eigene Rechtsnorm, Kommentar, Rechtsprechung, Checkliste und Fallverknüpfung', async ({ productPage, runtimeErrors }) => {
  const norm = await productPage.evaluate(async () => window.gremiaSbv.knowledge.createNorm({
    source: 'SGB IX', paragraph: '§ 178 Abs. 2 Satz 1', title: 'SBV-Beteiligung E2E', shortText: 'Unterrichtung und Anhörung', fullText: 'E2E Volltext', tags: ['e2e'],
  }));
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.knowledge.updateNorm(id, { practiceNote: 'Vor Entscheidung beteiligen' }), { id: norm.id });
  await productPage.evaluate(async ({ normId, linkedCaseId }) => window.gremiaSbv.knowledge.linkNormToCase({ legalNormId: normId, caseId: linkedCaseId, note: 'E2E Bezug' }), { normId: norm.id, linkedCaseId: caseId });
  await productPage.evaluate(async ({ normId }) => window.gremiaSbv.knowledge.createComment({ legalNormId: normId, title: 'Praxis', content: 'Anhörung dokumentieren' }), { normId: norm.id });
  await productPage.evaluate(async ({ normId }) => window.gremiaSbv.knowledge.createCaseLaw({ legalNormId: normId, court: 'BAG', fileNumber: 'E2E 1 ABR 1/26', shortHolding: 'Testleitsatz' }), { normId: norm.id });
  await productPage.evaluate(async ({ normId }) => window.gremiaSbv.knowledge.createChecklistItem({ legalNormId: normId, text: 'Unterlagen vollständig?', sortOrder: 1 }), { normId: norm.id });
  expect(await productPage.evaluate(async ({ normId }) => (await window.gremiaSbv.knowledge.listComments(normId)).length, { normId: norm.id })).toBe(1);
  expect(await productPage.evaluate(async ({ linkedCaseId }) => (await window.gremiaSbv.knowledge.listCaseReferences(linkedCaseId)).length, { linkedCaseId: caseId })).toBeGreaterThan(0);
  expect((await productPage.evaluate(async () => window.gremiaSbv.knowledge.exportPreview())).normCount).toBeGreaterThan(0);
  expect((await productPage.evaluate(async ({ linkedCaseId, normId }) => window.gremiaSbv.knowledge.unlinkNormFromCase(linkedCaseId, normId), { linkedCaseId: caseId, normId: norm.id })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Datenschutzvorfall anlegen, bearbeiten und schließen', async ({ productPage, runtimeErrors }) => {
  const now = new Date().toISOString();
  const incident = await productPage.evaluate(async ({ occurredAt }) => window.gremiaSbv.compliance.createIncident({
    occurredAt, discoveredAt: occurredAt, category: 'wrong_recipient', riskLevel: 'medium', summary: 'E2E Fehlversand', affectedDataCategories: 'Kontaktdaten', immediateMeasures: 'Rückruf',
  }), { occurredAt: now });
  const changed = await productPage.evaluate(async ({ id, closedAt }) => window.gremiaSbv.compliance.updateIncident(id, { status: 'closed', closedAt, lessonsLearned: 'Vier-Augen-Prinzip' }), { id: incident.id, closedAt: now });
  expect(changed.status).toBe('closed');
  expect((await productPage.evaluate(async () => window.gremiaSbv.compliance.listIncidents())).some((row) => row.id === incident.id)).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Vorlagen-Standardwerte werden gespeichert und erneut gelesen', async ({ productPage, runtimeErrors }) => {
  const current = await productPage.evaluate(async () => window.gremiaSbv.templateDefaults.list());
  const saved = await productPage.evaluate(async ({ values }) => window.gremiaSbv.templateDefaults.save({ ...values, 'sbv.name': 'E2E Vertrauensperson', 'arbeitgeber.name': 'E2E Arbeitgeber' }), { values: current });
  expect(saved['sbv.name']).toBe('E2E Vertrauensperson');
  const loaded = await productPage.evaluate(async () => window.gremiaSbv.templateDefaults.list());
  expect(loaded['arbeitgeber.name']).toBe('E2E Arbeitgeber');
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Berichtskatalog und echter Systemintegritätsbericht', async ({ productPage, runtimeErrors }) => {
  const descriptors = await productPage.evaluate(async () => window.gremiaSbv.reports.descriptors());
  expect(descriptors.some((row) => row.type === 'system_integrity')).toBe(true);
  const result = await productPage.evaluate(async () => window.gremiaSbv.reports.generate({ type: 'system_integrity' }));
  expect(result.ok).toBe(true);
  expect(result.fileName).toBeTruthy();
  expect((await productPage.evaluate(async () => window.gremiaSbv.reports.history(10))).some((row) => row.reportType === 'system_integrity')).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});
