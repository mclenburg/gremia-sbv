import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType
} from '../src/app/core/models/report.model.js';

const REPORT_DESCRIPTORS: ReportDescriptor[] = [
  {
    type: 'activity',
    title: 'Tätigkeitsbericht der SBV',
    shortTitle: 'Tätigkeitsbericht',
    description: 'Anonymisierte Jahres- oder Zeitraumsauswertung der SBV-Arbeit.',
    confidentiality: 'anonymized'
  },
  {
    type: 'privacy_audit',
    title: 'Datenschutz-Audit',
    shortTitle: 'Datenschutz-Audit',
    description: 'Technische und fachliche Prüfung des lokalen Datenbestands.',
    confidentiality: 'internal'
  },
  {
    type: 'case_deadline_controlling',
    title: 'Fall- und Fristen-Controlling',
    shortTitle: 'Controlling',
    description: 'Interne Übersicht über offene Fälle, überfällige Fristen und ruhende Vorgänge.',
    confidentiality: 'internal'
  },
  {
    type: 'bem_prevention',
    title: 'BEM- und Präventionsbericht',
    shortTitle: 'BEM/Prävention',
    description: 'Auswertung von BEM-, Präventions- und Arbeitsplatzsicherungsprozessen.',
    confidentiality: 'anonymized'
  },
  {
    type: 'termination_hearings',
    title: 'Kündigungsanhörungsbericht',
    shortTitle: 'Kündigungen',
    description: 'Auswertung kritischer Kündigungsanhörungen und Beteiligungsstände.',
    confidentiality: 'internal'
  },
  {
    type: 'system_integrity',
    title: 'System- und Integritätsbericht',
    shortTitle: 'Systemstatus',
    description: 'Technischer Bericht zu Schema, Migrationen, Audit-Log und Speicherorten.',
    confidentiality: 'technical'
  }
];

type Row = Record<string, any>;

interface ReportBuildResult {
  html: string;
  title: string;
  warnings: string[];
  metrics: Record<string, number | string>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function periodWhere(column: string, input: GenerateReportInput): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (input.periodStart) {
    parts.push(`${column} >= ?`);
    params.push(input.periodStart);
  }
  if (input.periodEnd) {
    parts.push(`${column} <= ?`);
    params.push(input.periodEnd);
  }
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
}

function isMissingTableError(error: unknown): boolean {
  return error instanceof Error && /no such table|no such column/i.test(error.message);
}

