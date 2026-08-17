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
import { count, formatDateTime, normalizeStatus, pragmaRows, reportText, rows, scalarText } from './reportCoreSupport.js';
import { formatBytes, hasPlainDocumentExtension, isPathInside, listFilesRecursive, metricCards, section, table, type PdfBlock } from './reportRenderingSupport.js';

export function collectIntegrityStorage(dataDir: string) {
  const vaultPath = path.join(dataDir, "gremia-sbv.vault.sqlite");
  const documentDir = path.join(dataDir, "documents");
  const backupDir = path.join(dataDir, "backups");
  const exportDir = path.join(dataDir, "exports");
  const tempStatus = new TempFileService(dataDir).status();
  const documentFilePaths = listFilesRecursive(documentDir);
  const encryptedDocumentFiles = documentFilePaths.filter((filePath) => filePath.endsWith(".gsbvdoc"));
  const plainDocumentFiles = documentFilePaths.filter((filePath) => !filePath.endsWith(".gsbvdoc") && hasPlainDocumentExtension(filePath));
  return {
    dataDir,
    vaultPath,
    documentDir,
    backupDir,
    exportDir,
    tempStatus,
    documentFilePaths,
    documentFiles: documentFilePaths.length,
    encryptedDocumentFiles,
    plainDocumentFiles,
    backupFiles: fs.existsSync(backupDir) ? fs.readdirSync(backupDir).length : 0,
    exportFiles: fs.existsSync(exportDir)
      ? fs.readdirSync(exportDir).filter((name) => name.endsWith(".gsbvpdf") || name.endsWith(".pdf")).length
      : 0,
    vaultSize: fs.existsSync(vaultPath) ? fs.statSync(vaultPath).size : 0,
  };
}

export function collectIntegrityDatabase(db: DatabaseAdapter, storage: ReturnType<typeof collectIntegrityStorage>) {
  const integrityRows = pragmaRows(db, "integrity_check");
  const quickRows = pragmaRows(db, "quick_check");
  const foreignKeyRows = pragmaRows(db, "foreign_key_check");
  const integrityResult = integrityRows.map((row) => String(row.integrity_check ?? Object.values(row)[0] ?? "")).filter(Boolean);
  const quickResult = quickRows.map((row) => String(row.quick_check ?? Object.values(row)[0] ?? "")).filter(Boolean);
  const requiredTables = [
    "cases", "persons", "case_notes", "case_note_cases", "case_documents", "deadlines",
    "deadline_templates", "contacts", "contact_text_references", "report_exports", "schema_migrations",
    "schema_migration_log", "settings", "personal_data_audit_log",
  ];
  const documentRows = rows(db, `SELECT id, filename, storage_path, document_key, iv, auth_tag FROM case_documents`);
  const normalizedDocumentPaths = new Set(documentRows.map((row) => String(row.storage_path ?? "").trim()).filter(Boolean).map((filePath) => path.resolve(filePath)));
  return {
    migrationRows: rows(db, `SELECT version, filename, applied_at, mode FROM schema_migrations ORDER BY version DESC LIMIT 20`),
    userVersionRows: pragmaRows(db, "user_version"),
    pageCountRows: pragmaRows(db, "page_count"),
    pageSizeRows: pragmaRows(db, "page_size"),
    integrityResult,
    quickResult,
    integrityOk: integrityResult.length === 1 && integrityResult[0].toLowerCase() === "ok",
    quickOk: quickResult.length === 1 && quickResult[0].toLowerCase() === "ok",
    foreignKeyIssues: foreignKeyRows.length,
    missingTables: requiredTables.filter((tableName) => !rows(db, `SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?`, [tableName]).length),
    migrationLogErrors: count(db, `SELECT COUNT(*) AS value FROM schema_migration_log WHERE action LIKE '%error%' OR action = 'failed'`),
    orphanDeadlines: count(db, `SELECT COUNT(*) AS value FROM deadlines d LEFT JOIN cases c ON c.id = d.case_id WHERE d.case_id IS NOT NULL AND c.id IS NULL`),
    orphanNotes: count(db, `SELECT COUNT(*) AS value FROM case_note_cases cnc LEFT JOIN cases c ON c.id = cnc.case_id LEFT JOIN case_notes n ON n.id = cnc.note_id WHERE c.id IS NULL OR n.id IS NULL`),
    orphanDocs: count(db, `SELECT COUNT(*) AS value FROM case_documents d LEFT JOIN cases c ON c.id = d.case_id WHERE d.case_id IS NOT NULL AND c.id IS NULL`),
    documentRows,
    missingDocumentFiles: documentRows.filter((row) => !row.storage_path || !fs.existsSync(String(row.storage_path))).length,
    orphanEncryptedDocumentFiles: storage.encryptedDocumentFiles.filter((filePath) => !normalizedDocumentPaths.has(path.resolve(filePath))).length,
    invalidDocumentContainers: documentRows.filter((row) => String(row.storage_path ?? "").trim() && !String(row.storage_path).endsWith(".gsbvdoc")).length,
    incompleteDocumentCrypto: documentRows.filter((row) => !row.document_key || !row.iv || !row.auth_tag).length,
    documentsOutsideDataDir: documentRows.filter((row) => row.storage_path && !isPathInside(String(row.storage_path), storage.dataDir)).length,
    schemaVersion: scalarText(db, `SELECT value FROM settings WHERE key = 'database.schema.version'`, [], "unbekannt"),
    schemaAppVersion: scalarText(db, `SELECT value FROM settings WHERE key = 'database.schema.appVersion'`, [], "unbekannt"),
    auditChain: new PersonalDataAuditLogService(db).integritySummary(),
  };
}

