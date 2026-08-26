import { describe, expect, it, vi } from 'vitest';
import { generateAndRequestDocumentPreview } from '../../../electron/ipc/documentPreviewWorkflow';
import type { SecurityService } from '../../../services/securityService';
import type { SbvOfficeDocumentRecord } from '../../../services/sbvOfficeWorkflowDocumentAdapter';
import { ApplicationError } from '../../../src/domain/models/application-error.model';

const record: SbvOfficeDocumentRecord = {
  id: 'document-1',
  owner: { type: 'election', id: 'election-1' },
  title: 'Einladung zur Wahlversammlung',
  filename: 'einladung-wahlversammlung.pdf',
  mimeType: 'application/pdf',
  purpose: 'simplified_invitation',
  documentClass: 'generated_document',
  sha256: 'abc',
  sizeBytes: 4,
  createdAt: '2026-08-24T12:00:00.000Z',
};

function security(write: () => string = () => '/isolierte-vorschau/einladung.pdf') {
  return {
    cleanupTemporaryFiles: vi.fn(() => ({ deleted: 0, failed: 0, remaining: 0, bytesRemaining: 0, directories: [] })),
    writeTemporaryFile: vi.fn(write),
  } satisfies Pick<SecurityService, 'cleanupTemporaryFiles' | 'writeTemporaryFile'>;
}

describe('gemeinsamer PDF-Vorschauablauf', () => {
  it('speichert, verifiziert und wertet den erteilten externen Öffnungsauftrag als Erfolg', async () => {
    const plain = Buffer.from('%PDF');
    const opener = vi.fn(async () => '');
    const result = await generateAndRequestDocumentPreview({
      operation: 'elections:document:generate',
      generateFailureMessage: 'Wahldokument fehlgeschlagen.',
      security: security(),
      opener,
      generate: async () => record,
      read: async () => plain,
    });

    expect(result).toEqual({ document: record, previewStatus: 'requested' });
    expect(opener).toHaveBeenCalledWith('/isolierte-vorschau/einladung.pdf');
    expect(plain.equals(Buffer.alloc(4))).toBe(true);
  });

  it('behält das verschlüsselt gespeicherte Dokument bei einem Vorschaufehler als Erfolg mit Warnung', async () => {
    const result = await generateAndRequestDocumentPreview({
      operation: 'sbvOffice:assemblies:generateDocument',
      generateFailureMessage: 'Versammlungsdokument fehlgeschlagen.',
      security: security(() => { throw new Error('kein temporärer Schreibzugriff'); }),
      opener: async () => '',
      generate: async () => record,
      read: async () => Buffer.from('%PDF'),
    });

    expect(result.document).toBe(record);
    expect(result.previewStatus).toBe('unavailable');
    expect(result.previewMessage).toContain('temporäre Vorschau');
  });

  it('wertet einen abgelehnten Betriebssystem-Aufruf als gespeichertes Dokument ohne verfügbare Vorschau', async () => {
    const result = await generateAndRequestDocumentPreview({
      operation: 'elections:document:generate',
      generateFailureMessage: 'Wahldokument fehlgeschlagen.',
      security: security(),
      opener: async () => 'No application associated',
      generate: async () => record,
      read: async () => Buffer.from('%PDF'),
    });

    expect(result.document).toBe(record);
    expect(result.previewStatus).toBe('unavailable');
    expect(result.previewMessage).toContain('externe Vorschau-Anwendung');
  });

  it('liefert bei einem Erzeugungsfehler eine stufengenaue sichere Anwendungsfehlermeldung', async () => {
    const operation = 'elections:archive:pdf';
    const action = generateAndRequestDocumentPreview({
      operation,
      generateFailureMessage: 'Die Gesamt-Wahlakte konnte nicht gespeichert werden.',
      security: security(),
      opener: async () => '',
      generate: async () => { throw new Error('no such table: _0044_legacy'); },
      read: async () => Buffer.alloc(0),
    });

    await expect(action).rejects.toMatchObject({
      code: 'EXPORT_FAILED',
      message: 'Die Gesamt-Wahlakte konnte nicht gespeichert werden.',
      operation,
    } satisfies Partial<ApplicationError>);
  });

  it('bewahrt konkrete, sicher formulierte Validierungsfehler für die UI', async () => {
    const action = generateAndRequestDocumentPreview({
      operation: 'sbvOffice:assemblies:generateDocument',
      generateFailureMessage: 'Versammlungsdokument fehlgeschlagen.',
      security: security(),
      opener: async () => '',
      generate: async () => { throw new ApplicationError('VALIDATION_FAILED', 'Die Einladung benötigt einen Termin und einen Ort bzw. ein Format.'); },
      read: async () => Buffer.alloc(0),
    });

    await expect(action).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Die Einladung benötigt einen Termin und einen Ort bzw. ein Format.',
    });
  });
});
