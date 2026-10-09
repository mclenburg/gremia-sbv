import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { extractDocumentTextBestEffort, inferMimeType } from '../../../../services/documents/documentTextExtractionService';

function zipXmlEntries(entries: Array<[string, string]>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, xml] of entries) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(xml);
    const compressed = deflateRawSync(data);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    local.push(header, nameBytes, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(8, 10);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(compressed.length, 20);
    record.writeUInt32LE(data.length, 24);
    record.writeUInt16LE(nameBytes.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, nameBytes);
    offset += header.length + nameBytes.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

describe('Dokumenttext-Extraktion 0.9.1', () => {
  it('extrahiert normale DOCX- und XLSX-Texte, begrenzt aber große ZIP-Einträge', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-sbv-zip-extract-'));
    for (const [filename, entry] of [['normal.docx', 'word/document.xml'], ['normal.xlsx', 'xl/sharedStrings.xml']]) {
      const filePath = path.join(dir, filename);
      const buffer = zipXmlEntries([[entry, '<root>Erlaubter Text</root>']]);
      writeFileSync(filePath, buffer);
      expect((await extractDocumentTextBestEffort(filePath, filename, buffer)).text).toBe('Erlaubter Text');
    }
    const filePath = path.join(dir, 'gross.docx');
    const buffer = zipXmlEntries([['word/document.xml', `<root>${'A'.repeat(9 * 1024 * 1024)}</root>`]]);
    writeFileSync(filePath, buffer);
    const result = await extractDocumentTextBestEffort(filePath, 'gross.docx', buffer);
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toMatch(/zulässige Größe/);

    const manyPath = path.join(dir, 'viele.docx');
    const many = zipXmlEntries(Array.from({ length: 5 }, (_, index) => [
      `word/header${index + 1}.xml`, `<root>${'B'.repeat(7 * 1024 * 1024)}</root>`,
    ]));
    writeFileSync(manyPath, many);
    expect((await extractDocumentTextBestEffort(manyPath, 'viele.docx', many)).status).toBe('failed');
  });
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

  it('ordnet Office- und PDF-Dateien über den Dateinamen reproduzierbar einem MIME-Typ zu', () => {
    expect(inferMimeType('antrag.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(inferMimeType('bescheid.pdf')).toBe('application/pdf');
    expect(inferMimeType('notiz.md')).toBe('text/markdown');
  });
});
