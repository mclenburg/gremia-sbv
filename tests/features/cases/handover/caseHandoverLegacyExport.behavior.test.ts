import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../../services/databaseService';
import { CaseHandoverService } from '../../../../services/caseHandoverService';
import { MigrationService } from '../../../../services/migrationService';
import { TransferInstanceIdentityService } from '../../../../services/transferInstanceIdentityService';
import { TransferRecipientProfileService } from '../../../../services/transferRecipientProfileService';
import { createTransferCapabilityDocument } from '../../../../services/transferCapabilityDocument';
import { openTestDatabase } from '../../../helpers/openTestDatabase';
import { createElement } from 'react';
import { LiveRegionProvider } from '../../../../src/app/shared/a11y/LiveRegionProvider';
import { ConfirmDialogProvider } from '../../../../src/app/shared/dialogs/ConfirmDialogProvider';
import { HandoverVacationTab } from '../../../../src/app/features/case-handover/HandoverVacationTab';
import { renderElement, visibleText } from '../../../helpers/renderedMarkup';

let source: DatabaseAdapter;
let target: DatabaseAdapter;
let temporaryRoot: string;

beforeEach(async () => {
  source = await openTestDatabase();
  target = await openTestDatabase();
  for (const database of [source, target]) {
    new MigrationService(database, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  }
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-handover-legacy-export-'));
  const at = '2026-11-11T08:00:00.000Z';
  source.prepare(`INSERT INTO cases (id, case_number, display_name, category, status, priority, opened_at, is_pseudonymized, is_locked, created_at, updated_at) VALUES (?, ?, ?, 'sonstiges', 'offen', 'normal', ?, 1, 0, ?, ?)`).run('case-legacy-export', 'SBV-LEGACY-1', 'Vertretungsakte', at, at, at);
});

afterEach(() => {
  source.close();
  target.close();
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

describe('ausdrücklicher Legacy-Export', () => {
  it('zeigt bei unbekannter Lesefähigkeit nur einen Export mit dem ältesten sicheren Vorschlag', () => {
    const rendered = renderElement(createElement(ConfirmDialogProvider, { children: createElement(LiveRegionProvider, {
      children: createElement(HandoverVacationTab, { cases: [], onCompleted: async () => undefined }),
    })
    }));
    const text = visibleText(rendered.markup);
    expect(text).toContain('Nur Fallakten · Format 4');
    expect(text).toContain('Nur Fallakten für ältere Instanzen · Format 2');
    expect(text).toContain('Lesefähigkeit unbekannt · Vorschlag: Format 2');
    expect(text).toContain('Nicht darstellbar: fallfreie Fristen, Sitzungen');
    expect(text).not.toContain('Format-5-Vertretung');
  });

  it('erzeugt Format 2 zielgebunden und importiert es erst nach Altformat-Bestätigung', async () => {
    const recipient = new TransferInstanceIdentityService(target).getPublicIdentity();
    const filePath = path.join(temporaryRoot, 'format2.gsbvtransfer');
    const passphrase = 'ausreichend lange Legacy-Passphrase';
    const sender = new CaseHandoverService(source, () => temporaryRoot);
    await sender.exportToFile({
      caseIds: ['case-legacy-export'],
      expiresAt: '2099-11-11T23:59:59.000Z',
      targetRecipientToken: recipient.recipientToken,
      passphrase,
      formatVersion: 2,
    }, filePath);

    expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toMatchObject({ version: 2, recipientBinding: { targetKeyFingerprint: recipient.keyFingerprint } });
    const receiver = new CaseHandoverService(target, () => temporaryRoot);
    expect(receiver.inspect(filePath, passphrase)).toMatchObject({ integrity: { formatVersion: 2, legacyFormat: true }, legacyImportConfirmationRequired: true });
    await expect(receiver.importFromFile({ filePath, passphrase, mode: 'create_new' })).rejects.toThrow(/Altformat/);
    expect((await receiver.importFromFile({ filePath, passphrase, mode: 'create_new', allowLegacyPackage: true })).createdCaseIds).toHaveLength(1);
  });

  it('weist schlüssellosen Format-2-Export und Amtsdaten vor dem Schreiben ab', async () => {
    const recipient = new TransferInstanceIdentityService(target).getPublicIdentity();
    const sender = new CaseHandoverService(source, () => temporaryRoot);
    const base = { caseIds: ['case-legacy-export'], targetRecipientToken: recipient.recipientToken, passphrase: 'lange Legacy-Passphrase', formatVersion: 2 as const, expiresAt: '2099-11-11T23:59:59.000Z' };
    const keyOnlyPath = path.join(temporaryRoot, 'key-only.gsbvtransfer');
    await expect(sender.exportToFile({ ...base, passphrase: '', protectionMode: 'recipient_key_only' }, keyOnlyPath)).rejects.toThrow(/Passphrase/);
    expect(fs.existsSync(keyOnlyPath)).toBe(false);
    const officePath = path.join(temporaryRoot, 'office.gsbvtransfer');
    await expect(sender.exportToFile({ ...base, packageType: 'office_handover' }, officePath)).rejects.toThrow(/Amtsübergabe/);
    expect(fs.existsSync(officePath)).toBe(false);
    const unknownPath = path.join(temporaryRoot, 'unknown.gsbvtransfer');
    await expect(sender.exportToFile({ ...base, formatVersion: 5 as 2 }, unknownPath)).rejects.toThrow(/nicht unterstützt/);
    expect(fs.existsSync(unknownPath)).toBe(false);
  });

  it('sperrt ein Format, das ein verifiziertes Empfängerprofil nicht lesen kann, vor Dateianlage', async () => {
    const sourceIdentity = new TransferInstanceIdentityService(source).getPrivateIdentity();
    const targetIdentity = new TransferInstanceIdentityService(target).getPrivateIdentity();
    const profiles = new TransferRecipientProfileService(source);
    const profile = profiles.save({ label: 'Ältere Vertretung', recipientToken: new TransferInstanceIdentityService(target).getPublicIdentity().recipientToken });
    profiles.acceptCapability(profile.id, createTransferCapabilityDocument(targetIdentity, sourceIdentity, {
      protocolVersion: 1, readFormats: [1, 2], writeFormats: [2], features: ['manual_capability_exchange'],
      buildVersion: '9.9.9', revision: 1, issuedAt: '2026-11-11T10:00:00.000Z',
    }), sourceIdentity);
    const filePath = path.join(temporaryRoot, 'unsupported-format.gsbvtransfer');
    await expect(new CaseHandoverService(source, () => temporaryRoot).exportToFile({
      caseIds: ['case-legacy-export'], targetRecipientToken: profile.recipientToken,
      passphrase: 'lange Transport-Passphrase', formatVersion: 4, expiresAt: '2099-11-11T23:59:59.000Z',
    }, filePath)).rejects.toThrow(/verifizierte.*Format 4/);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
