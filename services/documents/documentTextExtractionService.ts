import path from 'node:path';
import yauzl from 'yauzl';
import type { Entry, ZipFile } from 'yauzl';
import type { Readable } from 'node:stream';
import type { CaseSearchExtractionQuality } from '../search/searchTypes.js';
import { readPdfPages } from './pdfPageTextService.js';

const TEXT_EXTRACTION_LIMIT = 300_000;
const EXTRACTION_ERROR_LIMIT = 1_000;
const MAX_ZIP_TEXT_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_ZIP_TEXT_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_ZIP_TEXT_ENTRIES = 64;

export type DocumentTextExtractionStatus = 'extracted' | 'empty' | 'unsupported' | 'failed' | 'unknown';

export interface DocumentTextExtractionInput {
  filePath: string;
  filename: string;
  buffer: Buffer;
}

export interface DocumentTextExtractionResult {
  text: string;
  mimeType: string;
  quality: CaseSearchExtractionQuality;
  status: DocumentTextExtractionStatus;
  extractorId: string;
  errorMessage?: string;
  pdfPages?: { pageNumber: number; text: string; needsOcr: boolean }[];
}

interface DocumentTextExtractor {
  readonly id: string;
  canHandle(input: DocumentTextExtractionInput, mimeType: string): boolean;
  extract(input: DocumentTextExtractionInput, mimeType: string): Promise<DocumentTextExtractionResult>;
}

const PLAIN_TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.log']);

export function inferMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.log': 'text/plain',
  };
  return map[ext] ?? 'application/octet-stream';
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

function stripXml(value: string): string {
  return normalizeText(decodeXmlEntities(value.replace(/<[^>]+>/g, ' ')));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, TEXT_EXTRACTION_LIMIT);
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, EXTRACTION_ERROR_LIMIT);
  return String(error ?? 'Unbekannter Extraktionsfehler').slice(0, EXTRACTION_ERROR_LIMIT);
}

function extractionResult(
  input: Partial<DocumentTextExtractionResult> & Pick<DocumentTextExtractionResult, 'mimeType' | 'extractorId'>,
): DocumentTextExtractionResult {
  const text = normalizeText(input.text ?? '');
  const status = input.status ?? (text ? 'extracted' : 'empty');
  const quality = input.quality ?? (text ? 'native_text' : 'unknown');
  return {
    text,
    mimeType: input.mimeType,
    quality,
    status,
    extractorId: input.extractorId,
    ...(input.errorMessage ? { errorMessage: input.errorMessage.slice(0, EXTRACTION_ERROR_LIMIT) } : {}),
    ...(input.pdfPages ? { pdfPages: input.pdfPages } : {}),
  };
}

async function safeExtract(
  input: DocumentTextExtractionInput,
  mimeType: string,
  extractor: DocumentTextExtractor,
): Promise<DocumentTextExtractionResult> {
  try {
    return await extractor.extract(input, mimeType);
  } catch (error) {
    return extractionResult({
      text: '',
      mimeType,
      quality: 'unknown',
      status: 'failed',
      extractorId: extractor.id,
      errorMessage: normalizeErrorMessage(error),
    });
  }
}

function readZipTextEntries(
  filePath: string,
  matcher: (entryName: string) => boolean,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    yauzl.open(filePath, { lazyEntries: true }, (openError: Error | null, zipfile: ZipFile | undefined) => {
      if (openError || !zipfile) {
        reject(openError ?? new Error('ZIP-Datei konnte nicht geöffnet werden.'));
        return;
      }
      let totalBytes = 0;
      let entryCount = 0;
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        zipfile.close();
        reject(error);
      };
      zipfile.on('entry', (entry: Entry) => {
        if (settled) return;
        if (!matcher(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        entryCount += 1;
        if (entryCount > MAX_ZIP_TEXT_ENTRIES || entry.uncompressedSize > MAX_ZIP_TEXT_ENTRY_BYTES
          || totalBytes + entry.uncompressedSize > MAX_ZIP_TEXT_TOTAL_BYTES) {
          fail(new Error('Office-Dokument überschreitet die zulässige Größe für die Textextraktion.'));
          return;
        }
        zipfile.openReadStream(entry, (streamError: Error | null, stream: Readable | undefined) => {
          if (settled) {
            stream?.destroy();
            return;
          }
          if (streamError || !stream) {
            fail(streamError ?? new Error(`ZIP-Eintrag ${entry.fileName} konnte nicht gelesen werden.`));
            return;
          }
          const parts: Buffer[] = [];
          let entryBytes = 0;
          stream.on('data', (part: Buffer | string | Uint8Array) => {
            const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
            entryBytes += bytes.length;
            totalBytes += bytes.length;
            if (entryBytes > MAX_ZIP_TEXT_ENTRY_BYTES || totalBytes > MAX_ZIP_TEXT_TOTAL_BYTES) {
              stream.destroy();
              fail(new Error('Office-Dokument überschreitet die zulässige Größe für die Textextraktion.'));
              return;
            }
            parts.push(bytes);
          });
          stream.on('error', fail);
          stream.on('end', () => {
            if (settled) return;
            chunks.push(stripXml(Buffer.concat(parts).toString('utf8')));
            zipfile.readEntry();
          });
        });
      });
      zipfile.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(chunks.filter(Boolean));
      });
      zipfile.on('error', fail);
      zipfile.readEntry();
    });
  });
}

