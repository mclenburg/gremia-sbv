import { test, expect } from './support/test';

test('zeigt bei unbekannter Zielfähigkeit einen Export mit Format 2 als wählbarem Vorschlag', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true }).click();
  await page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' })
    .getByRole('button', { name: /^Urlaubsvertretung/ }).click();

  const exportRegion = page.getByRole('region', { name: 'Urlaubsvertretung übergeben' });
  const targetFormat = exportRegion.getByRole('combobox', { name: 'Zielformat der Vertretungsinstanz' });
  await expect(targetFormat).toHaveValue('2');
  await expect(exportRegion.getByRole('combobox', { name: 'Schutzart' })).toHaveCount(0);
  await expect(exportRegion.getByRole('form', { name: 'Format-2-Fallübergabe' })).toBeVisible();
  await expect(exportRegion.getByRole('form', { name: 'Format-5-Vertretung' })).toHaveCount(0);
  await targetFormat.selectOption('4');
  await expect(exportRegion.getByRole('combobox', { name: 'Schutzart' })).toBeVisible();
  await expect(exportRegion.getByRole('form', { name: 'Format-4-Fallübergabe' })).toBeVisible();
  await targetFormat.selectOption('2');
  await expect(exportRegion.getByRole('combobox', { name: 'Schutzart' })).toHaveCount(0);
  await expect(exportRegion.getByLabel('Transport-Passphrase')).toBeVisible();
});

test('wählt bei bestätigter Format-5-Fähigkeit automatisch nur den erweiterten Exportablauf', async ({ page }) => {
  await page.evaluate(async () => {
    const identity = await window.gremiaSbv.transferIdentity.get();
    window.gremiaSbv.transferIdentity.listRecipientProfiles = async () => [{
      id: 'verified-format-5', label: 'Verifizierte Vertretung',
      instanceId: identity.instanceId, keyFingerprint: identity.keyFingerprint,
      recipientToken: identity.recipientToken, active: true,
      capabilityStatus: 'verified', capabilityConfirmedAt: new Date().toISOString(),
      capabilities: { protocolVersion: 1, readFormats: [1, 2, 3, 4, 5], writeFormats: [2, 4, 5],
        features: ['manual_capability_exchange', 'vacation_scope_v5', 'return_scope_v5'],
        buildVersion: '0.9.9', revision: 1, issuedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }];
  });
  await page.getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('button', { name: 'Übergaben', exact: true }).click();
  await page.getByRole('navigation', { name: 'Übergabe-Arbeitsbereiche Navigation' })
    .getByRole('button', { name: /^Urlaubsvertretung/ }).click();
  const region = page.getByRole('region', { name: 'Urlaubsvertretung übergeben' });
  await region.getByRole('combobox', { name: 'Empfängerprofil' }).selectOption('verified-format-5');
  await expect(region.getByRole('combobox', { name: 'Zielformat der Vertretungsinstanz' })).toHaveValue('5');
  await expect(region.getByRole('form', { name: 'Format-2-Fallübergabe' })).toHaveCount(0);
  await region.getByLabel('Vertretung endet am').fill('2099-11-30');
  await expect(region.getByRole('form', { name: 'Format-5-Vertretung' })).toBeVisible();
  await expect(region.getByRole('form', { name: 'Format-4-Fallübergabe' })).toHaveCount(0);
});
