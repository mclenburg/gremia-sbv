import fs from 'node:fs';
import path from 'node:path';
import {
  externalReportDocument,
  list,
  metricCards,
  paragraph,
  reportDocument,
  section,
  table,
  type PdfBlock,
  type PdfDocumentDefinition,
} from '../documents/pdfDocumentRenderer.js';

export { list, metricCards, paragraph, section, table };
export type { PdfBlock, PdfDocumentDefinition };

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function listFilesRecursive(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const result: string[] = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile()) result.push(fullPath);
    }
  }
  return result;
}

export function hasPlainDocumentExtension(filePath: string): boolean {
  return /\.(pdf|doc|docx|xls|xlsx|txt|csv|md|json|xml|rtf)$/i.test(filePath);
}

export function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function inlineMarkdown(value: string): string {
  return value.replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
}

export function markdownToReportBlocks(markdown: string): PdfBlock[] {
  const result: PdfBlock[] = [];
  let sectionTitle: string | undefined;
  let sectionBlocks: PdfBlock[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];

  const target = (): PdfBlock[] => sectionTitle ? sectionBlocks : result;
  const flushList = (): void => {
    if (listItems.length) target().push(list(listItems));
    listItems = [];
  };
  const flushTable = (): void => {
    if (!tableRows.length) return;
    const [headers, ...rows] = tableRows;
    target().push(table(headers, rows));
    tableRows = [];
  };
  const flushSection = (): void => {
    flushList();
    flushTable();
    if (sectionTitle) result.push(section(sectionTitle, sectionBlocks));
    sectionTitle = undefined;
    sectionBlocks = [];
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    const heading = /^#{1,3}\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushSection();
      sectionTitle = inlineMarkdown(heading[1]);
      continue;
    }
    if (/^\|.+\|$/.test(trimmed)) {
      flushList();
      const cells = trimmed.slice(1, -1).split('|').map((cell) => inlineMarkdown(cell.trim()));
      if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) tableRows.push(cells);
      continue;
    }
    flushTable();
    if (trimmed.startsWith('- ')) {
      listItems.push(inlineMarkdown(trimmed.slice(2)));
      continue;
    }
    flushList();
    if (trimmed) target().push(paragraph(inlineMarkdown(trimmed)));
  }
  flushSection();
  return result;
}

export function reportShell(
  title: string,
  subtitle: string,
  classification: string,
  content: readonly PdfBlock[],
  warnings: readonly string[],
): PdfDocumentDefinition {
  return reportDocument(title, subtitle, classification, content, warnings);
}

export function externalReportShell(
  title: string,
  subtitle: string,
  content: readonly PdfBlock[],
): PdfDocumentDefinition {
  return externalReportDocument(title, subtitle, content);
}
