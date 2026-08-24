import { test, expect, assertNoRuntimeErrors } from './support/productTest';

test.describe.configure({ mode: 'serial' });

test('erzeugt alle Dokumente der Schwerbehindertenversammlung im echten Produkt', async ({ productPage, runtimeErrors }) => {
  const assembly = await productPage.evaluate(async () => window.gremiaSbv.sbvOffice.assemblies.save({
    year: new Date().getFullYear(),
    scheduledAt: `${new Date().getFullYear()}-10-15T17:00`,
    locationOrMode: 'Saal ÄÖÜ / hybrid',
    invitationAt: `${new Date().getFullYear()}-08-18`,
    agenda: 'TOP 1: Tätigkeitsbericht\nTOP 2: Aussprache',
    minutes: 'Die vereinbarten Maßnahmen werden nachgehalten.',
    employerReportStatus: 'requested',
    status: 'ready',
  }));

  for (const kind of ['invitation', 'agenda', 'activity_report_draft', 'result_minutes'] as const) {
    const outcome = await productPage.evaluate(
      async ({ id, documentKind }) => {
        try {
          return { ok: true as const, document: await window.gremiaSbv.sbvOffice.assemblies.generateDocument(id, documentKind) };
        } catch (error) {
          return {
            ok: false as const,
            error: error instanceof Error ? error.message : String(error),
            code: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined,
            operation: typeof error === 'object' && error !== null && 'operation' in error ? String(error.operation) : undefined,
          };
        }
      },
      { id: assembly.id, documentKind: kind },
    );
    if (!outcome.ok) {
      throw new Error(`Dokumenterzeugung ${kind} fehlgeschlagen: ${JSON.stringify({ outcome, runtimeErrors })}`);
    }
    const result = outcome.document;
    expect(result.document.id).toBeTruthy();
    expect(result.document.filename).toMatch(/\.pdf$/u);
    expect(result.document.sha256).toHaveLength(64);
    expect(result.previewStatus).toBe('requested');
  }

  await assertNoRuntimeErrors(runtimeErrors);
});
