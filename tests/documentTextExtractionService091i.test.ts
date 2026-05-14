import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractDocumentTextBestEffort, inferMimeType, isDocumentTextExtractionSupported } from '../services/documents/documentTextExtractionService';

describe('Dokumenttext-Extraktion 0.9.1', () => {
  it('extrahiert Textdateien plattformunabhängig ohne externe Dienste', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-doc-extract-'));
    const filePath = path.join(dir, 'protokoll.txt');
    const buffer = Buffer.from('BEM Gespräch mit Arbeitsplatzanpassung und Hilfsmittelprüfung', 'utf8');
    writeFileSync(filePath, buffer);

    const result = await extractDocumentTextBestEffort(filePath, 'protokoll.txt', buffer);

    expect(result).toEqual({
      text: 'BEM Gespräch mit Arbeitsplatzanpassung und Hilfsmittelprüfung',
      mimeType: 'text/plain',
      quality: 'native_text',
      status: 'extracted',
      extractorId: 'plain-text',
    });
  });

  it('kennzeichnet nicht unterstützte Binärformate ohne Cloud- oder OCR-Fallback als unsupported', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-doc-extract-'));
    const filePath = path.join(dir, 'scan.bin');
    const buffer = Buffer.from([0, 1, 2, 3, 4, 5]);
    writeFileSync(filePath, buffer);

    const result = await extractDocumentTextBestEffort(filePath, 'scan.bin', buffer);

    expect(result.text).toBe('');
    expect(result.mimeType).toBe('application/octet-stream');
    expect(result.quality).toBe('unknown');
    expect(result.status).toBe('unsupported');
    expect(result.extractorId).toBe('unsupported');
  });

  it('kennzeichnet beschädigte DOCX-Dateien diagnosefähig ohne externe Tools', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-doc-extract-'));
    const filePath = path.join(dir, 'kaputt.docx');
    const buffer = Buffer.from('das ist keine zip-datei', 'utf8');
    writeFileSync(filePath, buffer);

    const result = await extractDocumentTextBestEffort(filePath, 'kaputt.docx', buffer);

    expect(result.text).toBe('');
    expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.quality).toBe('unknown');
    expect(result.status).toBe('failed');
    expect(result.extractorId).toBe('docx-openxml');
    expect(result.errorMessage).toBeTruthy();
  });

  it('macht unterstützte Formate ohne Plattformannahmen erkennbar', () => {
    expect(isDocumentTextExtractionSupported('scan.pdf')).toBe(true);
    expect(isDocumentTextExtractionSupported('protokoll.docx')).toBe(true);
    expect(isDocumentTextExtractionSupported('notiz.txt')).toBe(true);
    expect(isDocumentTextExtractionSupported('bild.png')).toBe(false);
  });

  it('ordnet Office- und PDF-Dateien über den Dateinamen reproduzierbar einem MIME-Typ zu', () => {
    expect(inferMimeType('antrag.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(inferMimeType('bescheid.pdf')).toBe('application/pdf');
    expect(inferMimeType('notiz.md')).toBe('text/markdown');
  });
});
