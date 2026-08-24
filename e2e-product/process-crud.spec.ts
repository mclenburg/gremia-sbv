import { test, expect, assertNoRuntimeErrors } from './support/productTest';

test.describe.configure({ mode: 'serial' });

let caseId = '';

test.beforeAll(async ({ productPage }) => {
  const record = await productPage.evaluate(async () => window.gremiaSbv.cases.create({
    caseNumber: 'E2E-PROC-1', displayName: 'Prozessfall E2E', category: 'sonstiges', summary: 'Prozessprüfungen', isPseudonymized: true, personBindingState: 'anonymous_request',
  }));
  caseId = record.id;
});

test('BEM anlegen, aktualisieren, Warnungen und Dashboard', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.bem.create({ caseId: linkedCaseId, title: 'BEM E2E', triggerType: 'sechs_wochen_au', createDefaultDeadlines: false }), { linkedCaseId: caseId });
  const updated = await productPage.evaluate(async ({ id }) => window.gremiaSbv.bem.update(id, { status: 'massnahmen_in_klaerung', result: 'Zwischenstand' }), { id: row.id });
  expect(updated.result).toBe('Zwischenstand');
  expect(await productPage.evaluate(async ({ id }) => window.gremiaSbv.bem.warnings(id), { id: row.id })).toBeTruthy();
  expect((await productPage.evaluate(async () => window.gremiaSbv.bem.dashboard())).open).toBeGreaterThanOrEqual(1);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Prävention anlegen und aktualisieren', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.prevention.create({ caseId: linkedCaseId, difficultyType: 'gesundheitlich_arbeitsplatzbezogen', riskType: 'arbeitsplatzverlust', hazardDescription: 'E2E Gefahr', createDefaultDeadlines: false }), { linkedCaseId: caseId });
  const updated = await productPage.evaluate(async ({ id }) => window.gremiaSbv.prevention.update(id, { status: 'angefordert', employerRequestSummary: 'Abhilfe verlangt' }), { id: row.id });
  expect(updated.employerRequestSummary).toBe('Abhilfe verlangt');
  expect(await productPage.evaluate(async ({ id }) => window.gremiaSbv.prevention.warnings(id), { id: row.id })).toBeTruthy();
  await assertNoRuntimeErrors(runtimeErrors);
});

test('SBV-Beteiligung anlegen, aktualisieren und Dashboard prüfen', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.participation.create({ caseId: linkedCaseId, title: 'Versetzung E2E', measureType: 'versetzung', informationComplete: false, createDefaultDeadlines: false }), { linkedCaseId: caseId });
  const updated = await productPage.evaluate(async ({ id }) => window.gremiaSbv.participation.update(id, { status: 'anhoerung_laeuft', sbvPosition: 'Ablehnung' }), { id: row.id });
  expect(updated.sbvPosition).toBe('Ablehnung');
  expect((await productPage.evaluate(async () => window.gremiaSbv.participation.dashboard())).open).toBeGreaterThanOrEqual(1);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Arbeitsplatzgestaltung anlegen und aktualisieren', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.workplaceAccommodation.create({ caseId: linkedCaseId, title: 'Homeoffice E2E', category: 'arbeitsort', requestedAdjustment: '100 Prozent Homeoffice', legalBasis: '§ 164 Abs. 4 SGB IX', createDefaultDeadlines: false }), { linkedCaseId: caseId });
  const updated = await productPage.evaluate(async ({ id }) => window.gremiaSbv.workplaceAccommodation.update(id, { status: 'angefragt', employerResponseStatus: 'offen' }), { id: row.id });
  expect(updated.status).toBe('angefragt');
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Gleichstellung anlegen und aktualisieren', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.equalization.create({ caseId: linkedCaseId, applicationStatus: 'vorbereitung', agencyReference: 'E2E-GS', createDefaultDeadline: false }), { linkedCaseId: caseId });
  const updated = await productPage.evaluate(async ({ id }) => window.gremiaSbv.equalization.update(id, { applicationStatus: 'eingereicht', outcome: 'offen' }), { id: row.id });
  expect(updated.applicationStatus).toBe('eingereicht');
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Geführte Gleichstellungs-Erstanlage erzeugt sichtbar Person, Fall und Verfahren', async ({ productPage, runtimeErrors }) => {
  await productPage.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Gleichstellung', exact: true }).click();
  await productPage.getByRole('button', { name: 'Vorgang anlegen', exact: true }).click();
  const dialog = productPage.getByRole('dialog', { name: 'Gleichstellungs-/GdB-Vorgang anlegen' });
  await expect(dialog).toContainText('Personeneintrag');
  await expect(dialog).toContainText('verknüpfte Fallakte');
  await expect(dialog).toContainText('Die Löschung bleibt manuell');
  await dialog.getByLabel('Vorname').fill('Geführte');
  await dialog.getByLabel('Nachname').fill('Erstanlage');
  await dialog.getByLabel('Aktenzeichen').fill('E2E-INTAKE-1');
  await dialog.getByLabel('Kurzbeschreibung / Anliegen').fill('Funktionsprüfung des zusammengehörigen Anlagevorgangs');
  await dialog.getByRole('button', { name: 'Person, Fall und Verfahren anlegen' }).click();
  await expect(dialog).toBeHidden();

  const state = await productPage.evaluate(async () => {
    const [cases, persons, processes, retention] = await Promise.all([
      window.gremiaSbv.cases.list(),
      window.gremiaSbv.persons.list(),
      window.gremiaSbv.equalization.list(),
      window.gremiaSbv.retention.dashboard(),
    ]);
    const caseRecord = cases.find((item) => item.caseNumber === 'E2E-INTAKE-1');
    const person = persons.find((item) => item.firstName === 'Geführte' && item.lastName === 'Erstanlage');
    return {
      caseRecord,
      person,
      process: processes.find((item) => item.caseId === caseRecord?.id),
      personDeletionCandidate: retention.candidates.find((item) => item.entityType === 'protected_person' && item.entityId === person?.id),
    };
  });
  expect(state.caseRecord?.protectedPersonId).toBe(state.person?.id);
  expect(state.process?.applicationStatus).toBe('beratung');
  expect(state.personDeletionCandidate).toBeUndefined();
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Kündigungsanhörung anlegen und aktualisieren', async ({ productPage, runtimeErrors }) => {
  const row = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.termination.create({ caseId: linkedCaseId, terminationType: 'ordentlich', protectionStatus: 'schwerbehindert', employerReason: 'E2E' }), { linkedCaseId: caseId });
  const updated = await productPage.evaluate(async ({ id }) => window.gremiaSbv.termination.update(id, { status: 'stellungnahme_in_arbeit', sbvAssessment: 'Nicht sozial gerechtfertigt' }), { id: row.id });
  expect(updated.sbvAssessment).toBe('Nicht sozial gerechtfertigt');
  await assertNoRuntimeErrors(runtimeErrors);
});