function count(db: DatabaseAdapter, sql: string, params: unknown[] = []): number {
  try {
    const row = db.prepare<{ value: number }>(sql).get(...params);
    return Number(row?.value ?? 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

function rows(db: DatabaseAdapter, sql: string, params: unknown[] = []): Row[] {
  try {
    return db.prepare<Row>(sql).all(...params);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

function scalarText(db: DatabaseAdapter, sql: string, params: unknown[] = [], fallback = '—'): string {
  try {
    const row = db.prepare<{ value: string }>(sql).get(...params);
    return String(row?.value ?? fallback);
  } catch (error) {
    if (isMissingTableError(error)) return fallback;
    throw error;
  }
}

function pragmaRows(db: DatabaseAdapter, sql: string): Row[] {
  try {
    const result = db.pragma(sql);
    return Array.isArray(result) ? result as Row[] : [];
  } catch {
    return [];
  }
}

function normalizeStatus(value: unknown): string {
  const raw = String(value ?? '').trim();
  const map: Record<string, string> = {
    open: 'Offen',
    offen: 'Offen',
    in_progress: 'In Bearbeitung',
    in_bearbeitung: 'In Bearbeitung',
    abgeschlossen: 'Abgeschlossen',
    closed: 'Abgeschlossen',
    ruhend: 'Ruhend',
    done: 'Erledigt',
    erledigt: 'Erledigt',
    overdue: 'Überfällig',
    ueberfaellig: 'Überfällig',
    suspended: 'Ausgesetzt',
    cancelled: 'Abgebrochen',
    critical: 'Kritisch',
    fatal: 'Kritisch',
    important: 'Wichtig',
    normal: 'Normal',
    custom: 'Freie Wiedervorlage',
    bem: 'BEM',
    prevention: 'Prävention',
    praevention: 'Prävention',
    termination_hearing: 'Kündigungsanhörung',
    equalization: 'Gleichstellung',
    gdb: 'GdB/Feststellung'
  };
  return map[raw] ?? map[raw.toLowerCase()] ?? (raw || '—');
}

function formatBytes(bytes: number): string {
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

function listFilesRecursive(directory: string): string[] {
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

function hasPlainDocumentExtension(filePath: string): boolean {
  return /\.(pdf|doc|docx|xls|xlsx|txt|csv|md|json|xml|rtf)$/i.test(filePath);
}

function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function metricCards(metrics: Record<string, number | string>): string {
  return `<section class="metric-grid">${Object.entries(metrics)
    .map(([label, value]) => `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join('')}</section>`;
}

function table(headers: string[], body: Array<Array<unknown>>, empty = 'Keine Daten vorhanden.'): string {
  if (!body.length) return `<div class="empty">${escapeHtml(empty)}</div>`;
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

function warningList(warnings: string[]): string {
  if (!warnings.length) return '<div class="ok">Keine Auffälligkeiten in dieser Prüfung.</div>';
  return `<section class="warnings"><h2>Prüfhinweise</h2>${warnings.map((warning) => `<p>⚠ ${escapeHtml(warning)}</p>`).join('')}</section>`;
}


function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function markdownToReportHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;
  let inTable = false;

  function closeList(): void {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  function closeTable(): void {
    if (inTable) {
      html.push('</tbody></table></section>');
      inTable = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^\|.+\|$/.test(line.trim())) {
      closeList();
      const cells = line.trim().slice(1, -1).split('|').map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      if (!inTable) {
        html.push('<section class="box"><table><tbody>');
        inTable = true;
      }
      html.push(`<tr>${cells.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`);
      continue;
    }

    closeTable();
    if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    if (line.startsWith('# ')) html.push(`<section class="box"><h2>${inlineMarkdown(line.slice(2))}</h2></section>`);
    else if (line.startsWith('## ')) html.push(`<section class="box"><h2>${inlineMarkdown(line.slice(3))}</h2>`);
    else if (line.startsWith('### ')) html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    else if (line.trim()) html.push(`<p>${inlineMarkdown(line)}</p>`);
    else html.push('');
  }
  closeList();
  closeTable();
  return html.join('\n');
}

function reportShell(title: string, subtitle: string, classification: string, content: string, warnings: string[]): string {
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
  .page { min-height: 100vh; padding: 26px; background: #ffffff; }
  .header { border: 1px solid #c6ccd3; border-left: 7px solid #b58500; padding: 18px 20px; background: linear-gradient(135deg, #f8fafc 0%, #eef1f4 100%); margin-bottom: 20px; }
  .kicker { color: #8a6400; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 900; }
  h1 { margin: 8px 0 4px; font-size: 28px; line-height: 1.15; color: #111827; text-transform: uppercase; }
  h2 { margin: 22px 0 10px; font-size: 16px; color: #7c5700; text-transform: uppercase; letter-spacing: 0.08em; }
  h3 { margin: 18px 0 8px; font-size: 13px; color: #1f2933; text-transform: uppercase; }
  p { color: #24313d; font-size: 11px; line-height: 1.55; }
  .subtitle { color: #394858; font-size: 12px; }
  .classification { display: inline-block; margin-top: 12px; padding: 6px 9px; border: 1px solid #b58500; color: #5f4500; background: #fff4c2; font-weight: 900; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
  .meta { margin-top: 8px; color: #566575; font-size: 10px; }
  .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0 18px; }
  .metric { border: 1px solid #cbd3dc; background: #f8fafc; padding: 10px; min-height: 64px; }
  .metric span { display: block; color: #4b5c6d; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; font-weight: 800; }
  .metric strong { display: block; color: #8a6400; font-size: 22px; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; background: #ffffff; }
  th { text-align: left; padding: 8px; border: 1px solid #c7ced6; background: #e9edf2; color: #5f4500; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; }
  td { padding: 8px; border: 1px solid #d4dae1; color: #1f2933; font-size: 11px; vertical-align: top; }
  .box { border: 1px solid #cbd3dc; background: #f8fafc; padding: 12px; margin: 10px 0; }
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

export class ReportService {
  constructor(private readonly dbProvider: () => DatabaseAdapter, private readonly dataDirProvider: () => string) {}

  descriptors(): ReportDescriptor[] {
    return REPORT_DESCRIPTORS;
  }

  ensureSchema(): void {
    const db = this.dbProvider();
    db.exec(`
      CREATE TABLE IF NOT EXISTS report_exports (
        id TEXT PRIMARY KEY,
        report_type TEXT NOT NULL,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        period_start TEXT,
        period_end TEXT,
        warning_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON report_exports(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_report_exports_type ON report_exports(report_type);
    `);
  }

  listHistory(limit = 25): ReportExportHistoryItem[] {
    this.ensureSchema();
    const db = this.dbProvider();
    return rows(db, `
      SELECT id, report_type, title, file_name, file_path, period_start, period_end, warning_count, created_at
      FROM report_exports
      ORDER BY created_at DESC
      LIMIT ?
    `, [Math.min(Math.max(limit, 1), 100)]).map((row) => ({
      id: row.id,
      reportType: row.report_type,
      title: row.title,
      fileName: row.file_name,
      filePath: row.file_path,
      generatedAt: row.created_at,
      periodStart: row.period_start ?? undefined,
      periodEnd: row.period_end ?? undefined,
      warningCount: Number(row.warning_count ?? 0)
    }));
  }

  build(input: GenerateReportInput): ReportBuildResult {
    this.ensureSchema();
    switch (input.type) {
      case 'activity': return this.buildActivityReport(input);
      case 'privacy_audit': return this.buildPrivacyAudit(input);
      case 'case_deadline_controlling': return this.buildControllingReport(input);
      case 'bem_prevention': return this.buildBemPreventionReport(input);
      case 'termination_hearings': return this.buildTerminationReport(input);
      case 'system_integrity': return this.buildSystemIntegrityReport(input);
      case 'compliance_document': return this.buildComplianceDocumentReport(input);
      default: throw new Error('Unbekannter Berichtstyp.');
    }
  }

  createExportTarget(title: string): { filePath: string; fileName: string } {
    const exportsDir = path.join(this.dataDirProvider(), 'exports');
    fs.mkdirSync(exportsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${slug(title)}-${stamp}.pdf`;
    const archiveName = `${fileName}.gsbvpdf`;
    return { fileName, filePath: path.join(exportsDir, archiveName) };
  }

  recordExport(input: GenerateReportInput, result: Omit<ReportGenerationResult, 'ok'>): void {
    this.ensureSchema();
    const db = this.dbProvider();
    db.prepare(`
      INSERT INTO report_exports (id, report_type, title, file_name, file_path, period_start, period_end, warning_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      input.type,
      result.title,
      result.fileName,
      result.filePath,
      input.periodStart ?? null,
      input.periodEnd ?? null,
      result.warnings.length,
      result.generatedAt
    );
    try {
      new PersonalDataAuditLogService(db).append({
        action: 'export',
        subjectType: 'report',
        subjectId: input.type,
        purpose: 'PDF-Report als verschlüsselter .gsbvpdf-Container erzeugt',
        metadata: {
          reportType: input.type,
          title: result.title,
          warningCount: result.warnings.length,
          fileName: result.fileName,
          complianceDocumentType: input.complianceDocumentType ?? null
        }
      });
    } catch (error) {
      console.warn('Gremia.SBV audit log write failed', error);
    }
  }

  private periodLabel(input: GenerateReportInput): string {
    if (!input.periodStart && !input.periodEnd) return 'Gesamter Datenbestand';
    return `Zeitraum: ${formatDate(input.periodStart)} bis ${formatDate(input.periodEnd)}`;
  }

  private buildActivityReport(input: GenerateReportInput): ReportBuildResult {
    const db = this.dbProvider();
    const opened = periodWhere('opened_at', input);
    const closed = periodWhere('closed_at', input);
    const notes = periodWhere('note_date', input);
    const metrics = {
      'Neue Fälle': count(db, `SELECT COUNT(*) AS value FROM cases ${opened.sql}`, opened.params),
      'Abgeschlossene Fälle': count(db, `SELECT COUNT(*) AS value FROM cases ${closed.sql}`, closed.params),
      'Offen gesamt': count(db, `SELECT COUNT(*) AS value FROM cases WHERE status <> 'abgeschlossen'`),
      'Notizen/Protokolle': count(db, `SELECT COUNT(*) AS value FROM case_notes ${notes.sql}`, notes.params)
    };
    const categories = rows(db, `SELECT category, COUNT(*) AS value FROM cases ${opened.sql} GROUP BY category ORDER BY value DESC`, opened.params);
    const statuses = rows(db, `SELECT status, COUNT(*) AS value FROM cases GROUP BY status ORDER BY value DESC`);
    const warnings: string[] = [];
    const rareCategories = categories.filter((row) => Number(row.value) > 0 && Number(row.value) < 3);
    if (rareCategories.length) warnings.push('Einzelne Fallkategorien enthalten weniger als 3 Fälle. Für externe Tätigkeitsberichte sollten diese zusammengefasst werden.');

    const content = `
      ${metricCards(metrics)}
      <section class="box"><h2>Fallkategorien im Berichtszeitraum</h2>${table(['Kategorie', 'Anzahl'], categories.map((row) => [row.category, row.value]))}</section>
      <section class="box"><h2>Fallstatus zum Stichtag</h2>${table(['Status', 'Anzahl'], statuses.map((row) => [normalizeStatus(row.status), row.value]))}</section>
      <section class="box"><h2>Arbeitsfelder</h2><p>Dieser Bericht ist als anonymisierte Grundlage für die SBV-Berichterstattung gedacht. Aktenzeichen, Namen und Gesundheitsdetails werden nicht ausgegeben.</p></section>`;
    return {
      title: 'Tätigkeitsbericht der SBV',
      warnings,
      metrics,
      html: reportShell('Tätigkeitsbericht der SBV', this.periodLabel(input), 'Anonymisiert', content, warnings)
    };
  }

  private buildPrivacyAudit(input: GenerateReportInput): ReportBuildResult {
    const db = this.dbProvider();
    const warnings: string[] = [];
    const closedWithOpenDeadlines = count(db, `
      SELECT COUNT(*) AS value FROM deadlines d
      JOIN cases c ON c.id = d.case_id
      WHERE c.status = 'abgeschlossen' AND d.status IN ('open', 'overdue')
    `);
    const notesWithHealth = count(db, `SELECT COUNT(*) AS value FROM case_notes WHERE contains_health_data = 1`);
    const docsWithHealth = count(db, `SELECT COUNT(*) AS value FROM case_documents WHERE contains_health_data = 1`);
    const freeSensitiveDeadlines = count(db, `
      SELECT COUNT(*) AS value FROM deadlines
      WHERE case_id IS NULL AND (is_legal_deadline = 1 OR process_type <> 'custom' OR severity IN ('critical', 'fatal'))
    `);
    const unanonymizedRefs = count(db, `SELECT COUNT(*) AS value FROM contact_text_references WHERE anonymized_at IS NULL`);
    const orphanDocs = count(db, `SELECT COUNT(*) AS value FROM case_documents WHERE case_id IS NULL`);
    if (closedWithOpenDeadlines) warnings.push(`${closedWithOpenDeadlines} abgeschlossene Fälle enthalten noch offene Fristen.`);
    if (freeSensitiveDeadlines) warnings.push(`${freeSensitiveDeadlines} freie Fristen wirken sensibel oder rechtlich relevant. Diese sollten einem Fall zugeordnet werden.`);
    if (orphanDocs) warnings.push(`${orphanDocs} Dokumente ohne Fallbezug gefunden.`);
    if (unanonymizedRefs) warnings.push(`${unanonymizedRefs} erkannte Kontaktbezüge sind noch nicht anonymisiert.`);

    const metrics = {
      'Gesundheitsnotizen': notesWithHealth,
      'Gesundheitsdokumente': docsWithHealth,
      'Offene Fristen in abgeschl. Fällen': closedWithOpenDeadlines,
      'Freie sensible Fristen': freeSensitiveDeadlines
    };
    const checks = [
      ['SQLCipher-Tresor', 'aktiv, da Bericht nur nach Entsperrung erzeugt wird', 'GRÜN'],
      ['Kontakt-Anonymisierung', unanonymizedRefs ? `${unanonymizedRefs} aktive Kontaktbezüge` : 'keine offenen Kontaktbezüge', unanonymizedRefs ? 'GELB' : 'GRÜN'],
      ['Fallbindung Dokumente', orphanDocs ? `${orphanDocs} Dokumente ohne Fall` : 'alle Dokumente fallgebunden', orphanDocs ? 'ROT' : 'GRÜN'],
      ['Fristenkonsistenz', closedWithOpenDeadlines ? `${closedWithOpenDeadlines} offene Fristen in abgeschlossenen Fällen` : 'keine Auffälligkeit', closedWithOpenDeadlines ? 'GELB' : 'GRÜN']
    ];
    const content = `${metricCards(metrics)}<section class="box"><h2>Prüfpunkte</h2>${table(['Prüfpunkt', 'Befund', 'Ampel'], checks)}</section>`;
    return {
      title: 'Datenschutz-Audit',
      warnings,
      metrics,
      html: reportShell('Datenschutz-Audit', this.periodLabel(input), 'Intern vertraulich', content, warnings)
    };
  }

  private buildControllingReport(input: GenerateReportInput): ReportBuildResult {
    const db = this.dbProvider();
    const dueSoon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const openByStatus = rows(db, `SELECT status, COUNT(*) AS value FROM cases GROUP BY status ORDER BY value DESC`);
    const overdue = count(db, `SELECT COUNT(*) AS value FROM deadlines WHERE status IN ('open', 'overdue') AND due_at < ?`, [nowIso()]);
    const next48 = count(db, `SELECT COUNT(*) AS value FROM deadlines WHERE status IN ('open', 'overdue') AND due_at BETWEEN ? AND ?`, [nowIso(), dueSoon]);
    const casesWithoutFollowup = rows(db, `
      SELECT c.case_number, c.display_name, c.status
      FROM cases c
      WHERE c.status <> 'abgeschlossen'
        AND NOT EXISTS (SELECT 1 FROM deadlines d WHERE d.case_id = c.id AND d.status IN ('open', 'overdue'))
      ORDER BY c.opened_at DESC
      LIMIT 50
    `);
    const criticalDeadlines = rows(db, `
      SELECT d.title, c.case_number, d.due_at, d.severity, d.status
      FROM deadlines d
      LEFT JOIN cases c ON c.id = d.case_id
      WHERE d.status IN ('open', 'overdue') AND (d.due_at <= ? OR d.severity IN ('critical', 'fatal'))
      ORDER BY d.due_at ASC
      LIMIT 50
    `, [dueSoon]);
    const warnings: string[] = [];
    if (overdue) warnings.push(`${overdue} Fristen sind überfällig.`);
    if (next48) warnings.push(`${next48} Fristen laufen innerhalb von 48 Stunden ab.`);
    if (casesWithoutFollowup.length) warnings.push(`${casesWithoutFollowup.length} offene Fälle haben keine offene Frist/Wiedervorlage.`);
    const metrics = {
      'Überfällige Fristen': overdue,
      'Nächste 48h': next48,
      'Offene Fälle ohne WV': casesWithoutFollowup.length,
      'Offene Fälle': count(db, `SELECT COUNT(*) AS value FROM cases WHERE status <> 'abgeschlossen'`)
    };
    const content = `
      ${metricCards(metrics)}
      <section class="box"><h2>Fallstatus</h2>${table(['Status', 'Anzahl'], openByStatus.map((row) => [normalizeStatus(row.status), row.value]))}</section>
      <section class="box"><h2>Kritische Fristen</h2>${table(['Titel', 'Fall', 'Fällig', 'Stufe', 'Status'], criticalDeadlines.map((row) => [row.title, row.case_number ?? 'Freie Wiedervorlage', formatDateTime(row.due_at), normalizeStatus(row.severity), normalizeStatus(row.status)]))}</section>
      <section class="box"><h2>Offene Fälle ohne Wiedervorlage</h2>${table(['Aktenzeichen', 'Person/Pseudonym', 'Status'], casesWithoutFollowup.map((row) => [row.case_number, row.display_name, row.status]))}</section>`;
    return {
      title: 'Fall- und Fristen-Controlling',
      warnings,
      metrics,
      html: reportShell('Fall- und Fristen-Controlling', this.periodLabel(input), 'Intern vertraulich', content, warnings)
    };
  }

  private buildBemPreventionReport(input: GenerateReportInput): ReportBuildResult {
    const db = this.dbProvider();
    const opened = periodWhere('created_at', input);
    const bemStatuses = rows(db, `SELECT status, COUNT(*) AS value FROM bem_processes ${opened.sql} GROUP BY status ORDER BY value DESC`, opened.params);
    const preventionStatuses = rows(db, `SELECT status, COUNT(*) AS value FROM prevention_processes GROUP BY status ORDER BY value DESC`);
    const openBem = count(db, `SELECT COUNT(*) AS value FROM bem_processes WHERE status NOT IN ('abgeschlossen', 'abgelehnt', 'abgebrochen')`);
    const missingPrivacyNotice = count(db, `SELECT COUNT(*) AS value FROM bem_processes WHERE employee_response = 'angenommen' AND (privacy_notice_at IS NULL OR privacy_notice_at = '')`);
    const missingConsentScope = count(db, `SELECT COUNT(*) AS value FROM bem_processes WHERE employee_response = 'angenommen' AND (consent_scope IS NULL OR consent_scope = '')`);
    const confidentialBemNotes = count(db, `SELECT COUNT(*) AS value FROM bem_processes WHERE confidential_notes IS NOT NULL AND TRIM(confidential_notes) <> ''`);
    const warnings: string[] = [];
    if (openBem) warnings.push(`${openBem} BEM-Verfahren sind noch nicht abgeschlossen.`);
    if (missingPrivacyNotice) warnings.push(`${missingPrivacyNotice} angenommene BEM-Verfahren haben keinen dokumentierten Datenschutzhinweis.`);
    if (missingConsentScope) warnings.push(`${missingConsentScope} angenommene BEM-Verfahren haben keinen dokumentierten Einwilligungsumfang.`);
    if (confidentialBemNotes) warnings.push(`${confidentialBemNotes} BEM-Verfahren enthalten vertrauliche SBV-Notizen. Export und Weitergabe besonders prüfen.`);
    const metrics = {
      'BEM-Verfahren': count(db, `SELECT COUNT(*) AS value FROM bem_processes`),
      'Präventionsverfahren': count(db, `SELECT COUNT(*) AS value FROM prevention_processes`),
      'Offene BEM-Verfahren': openBem,
      'BEM ohne Datenschutzhinweis': missingPrivacyNotice,
      'BEM mit vertraulichen Notizen': confidentialBemNotes
    };
    const content = `${metricCards(metrics)}<section class="box"><h2>BEM-Status</h2>${table(['Status', 'Anzahl'], bemStatuses.map((row) => [normalizeStatus(row.status), row.value]))}</section><section class="box"><h2>Präventionsstatus</h2>${table(['Status', 'Anzahl'], preventionStatuses.map((row) => [normalizeStatus(row.status), row.value]))}</section><section class="box"><h2>Datenschutz-Hinweis</h2><p>Dieser Bericht ist aggregiert. Vertrauliche BEM-Notizen, Diagnosen und Freitextinhalte werden nicht ausgegeben.</p></section>`;
    return {
      title: 'BEM- und Präventionsbericht',
      warnings,
      metrics,
      html: reportShell('BEM- und Präventionsbericht', this.periodLabel(input), 'Anonymisiert', content, warnings)
    };
  }

  private buildTerminationReport(input: GenerateReportInput): ReportBuildResult {
    const db = this.dbProvider();
    const received = periodWhere('hearing_received_at', input);
    const typeRows = rows(db, `SELECT termination_type, COUNT(*) AS value FROM termination_hearings ${received.sql} GROUP BY termination_type ORDER BY value DESC`, received.params);
    const statementRows = rows(db, `SELECT statement_status, COUNT(*) AS value FROM termination_hearings GROUP BY statement_status ORDER BY value DESC`);
    const openStatements = count(db, `SELECT COUNT(*) AS value FROM termination_hearings WHERE statement_status IN ('offen', 'in_bearbeitung')`);
    const unknownApproval = count(db, `SELECT COUNT(*) AS value FROM termination_hearings WHERE integration_office_approval_required = 1 AND integration_office_approval_status = 'unbekannt'`);
    const warnings: string[] = [];
    if (openStatements) warnings.push(`${openStatements} Kündigungsanhörungen haben noch keine abgeschlossene Stellungnahme.`);
    if (unknownApproval) warnings.push(`${unknownApproval} Kündigungsanhörungen haben ungeklärten Integrationsamt-Status.`);
    const metrics = {
      'Anhörungen gesamt': count(db, `SELECT COUNT(*) AS value FROM termination_hearings`),
      'Offene Stellungnahmen': openStatements,
      'Integrationsamt ungeklärt': unknownApproval,
      'SBV-Anhörung vollständig': count(db, `SELECT COUNT(*) AS value FROM termination_hearings WHERE sbv_hearing_complete = 1`)
    };
    const content = `${metricCards(metrics)}<section class="box"><h2>Kündigungsarten</h2>${table(['Art', 'Anzahl'], typeRows.map((row) => [normalizeStatus(row.termination_type), row.value]))}</section><section class="box"><h2>Stellungnahmestatus</h2>${table(['Status', 'Anzahl'], statementRows.map((row) => [normalizeStatus(row.statement_status), row.value]))}</section>`;
    return {
      title: 'Kündigungsanhörungsbericht',
      warnings,
      metrics,
      html: reportShell('Kündigungsanhörungsbericht', this.periodLabel(input), 'Intern vertraulich', content, warnings)
    };
  }

  private buildComplianceDocumentReport(input: GenerateReportInput): ReportBuildResult {
    const title = input.complianceTitle?.trim() || 'Compliance-Dokument';
    const subtitle = input.complianceSubtitle?.trim() || 'Aus Gremia.SBV Compliance Center erzeugt';
    const classification = input.complianceClassification?.trim() || 'Intern vertraulich';
    const body = input.complianceBody?.trim() || 'Keine Inhalte übergeben.';
    const documentType = input.complianceDocumentType?.trim() || 'compliance_document';
    const warnings = [
      'Compliance-Dokumente vor Weitergabe fachlich prüfen. Sie ersetzen keine abschließende Bewertung durch DSB, IT-Security oder Rechtsberatung.',
      'Beim Abruf als PDF wird temporär eine Klartextkopie für den externen PDF-Viewer erzeugt.'
    ];
    return {
      title,
      warnings,
      metrics: {
        'Dokumenttyp': documentType,
        'Quelle': 'Compliance Center',
        'Exportformat': 'verschlüsselter PDF-Report'
      },
      html: reportShell(title, subtitle, classification, markdownToReportHtml(body), warnings)
    };
  }

  private buildSystemIntegrityReport(input: GenerateReportInput): ReportBuildResult {
    const db = this.dbProvider();
    const migrationRows = rows(db, `SELECT version, filename, applied_at, mode FROM schema_migrations ORDER BY version DESC LIMIT 20`);
    const dataDir = this.dataDirProvider();
    const vaultPath = path.join(dataDir, 'gremia-sbv.vault.sqlite');
    const documentDir = path.join(dataDir, 'documents');
    const backupDir = path.join(dataDir, 'backups');
    const exportDir = path.join(dataDir, 'exports');
    const documentFilePaths = listFilesRecursive(documentDir);
    const documentFiles = documentFilePaths.length;
    const backupFiles = fs.existsSync(backupDir) ? fs.readdirSync(backupDir).length : 0;
    const exportFiles = fs.existsSync(exportDir) ? fs.readdirSync(exportDir).filter((name) => name.endsWith('.gsbvpdf') || name.endsWith('.pdf')).length : 0;
    const vaultSize = fs.existsSync(vaultPath) ? fs.statSync(vaultPath).size : 0;

    const integrityRows = pragmaRows(db, 'integrity_check');
    const quickRows = pragmaRows(db, 'quick_check');
    const foreignKeyRows = pragmaRows(db, 'foreign_key_check');
    const userVersionRows = pragmaRows(db, 'user_version');
    const pageCountRows = pragmaRows(db, 'page_count');
    const pageSizeRows = pragmaRows(db, 'page_size');

    const integrityResult = integrityRows.map((row) => String(row.integrity_check ?? Object.values(row)[0] ?? '')).filter(Boolean);
    const quickResult = quickRows.map((row) => String(row.quick_check ?? Object.values(row)[0] ?? '')).filter(Boolean);
    const integrityOk = integrityResult.length === 1 && integrityResult[0].toLowerCase() === 'ok';
    const quickOk = quickResult.length === 1 && quickResult[0].toLowerCase() === 'ok';
    const foreignKeyIssues = foreignKeyRows.length;

    const requiredTables = [
      'cases', 'persons', 'case_notes', 'case_note_cases', 'case_documents',
      'deadlines', 'deadline_templates', 'contacts', 'contact_text_references',
      'report_exports', 'schema_migrations', 'schema_migration_log', 'settings',
      'personal_data_audit_log'
    ];
    const missingTables = requiredTables.filter((tableName) => !rows(db, `SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?`, [tableName]).length);
    const migrationLogErrors = count(db, `SELECT COUNT(*) AS value FROM schema_migration_log WHERE action LIKE '%error%' OR action = 'failed'`);
    const orphanDeadlines = count(db, `SELECT COUNT(*) AS value FROM deadlines d LEFT JOIN cases c ON c.id = d.case_id WHERE d.case_id IS NOT NULL AND c.id IS NULL`);
    const orphanNotes = count(db, `SELECT COUNT(*) AS value FROM case_note_cases cnc LEFT JOIN cases c ON c.id = cnc.case_id LEFT JOIN case_notes n ON n.id = cnc.note_id WHERE c.id IS NULL OR n.id IS NULL`);
    const orphanDocs = count(db, `SELECT COUNT(*) AS value FROM case_documents d LEFT JOIN cases c ON c.id = d.case_id WHERE d.case_id IS NOT NULL AND c.id IS NULL`);
    const documentRows = rows(db, `SELECT id, filename, storage_path, document_key, iv, auth_tag FROM case_documents`);
    const normalizedDocumentPaths = new Set(documentRows
      .map((row) => String(row.storage_path ?? '').trim())
      .filter(Boolean)
      .map((filePath) => path.resolve(filePath)));
    const encryptedDocumentFiles = documentFilePaths.filter((filePath) => filePath.endsWith('.gsbvdoc'));
    const plainDocumentFiles = documentFilePaths.filter((filePath) => !filePath.endsWith('.gsbvdoc') && hasPlainDocumentExtension(filePath));
    const missingDocumentFiles = documentRows.filter((row) => !row.storage_path || !fs.existsSync(String(row.storage_path))).length;
    const orphanEncryptedDocumentFiles = encryptedDocumentFiles.filter((filePath) => !normalizedDocumentPaths.has(path.resolve(filePath))).length;
    const invalidDocumentContainers = documentRows.filter((row) => String(row.storage_path ?? '').trim() && !String(row.storage_path).endsWith('.gsbvdoc')).length;
    const incompleteDocumentCrypto = documentRows.filter((row) => !row.document_key || !row.iv || !row.auth_tag).length;
    const documentsOutsideDataDir = documentRows.filter((row) => row.storage_path && !isPathInside(String(row.storage_path), dataDir)).length;
    const schemaVersion = scalarText(db, `SELECT value FROM settings WHERE key = 'database.schema.version'`, [], 'unbekannt');
    const schemaAppVersion = scalarText(db, `SELECT value FROM settings WHERE key = 'database.schema.appVersion'`, [], 'unbekannt');
    let auditChain = new PersonalDataAuditLogService(db).integritySummary();

    const warnings: string[] = [];
    if (!integrityOk) warnings.push(`SQLite-Integritätsprüfung meldet: ${integrityResult.join('; ') || 'kein Ergebnis'}.`);
    if (!quickOk) warnings.push(`SQLite-Schnellprüfung meldet: ${quickResult.join('; ') || 'kein Ergebnis'}.`);
    if (foreignKeyIssues) warnings.push(`${foreignKeyIssues} Fremdschlüssel-/Referenzprobleme gefunden.`);
    if (missingTables.length) warnings.push(`Erforderliche Tabellen fehlen: ${missingTables.join(', ')}.`);
    if (migrationLogErrors) warnings.push(`${migrationLogErrors} Migrationslog-Einträge deuten auf Fehler hin.`);
    if (orphanDeadlines) warnings.push(`${orphanDeadlines} Fristen verweisen auf nicht vorhandene Fälle.`);
    if (orphanNotes) warnings.push(`${orphanNotes} Notiz-Fall-Verknüpfungen sind verwaist.`);
    if (orphanDocs) warnings.push(`${orphanDocs} Dokumente verweisen auf nicht vorhandene Fälle.`);
    if (missingDocumentFiles > 0) warnings.push(`${missingDocumentFiles} Dokumentdatensätze haben keine auffindbare verschlüsselte Datei.`);
    if (orphanEncryptedDocumentFiles > 0) warnings.push(`${orphanEncryptedDocumentFiles} verschlüsselte Dokumentdateien haben keinen Datenbankeintrag.`);
    if (plainDocumentFiles.length > 0) warnings.push(`${plainDocumentFiles.length} mögliche Klartextdateien liegen im Dokumentenspeicher. Diese sollten dort nicht liegen.`);
    if (invalidDocumentContainers > 0) warnings.push(`${invalidDocumentContainers} Dokumentdatensätze verweisen nicht auf .gsbvdoc-Container.`);
    if (incompleteDocumentCrypto > 0) warnings.push(`${incompleteDocumentCrypto} Dokumentdatensätze haben unvollständige Verschlüsselungsmetadaten.`);
    if (documentsOutsideDataDir > 0) warnings.push(`${documentsOutsideDataDir} Dokumente liegen außerhalb des aktuellen Gremia.SBV-Datenverzeichnisses.`);
    if (!auditChain.ok) warnings.push(`Audit-Hash-Chain ist beschädigt oder lückenhaft. Erste auffällige Sequenz: ${auditChain.firstBrokenSequence ?? 'unbekannt'}.`);
    if (!backupFiles) warnings.push('Es wurden keine Backup-Dateien im lokalen Backup-Ordner gefunden.');

    const metrics = {
      'Integritätsprüfung': integrityOk && quickOk && auditChain.ok ? 'OK' : 'Auffällig',
      'Audit-Hash-Chain': auditChain.ok ? 'OK' : 'Manipulationsverdacht',
      'Audit-Einträge': auditChain.checked,
      'FK-Probleme': foreignKeyIssues,
      'Schema-Version': schemaVersion,
      'DB-Größe': formatBytes(vaultSize)
    };
    const validationRows = [
      ['PRAGMA integrity_check', integrityOk ? 'OK' : integrityResult.join('; ') || 'kein Ergebnis', integrityOk ? 'GRÜN' : 'ROT'],
      ['PRAGMA quick_check', quickOk ? 'OK' : quickResult.join('; ') || 'kein Ergebnis', quickOk ? 'GRÜN' : 'ROT'],
      ['PRAGMA foreign_key_check', foreignKeyIssues ? `${foreignKeyIssues} Befund(e)` : 'OK', foreignKeyIssues ? 'ROT' : 'GRÜN'],
      ['Erforderliche Tabellen', missingTables.length ? missingTables.join(', ') : 'vollständig', missingTables.length ? 'ROT' : 'GRÜN'],
      ['Verwaiste Fristen', orphanDeadlines ? `${orphanDeadlines} Befund(e)` : 'OK', orphanDeadlines ? 'ROT' : 'GRÜN'],
      ['Verwaiste Notizverknüpfungen', orphanNotes ? `${orphanNotes} Befund(e)` : 'OK', orphanNotes ? 'ROT' : 'GRÜN'],
      ['Verwaiste Dokumente', orphanDocs ? `${orphanDocs} Befund(e)` : 'OK', orphanDocs ? 'ROT' : 'GRÜN'],
      ['Fehlende Dokumentcontainer', missingDocumentFiles ? `${missingDocumentFiles} Befund(e)` : 'OK', missingDocumentFiles ? 'ROT' : 'GRÜN'],
      ['Verwaiste Dokumentcontainer', orphanEncryptedDocumentFiles ? `${orphanEncryptedDocumentFiles} Befund(e)` : 'OK', orphanEncryptedDocumentFiles ? 'GELB' : 'GRÜN'],
      ['Klartext im Dokumentenspeicher', plainDocumentFiles.length ? `${plainDocumentFiles.length} Datei(en)` : 'OK', plainDocumentFiles.length ? 'ROT' : 'GRÜN'],
      ['Dokument-Verschlüsselungsmetadaten', incompleteDocumentCrypto ? `${incompleteDocumentCrypto} unvollständig` : 'OK', incompleteDocumentCrypto ? 'ROT' : 'GRÜN'],
      ['Dokument-Speicherort', documentsOutsideDataDir ? `${documentsOutsideDataDir} außerhalb Datenverzeichnis` : 'OK', documentsOutsideDataDir ? 'GELB' : 'GRÜN'],
      ['Audit-Hash-Chain', auditChain.ok ? `OK (${auditChain.checked} Einträge)` : `${auditChain.issues.length} Befund(e), erste Sequenz ${auditChain.firstBrokenSequence ?? '—'}`, auditChain.ok ? 'GRÜN' : 'ROT']
    ];
    const statusCellRows = validationRows.map((row) => [row[0], row[1], row[2] === 'GRÜN' ? 'GRÜN' : row[2] === 'GELB' ? 'GELB' : 'ROT']);
    const pragmaRowsForReport = [
      ['Schema-Version', schemaVersion],
      ['App-Version bei letzter Migration', schemaAppVersion],
      ['SQLite user_version', String(userVersionRows[0]?.user_version ?? Object.values(userVersionRows[0] ?? {})[0] ?? '—')],
      ['Page Count', String(pageCountRows[0]?.page_count ?? Object.values(pageCountRows[0] ?? {})[0] ?? '—')],
      ['Page Size', String(pageSizeRows[0]?.page_size ?? Object.values(pageSizeRows[0] ?? {})[0] ?? '—')],
      ['Datenbankdatei', vaultPath],
      ['Datenbankgröße', formatBytes(vaultSize)],
      ['Audit-Hash-Algorithmus', auditChain.algorithm],
      ['Audit-Chain-Version', String(auditChain.chainVersion)],
      ['Letzter Audit-Hash', auditChain.latestHash],
      ['Audit-Sequenzbereich', auditChain.checked ? `${auditChain.firstSequence ?? '—'} bis ${auditChain.lastSequence ?? '—'}` : 'keine Einträge']
    ];
    const content = `${metricCards(metrics)}
      <section class="box"><h2>Datenbankvalidierung</h2>${table(['Prüfung', 'Befund', 'Ampel'], statusCellRows)}</section>
      <section class="box"><h2>Datenbankdetails</h2>${table(['Eigenschaft', 'Wert'], pragmaRowsForReport)}</section>
      <section class="box"><h2>Speicherorte</h2>${table(['Bereich', 'Pfad/Anzahl'], [['Datenordner', dataDir], ['Dokumente', `${documentDir} (${documentFiles}; davon ${encryptedDocumentFiles.length} verschlüsselte Container)`], ['Backups', `${backupDir} (${backupFiles})`], ['Exporte', `${exportDir} (${exportFiles})`]])}</section>
      <section class="box"><h2>Dokumentenspeicher</h2>${table(['Prüfung', 'Anzahl'], [['Dokumentdatensätze', documentRows.length], ['Verschlüsselte .gsbvdoc-Dateien', encryptedDocumentFiles.length], ['Mögliche Klartextdateien', plainDocumentFiles.length], ['Fehlende Container', missingDocumentFiles], ['Container ohne Datenbankeintrag', orphanEncryptedDocumentFiles], ['Unvollständige Kryptometadaten', incompleteDocumentCrypto]])}</section>
      <section class="box"><h2>Audit-Log und Hash-Chain</h2>${table(['Kennzahl', 'Wert'], [['Status', auditChain.ok ? 'Hash-Chain intakt' : 'Auffällig / Manipulationsverdacht'], ['Geprüfte Einträge', auditChain.checked], ['Lese-/Such-/Öffnungsereignisse', auditChain.readEvents], ['Änderungsereignisse', auditChain.changeEvents], ['Export-/Backupereignisse', auditChain.exportEvents], ['Letzter Hash', auditChain.latestHash]])}</section>
      ${auditChain.issues.length ? `<section class="box"><h2>Audit-Chain-Befunde</h2>${table(['Sequenz', 'Art', 'Befund'], auditChain.issues.slice(0, 25).map((issue) => [issue.sequence, issue.kind, issue.message]))}</section>` : ''}
      <section class="box"><h2>Letzte Migrationen</h2>${table(['Version', 'Datei', 'Ausgeführt', 'Modus'], migrationRows.map((row) => [row.version, row.filename, formatDateTime(row.applied_at), normalizeStatus(row.mode)]))}</section>`;
    return {
      title: 'System- und Integritätsbericht',
      warnings,
      metrics,
      html: reportShell('System- und Integritätsbericht', this.periodLabel(input), 'Technisch vertraulich', content, warnings)
    };
  }
}
