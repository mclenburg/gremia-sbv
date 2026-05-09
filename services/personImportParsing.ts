import { createHash } from 'node:crypto';
import yauzl from 'yauzl';
import type { PersonImportColumnMapping, ProtectionStatus } from '../src/app/core/models/protected-person.model.js';

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

async function openZipFile(filePath: string): Promise<yauzl.ZipFile> {
  return await new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) reject(error ?? new Error(`XLSX-Datei konnte nicht geöffnet werden: ${filePath}`));
      else resolve(zipFile);
    });
  });
}

async function readZipEntries(filePath: string): Promise<Map<string, Buffer>> {
  const zip = await openZipFile(filePath);
  const entries = new Map<string, Buffer>();
  return await new Promise((resolve, reject) => {
    zip.readEntry();
    zip.on('entry', (entry) => {
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
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
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
  return rows.filter((current) => current.some((entry) => normalizeCell(entry).length > 0));
}

export async function parseXlsxFile(filePath: string, sheetName?: string): Promise<{ rows: string[][]; sheetName: string; sheets: string[] }> {
  const entries = await readZipEntries(filePath);
  const workbook = entries.get('xl/workbook.xml')?.toString('utf8') ?? '';
  const sheets = [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*sheetId="(\d+)"/g)].map((match) => ({ name: decodeXml(match[1]), sheetId: match[2] }));
  const selected = sheets.find((sheet) => sheet.name === sheetName) ?? sheets[0] ?? { name: 'Tabelle1', sheetId: '1' };
  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '');
  const sheetXml = entries.get(`xl/worksheets/sheet${selected.sheetId}.xml`)?.toString('utf8')
    ?? entries.get('xl/worksheets/sheet1.xml')?.toString('utf8')
    ?? '';
  return { rows: parseSheetRows(sheetXml, sharedStrings), sheetName: selected.name, sheets: sheets.map((sheet) => sheet.name) };
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
  if (/gleich/.test(normalized)) return 'equivalent';
  if (/schwer|sb|50/.test(normalized)) return 'severely_disabled';
  if (/antrag|beantragt|läuft|laeuft/.test(normalized)) return 'application_pending';
  if (/abgelaufen|expired/.test(normalized)) return 'expired';
  if (/inaktiv|nicht aktiv|ausgeschieden/.test(normalized)) return 'inactive';
  return 'unclear';
}

export function normalizeDateString(value: string | undefined): string | undefined {
  const cleaned = normalizeCell(value);
  if (!cleaned) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);
  const match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const excelNumber = Number(cleaned);
  if (Number.isFinite(excelNumber) && excelNumber > 20_000 && excelNumber < 80_000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + excelNumber);
    return epoch.toISOString().slice(0, 10);
  }
  return cleaned;
}
