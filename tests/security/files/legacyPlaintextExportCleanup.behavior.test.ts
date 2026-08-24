import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LegacyPlaintextExportCleanupService,
  buildLegacyPlaintextCleanupWarning,
} from '../../../services/security/legacyPlaintextExportCleanupService';
import { decryptReportArchive } from '../../../services/reports/reportArchiveCrypto';
import { listCleartextFiles } from '../../../services/retentionSupport';

const DATABASE_KEY = Buffer.alloc(32, 23);

function validPdf(label: string): Buffer {
  return Buffer.from(`%PDF-1.7\n% Gremia.SBV ${label} – ÄÖÜ äöü ß\n%%EOF`, 'utf8');
}

describe('automatische Bereinigung alter Klartext-Berichtsexporte', () => {
  const directories: string[] = [];

  afterEach(() => {
    for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  function exportDirectory(): { dataDir: string; exportsDir: string } {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'gremia-legacy-export-'));
    directories.push(dataDir);
    const exportsDir = path.join(dataDir, 'exports');
    mkdirSync(exportsDir, { recursive: true });
    return { dataDir, exportsDir };
  }

  it('verschlüsselt ein reguläres PDF atomar, verifiziert den Inhalt und entfernt erst dann den Klartext', () => {
    const { dataDir, exportsDir } = exportDirectory();
    const source = path.join(exportsDir, 'Tätigkeitsbericht-2025.pdf');
    const target = `${source}.gsbvpdf`;
    const pdf = validPdf('Tätigkeitsbericht');
    writeFileSync(source, pdf, { mode: 0o600 });

    const result = new LegacyPlaintextExportCleanupService().cleanup({ dataDir, databaseKey: DATABASE_KEY });

    expect(result).toMatchObject({ converted: 1, recoveredExisting: 0, requiresReview: 0, failed: 0 });
    expect(existsSync(source)).toBe(false);
    expect(existsSync(target)).toBe(true);
    const verified = decryptReportArchive(readFileSync(target, 'utf8'), DATABASE_KEY);
    expect(verified.originalFileName).toBe('Tätigkeitsbericht-2025.pdf');
    expect(verified.pdf).toEqual(pdf);
    verified.pdf.fill(0);
    if (process.platform !== 'win32') expect(statSync(target).mode & 0o777).toBe(0o600);
  });

  it('behält den Klartext bei einem Löschfehler und schließt die Bereinigung beim nächsten Lauf über den verifizierten Container ab', () => {
    const { dataDir, exportsDir } = exportDirectory();
    const source = path.join(exportsDir, 'wiederaufnahme.pdf');
    const target = `${source}.gsbvpdf`;
    writeFileSync(source, validPdf('Wiederaufnahme'));
    const failing = new LegacyPlaintextExportCleanupService({
      removeFile: () => { throw new Error('simulierter Löschfehler'); },
    });

    const first = failing.cleanup({ dataDir, databaseKey: DATABASE_KEY });
    const protectedBytes = readFileSync(target);
    expect(first).toMatchObject({ converted: 0, recoveredExisting: 0, requiresReview: 1, failed: 1 });
    expect(existsSync(source)).toBe(true);

    const retry = new LegacyPlaintextExportCleanupService().cleanup({ dataDir, databaseKey: DATABASE_KEY });
    expect(retry).toMatchObject({ converted: 0, recoveredExisting: 1, requiresReview: 0, failed: 0 });
    expect(existsSync(source)).toBe(false);
    expect(readFileSync(target)).toEqual(protectedBytes);
  });

  it('fasst ungültige PDFs, unbekannte Formate und kollidierende Container nicht an und meldet sie zur Prüfung', () => {
    const { dataDir, exportsDir } = exportDirectory();
    const invalidPdf = path.join(exportsDir, 'kein-pdf.pdf');
    const unknown = path.join(exportsDir, 'notiz.txt');
    const collisionPdf = path.join(exportsDir, 'kollision.pdf');
    const collisionTarget = `${collisionPdf}.gsbvpdf`;
    writeFileSync(invalidPdf, 'kein PDF');
    writeFileSync(unknown, 'unbekanntes Altformat');
    writeFileSync(collisionPdf, validPdf('Kollision'));
    writeFileSync(collisionTarget, 'beschädigter vorhandener Container');

    const result = new LegacyPlaintextExportCleanupService().cleanup({ dataDir, databaseKey: DATABASE_KEY });

    expect(result).toMatchObject({ converted: 0, recoveredExisting: 0, invalidPdf: 1, unsupported: 1, failed: 1, requiresReview: 3 });
    expect(readFileSync(invalidPdf, 'utf8')).toBe('kein PDF');
    expect(readFileSync(unknown, 'utf8')).toBe('unbekanntes Altformat');
    expect(readFileSync(collisionTarget, 'utf8')).toBe('beschädigter vorhandener Container');
    expect(buildLegacyPlaintextCleanupWarning(result)).toMatch(/3 Dateien.*Datenschutzprüfung.*nächsten Entsperren/i);
  });

  it.runIf(process.platform !== 'win32')('folgt keinen symbolischen Links und macht sie in der Datenschutzprüfung sichtbar', () => {
    const { dataDir, exportsDir } = exportDirectory();
    const outside = path.join(dataDir, 'außerhalb.pdf');
    const link = path.join(exportsDir, 'verknüpfter-export.pdf');
    const outsidePdf = validPdf('außerhalb');
    writeFileSync(outside, outsidePdf);
    symlinkSync(outside, link);

    const result = new LegacyPlaintextExportCleanupService().cleanup({ dataDir, databaseKey: DATABASE_KEY });

    expect(result).toMatchObject({ converted: 0, symbolicLinks: 1, requiresReview: 1 });
    expect(readFileSync(outside)).toEqual(outsidePdf);
    expect(existsSync(link)).toBe(true);
    expect(listCleartextFiles(dataDir)).toContain('exports/verknüpfter-export.pdf');
  });
});