export function collectSystemIntegrityState(db: DatabaseAdapter, dataDir: string) {
  const storage = collectIntegrityStorage(dataDir);
  return { ...storage, ...collectIntegrityDatabase(db, storage) };
}

export type SystemIntegrityState = ReturnType<typeof collectSystemIntegrityState>;

export function buildSystemIntegrityWarnings(state: SystemIntegrityState): string[] {
  const warnings: string[] = [];
  const { integrityOk, integrityResult, quickOk, quickResult, foreignKeyIssues, missingTables, migrationLogErrors,
    orphanDeadlines, orphanNotes, orphanDocs, missingDocumentFiles, orphanEncryptedDocumentFiles, plainDocumentFiles,
    invalidDocumentContainers, incompleteDocumentCrypto, documentsOutsideDataDir, auditChain, tempStatus, backupFiles } = state;
  if (!integrityOk) warnings.push(`SQLite-Integritätsprüfung meldet: ${integrityResult.join("; ") || "kein Ergebnis"}.`);
  if (!quickOk) warnings.push(`SQLite-Schnellprüfung meldet: ${quickResult.join("; ") || "kein Ergebnis"}.`);
  if (foreignKeyIssues) warnings.push(`${foreignKeyIssues} Fremdschlüssel-/Referenzprobleme gefunden.`);
  if (missingTables.length) warnings.push(`Erforderliche Tabellen fehlen: ${missingTables.join(", ")}.`);
  if (migrationLogErrors) warnings.push(`${migrationLogErrors} Migrationslog-Einträge deuten auf Fehler hin.`);
  if (orphanDeadlines) warnings.push(`${orphanDeadlines} Fristen verweisen auf nicht vorhandene Fälle.`);
  if (orphanNotes) warnings.push(`${orphanNotes} Notiz-Fall-Verknüpfungen sind verwaist.`);
  if (orphanDocs) warnings.push(`${orphanDocs} Dokumente verweisen auf nicht vorhandene Fälle.`);
  if (missingDocumentFiles) warnings.push(`${missingDocumentFiles} Dokumentdatensätze haben keine auffindbare verschlüsselte Datei.`);
  if (orphanEncryptedDocumentFiles) warnings.push(`${orphanEncryptedDocumentFiles} verschlüsselte Dokumentdateien haben keinen Datenbankeintrag.`);
  if (plainDocumentFiles.length) warnings.push(`${plainDocumentFiles.length} mögliche Klartextdateien liegen im Dokumentenspeicher. Diese sollten dort nicht liegen.`);
  if (invalidDocumentContainers) warnings.push(`${invalidDocumentContainers} Dokumentdatensätze verweisen nicht auf .gsbvdoc-Container.`);
  if (incompleteDocumentCrypto) warnings.push(`${incompleteDocumentCrypto} Dokumentdatensätze haben unvollständige Verschlüsselungsmetadaten.`);
  if (documentsOutsideDataDir) warnings.push(`${documentsOutsideDataDir} Dokumente liegen außerhalb des aktuellen Gremia.SBV-Datenverzeichnisses.`);
  if (!auditChain.ok) warnings.push(`Audit-Hash-Chain ist beschädigt oder lückenhaft. Erste auffällige Sequenz: ${auditChain.firstBrokenSequence ?? "unbekannt"}.`);
  if (tempStatus.remaining) warnings.push(`${tempStatus.remaining} temporäre Klartext-Arbeitskopie(n) liegen im tmp-Bereich. Bitte bereinigen oder App sperren.`);
  if (!backupFiles) warnings.push("Es wurden keine Backup-Dateien im lokalen Backup-Ordner gefunden.");
  return warnings;
}

