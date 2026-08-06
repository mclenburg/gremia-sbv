import { test, expect, assertNoRuntimeErrors, reloadAndUnlock } from './support/productTest';

test.describe.configure({ mode: 'serial' });

let personId = '';
let caseId = '';
let contactId = '';
let templateId = '';
let journalId = '';

test('Person anlegen, ändern, persistent laden und löschen', async ({ productPage, runtimeErrors }) => {
  const created = await productPage.evaluate(async () => window.gremiaSbv.persons.create({
    firstName: 'Ada', lastName: 'Produkt-E2E', personnelNumber: 'E2E-P-1',
    organizationalUnit: 'IT', protectionStatus: 'severely_disabled', notes: 'Angelegt',
  }));
  personId = created.id;
  const updated = await productPage.evaluate(async ({ id }) => window.gremiaSbv.persons.update(id, { notes: 'Geändert', location: 'Rostock' }), { id: personId });
  expect(updated.notes).toBe('Geändert');
  await reloadAndUnlock(productPage);
  const persisted = await productPage.evaluate(async ({ id }) => (await window.gremiaSbv.persons.list()).find((row) => row.id === id), { id: personId });
  expect(persisted?.location).toBe('Rostock');
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Fallakte binden, Notiz CRUD und Volltextsuche', async ({ productPage, runtimeErrors }) => {
  const record = await productPage.evaluate(async ({ protectedPersonId }) => window.gremiaSbv.cases.create({
    caseNumber: 'E2E-CASE-1', displayName: 'Produktfall E2E', category: 'praevention',
    summary: 'Ausgangssachverhalt', protectedPersonId, personBindingState: 'active',
  }), { protectedPersonId: personId });
  caseId = record.id;
  const note = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.cases.createNote({ caseId: linkedCaseId, title: 'Erstnotiz', noteType: 'interne_notiz', content: 'SQL Volltext E2E Ausgang' }), { linkedCaseId: caseId });
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.cases.updateNote(id, { title: 'Geänderte Notiz', content: 'SQL Volltext E2E geändert' }), { id: note.id });
  const hits = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.cases.search({ caseId: linkedCaseId, query: 'geändert' }), { linkedCaseId: caseId });
  expect(hits.length).toBeGreaterThan(0);
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.cases.deleteNote(id), { id: note.id });
  expect(await productPage.evaluate(async ({ linkedCaseId }) => (await window.gremiaSbv.cases.listNotes(linkedCaseId)).length, { linkedCaseId: caseId })).toBe(0);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Kontakt vollständig anlegen, ändern und löschen', async ({ productPage, runtimeErrors }) => {
  const contact = await productPage.evaluate(async () => window.gremiaSbv.contacts.create({
    firstName: 'Mara', lastName: 'Inklusionsamt', organization: 'Amt E2E', category: 'inklusionsamt', email: 'e2e@example.invalid',
  }));
  contactId = contact.id;
  const changed = await productPage.evaluate(async ({ id }) => window.gremiaSbv.contacts.update(id, { role: 'Technische Beratung', phone: '0381-000' }), { id: contactId });
  expect(changed.role).toBe('Technische Beratung');
  const deletion = await productPage.evaluate(async ({ id }) => window.gremiaSbv.contacts.delete(id), { id: contactId });
  expect(deletion.deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Eigene Vorlage CRUD und reales Rendern', async ({ productPage, runtimeErrors }) => {
  const template = await productPage.evaluate(async () => window.gremiaSbv.templates.create({
    key: 'e2e-template-core', title: 'E2E Beteiligung', category: 'beteiligung', subject: 'Fall {{fall.aktenzeichen}}', body: 'Vorgang {{fall.bezeichnung}}', tags: ['e2e'],
  }));
  templateId = template.id;
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.templates.update(id, { subject: 'Geändert {{fall.aktenzeichen}}' }), { id: templateId });
  const rendered = await productPage.evaluate(async ({ id, linkedCaseId }) => window.gremiaSbv.templates.render({ templateId: id, caseId: linkedCaseId }), { id: templateId, linkedCaseId: caseId });
  expect(rendered.subject).toContain('E2E-CASE-1');
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.templates.delete(id), { id: templateId })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Tätigkeitsjournal CRUD, Verknüpfung, Zusammenfassung und Export', async ({ productPage, runtimeErrors }) => {
  const entry = await productPage.evaluate(async ({ linkedCaseId }) => window.gremiaSbv.activityJournal.create({
    title: 'E2E Beratung', category: 'consultation', durationMinutes: 30, timeMode: 'duration', status: 'follow_up_open',
    followUpDueAt: new Date(Date.now() + 86_400_000).toISOString(), links: [{ targetType: 'case', targetId: linkedCaseId }],
  }), { linkedCaseId: caseId });
  journalId = entry.id;
  await productPage.evaluate(async ({ id }) => window.gremiaSbv.activityJournal.update(id, { resultNote: 'Ergebnis gespeichert', durationMinutes: 45 }), { id: journalId });
  const links = await productPage.evaluate(async ({ id }) => window.gremiaSbv.activityJournal.listLinks(id), { id: journalId });
  expect(links).toHaveLength(1);
  const summary = await productPage.evaluate(async () => window.gremiaSbv.activityJournal.summary());
  expect(summary.totalMinutes).toBeGreaterThanOrEqual(45);
  const exported = await productPage.evaluate(async () => window.gremiaSbv.activityJournal.export({}, 'summary'));
  expect(exported).toBeTruthy();
  expect((await productPage.evaluate(async ({ id }) => window.gremiaSbv.activityJournal.delete(id), { id: journalId })).deleted).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});

test('Person am Ende ohne verbliebene Fallbindung löschen', async ({ productPage, runtimeErrors }) => {
  const result = await productPage.evaluate(async ({ id }) => window.gremiaSbv.persons.delete(id, 'Produkt-E2E abgeschlossen'), { id: personId });
  expect(result.ok).toBe(true);
  await assertNoRuntimeErrors(runtimeErrors);
});
