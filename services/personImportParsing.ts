import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import yauzl from 'yauzl';
import type { PersonImportColumnMapping, ProtectionStatus } from '../src/domain/models/protected-person.model.js';

export const MAX_PERSON_IMPORT_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_XLSX_ENTRY_BYTES = 8 * 1024 * 1024;
export const MAX_XLSX_TOTAL_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;
export const MAX_PERSON_IMPORT_ROWS = 20_000;

export function assertPersonImportFileSize(filePath: string): void {
  const size = statSync(filePath).size;
  if (size > MAX_PERSON_IMPORT_FILE_BYTES) throw new Error('Importdatei ist zu groß. Maximal 25 MB sind zulässig.');
}

export function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeCell(value: unknown): string {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

export function normalizeColumnKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function columnIndexFromRef(ref: string): number {
  let column = 0;
  for (const char of ref.toUpperCase()) {
    if (char < 'A' || char > 'Z') break;
    column = column * 26 + (char.charCodeAt(0) - 64);
  }
  return column - 1;
}

export function parseDelimitedText(text: string, delimiter = ';'): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(normalizeCell(cell));
      cell = '';
      continue;
    }

    if (char === '\n' && !quoted) {
      row.push(normalizeCell(cell));
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(normalizeCell(cell));
    rows.push(row);
  }

  return rows.filter((current) => current.some((entry) => entry.trim().length > 0));
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

async function openZipFile(buffer: Buffer): Promise<yauzl.ZipFile> {
  return await new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) reject(error ?? new Error('XLSX-Datei konnte nicht geöffnet werden.'));
      else resolve(zipFile);
    });
  });
}

async function readZipEntries(buffer: Buffer): Promise<Map<string, Buffer>> {
  if (buffer.byteLength > MAX_PERSON_IMPORT_FILE_BYTES) throw new Error('Importdatei ist zu groß. Maximal 25 MB sind zulässig.');
  const zip = await openZipFile(buffer);
  const entries = new Map<string, Buffer>();
  let totalUncompressed = 0;
  return await new Promise((resolve, reject) => {
    zip.readEntry();
    zip.on('entry', (entry) => {
      if (entry.uncompressedSize > MAX_XLSX_ENTRY_BYTES) {
        zip.close();
        reject(new Error('XLSX enthält einen zu großen internen Eintrag.'));
        return;
      }
      totalUncompressed += entry.uncompressedSize;
      if (totalUncompressed > MAX_XLSX_TOTAL_UNCOMPRESSED_BYTES) {
        zip.close();
        reject(new Error('XLSX überschreitet die zulässige entpackte Gesamtgröße.'));
        return;
      }
      if (/\/$/.test(entry.fileName)) {
        zip.readEntry();
        return;
      }
      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          reject(error ?? new Error(`XLSX-Eintrag konnte nicht gelesen werden: ${entry.fileName}`));
          return;
        }
        const chunks: Buffer[] = [];
        let streamedBytes = 0;
        stream.on('data', (chunk) => {
          const buffer = Buffer.from(chunk);
          streamedBytes += buffer.byteLength;
          if (streamedBytes > MAX_XLSX_ENTRY_BYTES) {
            stream.destroy(new Error('XLSX enthält einen zu großen internen Eintrag.'));
            return;
          }
          chunks.push(buffer);
        });
        stream.on('error', reject);
        stream.on('end', () => {
          entries.set(entry.fileName, Buffer.concat(chunks));
          zip.readEntry();
        });
      });
    });
    zip.on('end', () => resolve(entries));
    zip.on('error', reject);
  });
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si[\s\S]*?<\/si>/g;
  const textRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
  for (const si of xml.match(siRegex) ?? []) {
    let value = '';
    let match: RegExpExecArray | null;
    while ((match = textRegex.exec(si)) !== null) {
      value += decodeXml(match[1]);
    }
    strings.push(value);
  }
  return strings;
}

function parseSheetRows(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c([^>]*)>([\s\S]*?)<\/c>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const ref = attributes.match(/\br="([A-Z]+)\d+"/)?.[1] ?? 'A';
      const index = columnIndexFromRef(ref);
      const type = attributes.match(/\bt="([^"]+)"/)?.[1];
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
        ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1]
        ?? '';
      const value = type === 's' ? sharedStrings[Number(raw)] ?? '' : decodeXml(raw);
      cells[index] = normalizeCell(value);
    }
    rows.push(cells.map((cell) => cell ?? ''));
  }
  const filtered = rows.filter((current) => current.some((entry) => normalizeCell(entry).length > 0));
  if (filtered.length > MAX_PERSON_IMPORT_ROWS) throw new Error(`Import enthält mehr als ${MAX_PERSON_IMPORT_ROWS} Zeilen.`);
  return filtered;
}

function xmlAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:.-]+)\s*=\s*(["'])(.*?)\2/g)) attributes[match[1]] = decodeXml(match[3]);
  return attributes;
}

function workbookSheets(workbook: string): Array<{ name: string; relationId: string }> {
  return [...workbook.matchAll(/<sheet\s+([^>]*?)\/?\s*>/g)].map((match) => {
    const attributes = xmlAttributes(match[1]);
    const relationId = Object.entries(attributes).find(([name]) => name.endsWith(':id'))?.[1] ?? '';
    return { name: attributes.name ?? '', relationId };
  }).filter((sheet) => sheet.name);
}

function worksheetPath(relationships: string, relationId: string): string {
  const relation = [...relationships.matchAll(/<Relationship\s+([^>]*?)\/?\s*>/g)]
    .map((match) => xmlAttributes(match[1]))
    .find((attributes) => attributes.Id === relationId);
  if (!relation?.Target || relation.TargetMode === 'External') throw new Error('Excel-Tabellenblatt hat keine gültige interne Dateizuordnung.');
  const target = relation.Target.startsWith('/') ? relation.Target.slice(1) : posix.join('xl', relation.Target);
  const normalized = posix.normalize(target);
  if (!normalized.startsWith('xl/') || normalized.includes('..')) throw new Error('Excel-Tabellenblatt hat eine ungültige Dateizuordnung.');
  return normalized;
}

export async function parseXlsxBuffer(buffer: Buffer, sheetName?: string): Promise<{ rows: string[][]; sheetName: string; sheets: string[] }> {
  const entries = await readZipEntries(buffer);
  const workbook = entries.get('xl/workbook.xml')?.toString('utf8') ?? '';
  const sheets = workbookSheets(workbook);
  const selected = sheetName ? sheets.find((sheet) => sheet.name === sheetName) : sheets[0];
  if (!selected) throw new Error(sheetName ? `Excel-Tabellenblatt „${sheetName}“ wurde nicht gefunden.` : 'XLSX enthält kein lesbares Tabellenblatt.');
  const relationships = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '';
  const path = worksheetPath(relationships, selected.relationId);
  const sheetXml = entries.get(path)?.toString('utf8');
  if (sheetXml === undefined) throw new Error(`Excel-Tabellenblatt „${selected.name}“ konnte nicht gelesen werden.`);
  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '');
  return { rows: parseSheetRows(sheetXml, sharedStrings), sheetName: selected.name, sheets: sheets.map((sheet) => sheet.name) };
}

export async function parseXlsxFile(filePath: string, sheetName?: string): Promise<{ rows: string[][]; sheetName: string; sheets: string[] }> {
  assertPersonImportFileSize(filePath);
  return parseXlsxBuffer(readFileSync(filePath), sheetName);
}

export function getMappedValue(rowObject: Record<string, string>, mappingKey: keyof PersonImportColumnMapping, mapping: PersonImportColumnMapping): string | undefined {
  const columnName = mapping[mappingKey];
  if (typeof columnName !== 'string' || !columnName.trim()) return undefined;
  return rowObject[columnName] ?? rowObject[normalizeColumnKey(columnName)] ?? undefined;
}

export function splitFullName(fullName: string, mode: PersonImportColumnMapping['fullNameMode'] = 'first_last'): { firstName: string; lastName: string } {
  const cleaned = normalizeCell(fullName);
  if (!cleaned) return { firstName: '', lastName: '' };
  if (mode === 'last_comma_first' || cleaned.includes(',')) {
    const [lastName, ...rest] = cleaned.split(',');
    return { firstName: normalizeCell(rest.join(', ')), lastName: normalizeCell(lastName) };
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: '', lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

export function normalizeProtectionStatus(value: string | undefined): ProtectionStatus {
  const normalized = normalizeCell(value).toLowerCase();
  if (/(?:nicht|kein(?:e|en|er|es)?|ohne)\s+(?:mehr\s+)?(?:schwerbehinder|gleichgestell|gleichstellung)/.test(normalized)) return 'unclear';
  if (/abgelaufen|expired|erloschen|ungültig|ungueltig|nicht mehr gültig|nicht mehr gueltig/.test(normalized)) return 'expired';
  if (/inaktiv|nicht aktiv|ausgeschieden/.test(normalized)) return 'inactive';
  if (/abgelehnt/.test(normalized)) return 'unclear';
  if (/gleichgestell|gleichstellung/.test(normalized) && /schwerbehinder|\bsb\b/.test(normalized)) return 'unclear';
  if (/antrag|beantragt|läuft|laeuft|ausstehend/.test(normalized) && !/bewilligt|anerkannt/.test(normalized)) return 'application_pending';
  if (/gleichgestell|gleichstellung/.test(normalized)) return 'equivalent';
  if (/schwerbehinder|\bsb\b|\b50\b/.test(normalized)) return 'severely_disabled';
  return 'unclear';
}

export function normalizeDateString(value: string | undefined): string | undefined {
  const cleaned = normalizeCell(value);
  if (!cleaned) return undefined;
  const isValidDate = (date: string): boolean => {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  if (/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(cleaned)) {
    const date = cleaned.slice(0, 10);
    return isValidDate(date) ? date : undefined;
  }
  const match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const date = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    return isValidDate(date) ? date : undefined;
  }
  const excelNumber = Number(cleaned);
  if (Number.isFinite(excelNumber) && excelNumber > 20_000 && excelNumber < 80_000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(excelNumber));
    return epoch.toISOString().slice(0, 10);
  }
  return undefined;
}