export function systemIntegrityValidationRows(state: SystemIntegrityState): unknown[][] {
  const { integrityOk, integrityResult, quickOk, quickResult, foreignKeyIssues, missingTables, orphanDeadlines, orphanNotes,
    orphanDocs, missingDocumentFiles, orphanEncryptedDocumentFiles, plainDocumentFiles, incompleteDocumentCrypto,
    documentsOutsideDataDir, auditChain, tempStatus } = state;
  return [
    ["PRAGMA integrity_check", integrityOk ? "OK" : integrityResult.join("; ") || "kein Ergebnis", integrityOk ? "GRÜN" : "ROT"],
    ["PRAGMA quick_check", quickOk ? "OK" : quickResult.join("; ") || "kein Ergebnis", quickOk ? "GRÜN" : "ROT"],
    ["PRAGMA foreign_key_check", foreignKeyIssues ? `${foreignKeyIssues} Befund(e)` : "OK", foreignKeyIssues ? "ROT" : "GRÜN"],
    ["Erforderliche Tabellen", missingTables.length ? missingTables.join(", ") : "vollständig", missingTables.length ? "ROT" : "GRÜN"],
    ["Verwaiste Fristen", orphanDeadlines ? `${orphanDeadlines} Befund(e)` : "OK", orphanDeadlines ? "ROT" : "GRÜN"],
    ["Verwaiste Notizverknüpfungen", orphanNotes ? `${orphanNotes} Befund(e)` : "OK", orphanNotes ? "ROT" : "GRÜN"],
    ["Verwaiste Dokumente", orphanDocs ? `${orphanDocs} Befund(e)` : "OK", orphanDocs ? "ROT" : "GRÜN"],
    ["Fehlende Dokumentcontainer", missingDocumentFiles ? `${missingDocumentFiles} Befund(e)` : "OK", missingDocumentFiles ? "ROT" : "GRÜN"],
    ["Verwaiste Dokumentcontainer", orphanEncryptedDocumentFiles ? `${orphanEncryptedDocumentFiles} Befund(e)` : "OK", orphanEncryptedDocumentFiles ? "GELB" : "GRÜN"],
    ["Klartext im Dokumentenspeicher", plainDocumentFiles.length ? `${plainDocumentFiles.length} Datei(en)` : "OK", plainDocumentFiles.length ? "ROT" : "GRÜN"],
    ["Dokument-Verschlüsselungsmetadaten", incompleteDocumentCrypto ? `${incompleteDocumentCrypto} unvollständig` : "OK", incompleteDocumentCrypto ? "ROT" : "GRÜN"],
    ["Dokument-Speicherort", documentsOutsideDataDir ? `${documentsOutsideDataDir} außerhalb Datenverzeichnis` : "OK", documentsOutsideDataDir ? "GELB" : "GRÜN"],
    ["Audit-Hash-Chain", auditChain.ok ? `OK (${auditChain.checked} Einträge)` : `${auditChain.issues.length} Befund(e), erste Sequenz ${auditChain.firstBrokenSequence ?? "—"}`, auditChain.ok ? "GRÜN" : "ROT"],
    ["Temporäre Klartext-Arbeitskopien", tempStatus.remaining ? `${tempStatus.remaining} Datei(en), ${formatBytes(tempStatus.bytesRemaining)}` : "OK", tempStatus.remaining ? "GELB" : "GRÜN"],
  ];
}

