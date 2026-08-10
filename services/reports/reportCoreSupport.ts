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

export const REPORT_DESCRIPTORS: ReportDescriptor[] = [
  {
    type: "activity",
    title: "Tätigkeitsbericht der SBV",
    shortTitle: "Tätigkeitsbericht",
    description:
      "Anonymisierte Jahres- oder Zeitraumsauswertung der SBV-Arbeit mit aktuellen Prozesskennzahlen.",
    confidentiality: "anonymized",
    group: "sbv",
  },
  {
    type: "case_deadline_controlling",
    title: "Fall- und Fristen-Controlling",
    shortTitle: "Controlling",
    description:
      "Interne Übersicht über offene Fälle, überfällige Fristen, ruhende Vorgänge und fehlende Wiedervorlagen.",
    confidentiality: "internal",
    group: "sbv",
  },
  {
    type: "bem_prevention",
    title: "BEM- und Präventionsbericht",
    shortTitle: "BEM/Prävention",
    description:
      "Auswertung von BEM-, Präventions- und Arbeitsplatzsicherungsprozessen ohne Diagnosen/Freitexte.",
    confidentiality: "anonymized",
    group: "sbv",
  },
  {
    type: "sbv_participation",
    title: "SBV-Beteiligungsbericht",
    shortTitle: "SBV-Beteiligung",
    description:
      "Interne Auswertung zu Unterrichtung, Anhörung, Arbeitgeberentscheidung und Aussetzungsverlangen nach § 178 Abs. 2 SGB IX.",
    confidentiality: "internal",
    group: "sbv",
  },
  {
    type: "termination_hearings",
    title: "Kündigungsanhörungsbericht",
    shortTitle: "Kündigungen",
    description:
      "Auswertung kritischer Kündigungsanhörungen, Fristen und Schutzstatus nach aktuellem Kündigungsmodul.",
    confidentiality: "internal",
    group: "sbv",
  },
  {
    type: "equalization_gdb",
    title: "Gleichstellungs- und GdB-Bericht",
    shortTitle: "Gleichstellung/GdB",
    description:
      "Auswertung von Gleichstellungs-, Widerspruchs- und Feststellungsverfahren.",
    confidentiality: "internal",
    group: "sbv",
  },
  {
    type: "privacy_audit",
    title: "Datenschutz-Audit",
    shortTitle: "Datenschutz-Audit",
    description: "Technische und fachliche Prüfung des lokalen Datenbestands auf Datenschutzrisiken.",
    confidentiality: "internal",
    group: "datenschutz",
  },
  {
    type: "retention_cleanup",
    title: "Lösch- und Aufbewahrungsbericht",
    shortTitle: "Löschung/Aufbewahrung",
    description:
      "Systembericht zu Löschprüfungen, Retention-Aktionen und offenen Aufbewahrungsrisiken.",
    confidentiality: "technical",
    group: "datenschutz",
  },
  {
    type: "audit_log",
    title: "Audit-Log- und Zugriffsbericht",
    shortTitle: "Audit-Log",
    description:
      "Systembericht zu Zugriffen, Änderungen, Exporten und Hash-Chain-Integrität.",
    confidentiality: "technical",
    group: "system",
  },
  {
    type: "system_integrity",
    title: "System- und Integritätsbericht",
    shortTitle: "Systemstatus",
    description:
      "Technischer Bericht zu Schema, Migrationen, Speicherorten, Dokumentcontainern und Hash-Chain.",
    confidentiality: "technical",
    group: "system",
  },
];

export type DynamicReportRow = Record<string, unknown>;

export interface ReportExportHistoryRow extends DynamicReportRow {
  id: string;
  report_type: string;
  title: string;
  file_name: string;
  file_path: string;
  period_start: string | null;
  period_end: string | null;
  warning_count: number | string | null;
  created_at: string;
}

export interface ReportBuildResult {
  html: string;
  title: string;
  warnings: string[];
  metrics: Record<string, number | string>;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function reportText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(date);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function periodWhere(
  column: string,
  input: GenerateReportInput,
): { sql: string; params: unknown[] } {
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
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

export function isMissingTableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /no such table|no such column/i.test(error.message)
  );
}

export function count(
  db: DatabaseAdapter,
  sql: string,
  params: unknown[] = [],
): number {
  try {
    const row = db.prepare<{ value: number }>(sql).get(...params);
    return Number(row?.value ?? 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

export function rows<T extends DynamicReportRow = DynamicReportRow>(db: DatabaseAdapter, sql: string, params: unknown[] = []): T[] {
  try {
    return db.prepare<T>(sql).all(...params);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export function scalarText(
  db: DatabaseAdapter,
  sql: string,
  params: unknown[] = [],
  fallback = "—",
): string {
  try {
    const row = db.prepare<{ value: string }>(sql).get(...params);
    return String(row?.value ?? fallback);
  } catch (error) {
    if (isMissingTableError(error)) return fallback;
    throw error;
  }
}

export function pragmaRows(db: DatabaseAdapter, sql: string): DynamicReportRow[] {
  try {
    const result = db.pragma(sql);
    return Array.isArray(result) ? (result as DynamicReportRow[]) : [];
  } catch {
    return [];
  }
}

export function normalizeStatus(value: unknown): string {
  const raw = String(value ?? "").trim();
  const map: Record<string, string> = {
    open: "Offen",
    offen: "Offen",
    in_progress: "In Bearbeitung",
    in_bearbeitung: "In Bearbeitung",
    abgeschlossen: "Abgeschlossen",
    closed: "Abgeschlossen",
    ruhend: "Ruhend",
    done: "Erledigt",
    erledigt: "Erledigt",
    overdue: "Überfällig",
    ueberfaellig: "Überfällig",
    suspended: "Ausgesetzt",
    cancelled: "Abgebrochen",
    critical: "Kritisch",
    fatal: "Kritisch",
    important: "Wichtig",
    normal: "Normal",
    custom: "Freie Wiedervorlage",
    bem: "BEM",
    prevention: "Prävention",
    praevention: "Prävention",
    termination_hearing: "Kündigungsanhörung",
    equalization: "Gleichstellung",
    gdb: "GdB/Feststellung",
    request: "Freundliche Nachforderung",
    formal_objection: "Förmliche Rüge",
    abmahnung: "Abmahnung",
    suspension_request: "Aussetzungsverlangen",
    owi_preparation: "OWi-Vorbereitung",
    draft: "Entwurf",
    sent: "Versandt/dokumentiert",
    remedied: "Geheilt",
    escalated: "Eskaliert",
    withdrawn: "Zurückgezogen",
  };
  return map[raw] ?? map[raw.toLowerCase()] ?? (raw || "—");
}
