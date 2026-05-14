import path from 'node:path';
import yauzl from 'yauzl';
import type { CaseSearchExtractionQuality } from '../search/searchTypes.js';

const TEXT_EXTRACTION_LIMIT = 300_000;
const EXTRACTION_ERROR_LIMIT = 1_000;

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

export function isDocumentTextExtractionSupported(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return PLAIN_TEXT_EXTENSIONS.has(ext) || ['.pdf', '.docx', '.xlsx'].includes(ext);
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

function extractPdfTextBestEffort(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const matches = [...raw.matchAll(/\(([^()]|\\.){3,}\)/g)]
    .map((match) => match[0].slice(1, -1).replace(/\\([\\()])/g, '$1'))
    .filter((text) => /[A-Za-zÄÖÜäöüß0-9]{3}/.test(text));
  return normalizeText(matches.join(' '));
}

function readZipTextEntries(
  filePath: string,
  matcher: (entryName: string) => boolean,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    yauzl.open(filePath, { lazyEntries: true }, (openError: unknown, zipfile: any) => {
      if (openError || !zipfile) {
        reject(openError ?? new Error('ZIP-Datei konnte nicht geöffnet werden.'));
        return;
      }
      zipfile.readEntry();
      zipfile.on('entry', (entry: any) => {
        if (!matcher(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        zipfile.openReadStream(entry, (streamError: unknown, stream: any) => {
          if (streamError || !stream) {
            reject(streamError ?? new Error(`ZIP-Eintrag ${entry.fileName} konnte nicht gelesen werden.`));
            return;
          }
          const parts: Buffer[] = [];
          stream.on('data', (part: Buffer | string | Uint8Array) => {
            parts.push(Buffer.isBuffer(part) ? part : Buffer.from(part));
          });
          stream.on('error', (error: unknown) => reject(error));
          stream.on('end', () => {
            chunks.push(stripXml(Buffer.concat(parts).toString('utf8')));
            zipfile.readEntry();
          });
        });
      });
      zipfile.on('end', () => resolve(chunks.filter(Boolean)));
      zipfile.on('error', (error: unknown) => reject(error));
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

const pdfBestEffortExtractor: DocumentTextExtractor = {
  id: 'pdf-best-effort',
  canHandle: (input) => path.extname(input.filename).toLowerCase() === '.pdf',
  async extract(input, mimeType) {
    const text = extractPdfTextBestEffort(input.buffer);
    return extractionResult({
      text,
      mimeType,
      quality: text ? 'native_text' : 'unknown',
      status: text ? 'extracted' : 'empty',
      extractorId: 'pdf-best-effort',
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
  pdfBestEffortExtractor,
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