export function systemIntegrityDetailRows(state: SystemIntegrityState): unknown[][] {
  const { schemaVersion, schemaAppVersion, userVersionRows, pageCountRows, pageSizeRows, vaultPath, vaultSize, auditChain, tempStatus } = state;
  return [
    ["Schema-Version", schemaVersion], ["App-Version bei letzter Migration", schemaAppVersion],
    ["SQLite user_version", String(userVersionRows[0]?.user_version ?? Object.values(userVersionRows[0] ?? {})[0] ?? "—")],
    ["Page Count", String(pageCountRows[0]?.page_count ?? Object.values(pageCountRows[0] ?? {})[0] ?? "—")],
    ["Page Size", String(pageSizeRows[0]?.page_size ?? Object.values(pageSizeRows[0] ?? {})[0] ?? "—")],
    ["Datenbankdatei", vaultPath], ["Datenbankgröße", formatBytes(vaultSize)], ["Audit-Hash-Algorithmus", auditChain.algorithm],
    ["Audit-Chain-Version", String(auditChain.chainVersion)], ["Letzter Audit-Hash", auditChain.latestHash],
    ["Audit-Sequenzbereich", auditChain.checked ? `${auditChain.firstSequence ?? "—"} bis ${auditChain.lastSequence ?? "—"}` : "keine Einträge"],
    ["Temporärer Arbeitsbereich", tempStatus.root], ["Temporäre Dateien", `${tempStatus.remaining} Datei(en), ${formatBytes(tempStatus.bytesRemaining)}`],
    ["Älteste temporäre Datei", tempStatus.oldestRemainingAt ? formatDateTime(tempStatus.oldestRemainingAt) : "—"],
  ];
}

export function buildSystemIntegrityContent(state: SystemIntegrityState, metrics: Record<string, number | string>): PdfBlock[] {
  const validationRows = systemIntegrityValidationRows(state).map((row) => [row[0], row[1], row[2] === "GRÜN" ? "GRÜN" : row[2] === "GELB" ? "GELB" : "ROT"]);
  const { dataDir, documentDir, documentFiles, encryptedDocumentFiles, backupDir, backupFiles, exportDir, exportFiles, documentRows,
    plainDocumentFiles, missingDocumentFiles, orphanEncryptedDocumentFiles, incompleteDocumentCrypto, tempStatus, auditChain, migrationRows } = state;
  return [
    metricCards(metrics),
    section('Datenbankvalidierung', [table(['Prüfung', 'Befund', 'Ampel'], validationRows)]),
    section('Datenbankdetails', [table(['Eigenschaft', 'Wert'], systemIntegrityDetailRows(state))]),
    section('Speicherorte', [table(['Bereich', 'Pfad/Anzahl'], [['Datenordner', dataDir], ['Dokumente', `${documentDir} (${documentFiles}; davon ${encryptedDocumentFiles.length} verschlüsselte Container)`], ['Backups', `${backupDir} (${backupFiles})`], ['Exporte', `${exportDir} (${exportFiles})`]])]),
    section('Dokumentenspeicher', [table(['Prüfung', 'Anzahl'], [['Dokumentdatensätze', documentRows.length], ['Verschlüsselte .gsbvdoc-Dateien', encryptedDocumentFiles.length], ['Mögliche Klartextdateien', plainDocumentFiles.length], ['Fehlende Container', missingDocumentFiles], ['Container ohne Datenbankeintrag', orphanEncryptedDocumentFiles], ['Unvollständige Kryptometadaten', incompleteDocumentCrypto]])]),
    section('Temporäre Klartext-Arbeitskopien', [table(['Prüfung', 'Wert'], [['Status', tempStatus.remaining ? 'Bereinigung empfohlen' : 'OK'], ['Dateien', tempStatus.remaining], ['Größe', formatBytes(tempStatus.bytesRemaining)], ['Ordner', tempStatus.root], ['Älteste Datei', tempStatus.oldestRemainingAt ? formatDateTime(tempStatus.oldestRemainingAt) : '—']])]),
    section('Audit-Log und Hash-Chain', [table(['Kennzahl', 'Wert'], [['Status', auditChain.ok ? 'Hash-Chain intakt' : 'Auffällig / Manipulationsverdacht'], ['Geprüfte Einträge', auditChain.checked], ['Lese-/Such-/Öffnungsereignisse', auditChain.readEvents], ['Änderungsereignisse', auditChain.changeEvents], ['Export-/Backupereignisse', auditChain.exportEvents], ['Letzter Hash', auditChain.latestHash]])]),
    ...(auditChain.issues.length ? [section('Audit-Chain-Befunde', [table(['Sequenz', 'Art', 'Befund'], auditChain.issues.slice(0, 25).map((issue) => [issue.sequence, issue.kind, issue.message]))])] : []),
    section('Letzte Migrationen', [table(['Version', 'Datei', 'Ausgeführt', 'Modus'], migrationRows.map((row) => [row.version, row.filename, formatDateTime(reportText(row.applied_at)), normalizeStatus(typeof row.mode === 'string' ? row.mode : undefined)]))]),
  ];
}
