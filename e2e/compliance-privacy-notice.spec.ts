import { test, expect } from './support/isolatedTest';

test('erstellt eine ausgefüllte Datenschutzinformation ohne Platzhalter und lässt sie per Tastatur ausgeben', async ({ page }) => {
  await page.addInitScript(() => {
    const bridge = window.gremiaSbv!;
    const list = bridge.templateDefaults.list;
    bridge.templateDefaults.list = async () => ({
      ...await list(),
      'arbeitgeber.name': 'Muster GmbH',
      'sbv.name': 'SBV Muster',
      'sbv.email': 'sbv@muster.de',
      'datenschutz.kontakt.email': 'datenschutz@muster.de',
    });
    const inputs: unknown[] = [];
    Object.assign(window, { __NOTICE_INPUTS: () => inputs });
    bridge.reports.generate = async (input) => {
      inputs.push(input);
      return { ok: true, reportType: 'compliance_document', title: 'Datenschutzinformation', fileName: 'datenschutzinformation.gsbvpdf', filePath: '/test/datenschutzinformation.gsbvpdf', generatedAt: new Date().toISOString(), warnings: [], metrics: {} };
    };
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Compliance', exact: true }).click();
  await page.getByRole('navigation', { name: 'Compliance-Arbeitsbereiche' }).getByRole('button', { name: /Unterlagen/u }).click();
  await page.getByRole('button', { name: 'Datenschutzinformation erstellen' }).click();
  const panel = page.getByRole('region', { name: 'Datenschutzinformation erstellen' });
  await expect(panel.getByRole('textbox', { name: 'Verantwortliche Stelle' })).toHaveValue('Muster GmbH');
  await expect(panel.getByRole('textbox', { name: 'Kontakt der Schwerbehindertenvertretung' })).toHaveValue('SBV Muster · sbv@muster.de');

  const generate = panel.getByRole('button', { name: 'PDF erzeugen', exact: true });
  await generate.focus();
  await generate.press('Enter');
  await expect(panel.getByRole('alert')).toContainText('Rechtsgrundlagen');

  await panel.getByRole('textbox', { name: 'Rechtsgrundlagen' }).fill('Art. 6 und 9 DSGVO; § 178 SGB IX');
  await panel.getByRole('textbox', { name: 'Herkunft der Daten' }).fill('Angaben der betroffenen Person.');
  await panel.getByRole('textbox', { name: 'Empfänger oder Empfängerkategorien' }).fill('Schwerbehindertenvertretung.');
  await panel.getByRole('textbox', { name: 'Speicherdauer oder Kriterien' }).fill('Bis zum Zweckfortfall.');
  await panel.getByRole('textbox', { name: 'Drittlandübermittlung' }).fill('Keine.');
  await panel.getByRole('textbox', { name: 'Zuständige Datenschutzaufsichtsbehörde' }).fill('Landesdatenschutzbehörde.');
  await expect(panel.getByLabel('Dokumentvorschau Inhalt')).toContainText('Muster GmbH');
  await generate.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as Window & { __NOTICE_INPUTS: () => unknown[] }).__NOTICE_INPUTS().length)).toBe(1);
  const input = await page.evaluate(() => (window as Window & { __NOTICE_INPUTS: () => Array<{ complianceNoticeInput: { responsibleEntity: string } }> }).__NOTICE_INPUTS()[0]);
  expect(input.complianceNoticeInput.responsibleEntity).toBe('Muster GmbH');
});

test('bearbeitet Compliance-Markdown vor dem PDF und behält den Entwurf beim Unterlagenwechsel', async ({ page }) => {
  await page.addInitScript(() => {
    const inputs: unknown[] = [];
    Object.assign(window, { __COMPLIANCE_INPUTS: () => inputs });
    window.gremiaSbv!.reports.generate = async (input) => {
      inputs.push(input);
      return { ok: true, reportType: 'compliance_document', title: 'TOMs', fileName: 'toms.gsbvpdf', filePath: '/test/toms.gsbvpdf', generatedAt: new Date().toISOString(), warnings: [], metrics: {} };
    };
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Compliance', exact: true }).click();
  await page.getByRole('navigation', { name: 'Compliance-Arbeitsbereiche' }).getByRole('button', { name: /Unterlagen/u }).click();
  const editor = page.getByRole('textbox', { name: 'Markdown vor PDF-Erzeugung bearbeiten' });
  const editedBody = '# Eigene TOMs\n\n- Konkrete lokale Maßnahme';
  await editor.fill(editedBody);
  await expect(page.getByLabel('Dokumentvorschau Inhalt')).toContainText('Konkrete lokale Maßnahme');
  await page.getByRole('button', { name: 'VVT abrufen' }).click();
  await page.getByRole('button', { name: 'TOMs abrufen' }).click();
  await expect(editor).toHaveValue(editedBody);
  await page.getByRole('region', { name: 'Dokumentvorschau' }).getByRole('button', { name: 'PDF erzeugen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __COMPLIANCE_INPUTS: () => unknown[] }).__COMPLIANCE_INPUTS().length)).toBe(1);
  const input = await page.evaluate(() => (window as Window & { __COMPLIANCE_INPUTS: () => Array<{ complianceBody: string }> }).__COMPLIANCE_INPUTS()[0]);
  expect(input.complianceBody).toBe(editedBody);
});
