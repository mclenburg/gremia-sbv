import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseAdapter } from "../databaseService.js";
import { PersonalDataAuditLogService } from "../auditLogService.js";
import { ActivityReportProjectionService } from "../activityReportProjectionService.js";
import { TempFileService } from "../tempFileService.js";
import { normalizeReportType } from "../../src/app/core/models/report.model.js";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType,
} from "../../src/app/core/models/report.model.js";
import { escapeHtml, formatDateTime, nowIso } from './reportCoreSupport.js';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
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
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }
  return result;
}

export function hasPlainDocumentExtension(filePath: string): boolean {
  return /\.(pdf|doc|docx|xls|xlsx|txt|csv|md|json|xml|rtf)$/i.test(filePath);
}

export function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(
    path.resolve(parentPath),
    path.resolve(childPath),
  );
  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}

export function metricCards(metrics: Record<string, number | string>): string {
  return `<section class="metric-grid">${Object.entries(metrics)
    .map(
      ([label, value]) =>
        `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`,
    )
    .join("")}</section>`;
}

export function table(
  headers: string[],
  body: Array<Array<unknown>>,
  empty = "Keine Daten vorhanden.",
): string {
  if (!body.length) return `<div class="empty">${escapeHtml(empty)}</div>`;
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${body
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
}

export function warningList(warnings: string[]): string {
  if (!warnings.length)
    return '<div class="ok">Keine Auffälligkeiten in dieser Prüfung.</div>';
  return `<section class="warnings"><h2>Prüfhinweise</h2>${warnings.map((warning) => `<p>⚠ ${escapeHtml(warning)}</p>`).join("")}</section>`;
}

export function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export function markdownToReportHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;
  let inTable = false;
  let inSection = false;

  function closeList(): void {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  function closeTable(): void {
    if (inTable) {
      html.push("</tbody></table></section>");
      inTable = false;
    }
  }

  function closeSection(): void {
    closeList();
    if (inSection) {
      html.push("</section>");
      inSection = false;
    }
  }

  function ensureSection(): void {
    closeTable();
    if (!inSection) {
      html.push('<section class="report-section">');
      inSection = true;
    }
  }

  function startSection(headingHtml: string): void {
    closeTable();
    closeSection();
    html.push('<section class="report-section">');
    html.push(headingHtml);
    inSection = true;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (/^\|.+\|$/.test(trimmed)) {
      closeSection();
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      if (!inTable) {
        html.push('<section class="report-section report-table-section"><table><tbody>');
        inTable = true;
      }
      html.push(
        `<tr>${cells.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`,
      );
      continue;
    }

    closeTable();

    if (line.startsWith("# ")) {
      startSection(
        `<h2 class="document-heading">${inlineMarkdown(line.slice(2))}</h2>`,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      startSection(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("### ")) {
      ensureSection();
      closeList();
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("- ")) {
      ensureSection();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    if (trimmed) {
      ensureSection();
      closeList();
      html.push(`<p>${inlineMarkdown(line)}</p>`);
      continue;
    }

    closeList();
  }

  closeTable();
  closeSection();
  return html.join("\n");
}

export function reportShell(
  title: string,
  subtitle: string,
  classification: string,
  content: string,
  warnings: string[],
): string {
  const generated = formatDateTime(nowIso());
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 17mm 14mm; size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, Arial, Helvetica, sans-serif; color: #1f2933; background: #ffffff; }
  .page { min-height: 100vh; padding: 18px 20px; background: #ffffff; }
  .header { border: 1px solid #c6ccd3; border-left: 7px solid #b58500; padding: 18px 20px; background: linear-gradient(135deg, #f8fafc 0%, #eef1f4 100%); margin-bottom: 20px; }
  .kicker { color: #8a6400; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 900; }
  h1 { margin: 8px 0 4px; font-size: 28px; line-height: 1.15; color: #111827; text-transform: uppercase; }
  h2 { margin: 0 0 10px; font-size: 15px; color: #7c5700; text-transform: uppercase; letter-spacing: 0.08em; }
  h3 { margin: 14px 0 6px; font-size: 12px; color: #1f2933; text-transform: uppercase; }
  p { color: #24313d; font-size: 11px; line-height: 1.5; margin: 6px 0; }
  .subtitle { color: #394858; font-size: 12px; }
  .classification { display: inline-block; margin-top: 12px; padding: 6px 9px; border: 1px solid #b58500; color: #5f4500; background: #fff4c2; font-weight: 900; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
  .meta { margin-top: 8px; color: #566575; font-size: 10px; }
  .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0 18px; }
  .metric { border: 1px solid #cbd3dc; background: #f8fafc; padding: 10px; min-height: 64px; }
  .metric span { display: block; color: #4b5c6d; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; font-weight: 800; }
  .metric strong { display: block; color: #8a6400; font-size: 22px; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 0; background: #ffffff; }
  th { text-align: left; padding: 8px; border: 1px solid #c7ced6; background: #e9edf2; color: #5f4500; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; }
  td { padding: 8px; border: 1px solid #d4dae1; color: #1f2933; font-size: 11px; vertical-align: top; }
  .box, .report-section { border: 1px solid #cbd3dc; background: #f8fafc; padding: 12px; margin: 10px 0; break-inside: avoid; page-break-inside: avoid; }
  .report-section + .report-section { margin-top: 12px; }
  .report-section ul { margin: 7px 0 0 18px; padding: 0; }
  .report-section li { margin: 4px 0; font-size: 11px; line-height: 1.45; color: #24313d; }
  .report-table-section { padding: 10px; }
  .document-heading { font-size: 16px; }
  .warnings { border: 1px solid #c49100; background: #fff7d6; padding: 12px; margin: 16px 0; }
  .warnings p { margin: 7px 0; color: #5c4300; font-size: 11px; font-weight: 700; }
  .ok { border: 1px solid #7aa56d; background: #eef8ec; color: #234b22; padding: 10px; font-size: 11px; }
  .empty { border: 1px dashed #a7b0bb; color: #4b5c6d; padding: 12px; font-size: 11px; background: #fbfcfd; }
  .status-green { color: #176a28; font-weight: 900; }
  .status-yellow { color: #795500; font-weight: 900; }
  .status-red { color: #a11d1d; font-weight: 900; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #c6ccd3; color: #566575; font-size: 9px; }
</style>
</head>
<body><main class="page">
<header class="header"><div class="kicker">Gremia.SBV · Bericht</div><h1>${escapeHtml(title)}</h1><div class="subtitle">${escapeHtml(subtitle)}</div><div class="classification">${escapeHtml(classification)}</div><div class="meta">Erstellt: ${escapeHtml(generated)}</div></header>
${content}
${warningList(warnings)}
<footer class="footer">Offline erzeugt durch Gremia.SBV. Tätigkeitsberichte sind anonymisiert zu verwenden; interne Prüfberichte bleiben vertraulich.</footer>
</main></body></html>`;
}