const plainTextExtractor: DocumentTextExtractor = {
  id: 'plain-text',
  canHandle: (input) => PLAIN_TEXT_EXTENSIONS.has(path.extname(input.filename).toLowerCase()),
  async extract(input, mimeType) {
    return extractionResult({
      text: input.buffer.toString('utf8'),
      mimeType,
      quality: 'native_text',
      status: 'extracted',
      extractorId: 'plain-text',
    });
  },
};

const pdfTextLayerExtractor: DocumentTextExtractor = {
  id: 'pdf-text-layer',
  canHandle: (input) => path.extname(input.filename).toLowerCase() === '.pdf',
  async extract(input, mimeType) {
    const pages = await readPdfPages(input.buffer);
    const text = pages.map((page) => page.text).filter(Boolean).join('\n');
    return extractionResult({
      text,
      mimeType,
      quality: text ? 'native_text' : 'unknown',
      status: text ? 'extracted' : 'empty',
      extractorId: 'pdf-text-layer',
      pdfPages: pages,
    });
  },
};

const docxOpenXmlExtractor: DocumentTextExtractor = {
  id: 'docx-openxml',
  canHandle: (input) => path.extname(input.filename).toLowerCase() === '.docx',
  async extract(input, mimeType) {
    const entries = await readZipTextEntries(
      input.filePath,
      (entry) => entry === 'word/document.xml'
        || /^word\/(header|footer)\d+\.xml$/.test(entry)
        || entry === 'word/footnotes.xml'
        || entry === 'word/endnotes.xml'
        || entry === 'word/comments.xml',
    );
    const text = entries.join('\n');
    return extractionResult({
      text,
      mimeType,
      quality: text ? 'native_text' : 'unknown',
      status: text ? 'extracted' : 'empty',
      extractorId: 'docx-openxml',
    });
  },
};

const xlsxOpenXmlExtractor: DocumentTextExtractor = {
  id: 'xlsx-openxml',
  canHandle: (input) => path.extname(input.filename).toLowerCase() === '.xlsx',
  async extract(input, mimeType) {
    const entries = await readZipTextEntries(
      input.filePath,
      (entry) => entry === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(entry),
    );
    const text = entries.join('\n');
    return extractionResult({
      text,
      mimeType,
      quality: text ? 'native_text' : 'unknown',
      status: text ? 'extracted' : 'empty',
      extractorId: 'xlsx-openxml',
    });
  },
};

const DOCUMENT_TEXT_EXTRACTORS: readonly DocumentTextExtractor[] = [
  plainTextExtractor,
  pdfTextLayerExtractor,
  docxOpenXmlExtractor,
  xlsxOpenXmlExtractor,
];

export async function extractDocumentTextBestEffort(
  filePath: string,
  filename: string,
  buffer: Buffer,
): Promise<DocumentTextExtractionResult> {
  const input: DocumentTextExtractionInput = { filePath, filename, buffer };
  const mimeType = inferMimeType(filename);
  const extractor = DOCUMENT_TEXT_EXTRACTORS.find((candidate) => candidate.canHandle(input, mimeType));

  if (!extractor) {
    return extractionResult({
      text: '',
      mimeType,
      quality: 'unknown',
      status: 'unsupported',
      extractorId: 'unsupported',
    });
  }

  return safeExtract(input, mimeType, extractor);
}
