import { waitForBridge } from "../../core/bridge/waitForBridge";
import type {
  ComplianceAuditChainStatus,
  ComplianceDatabaseIntegrityStatus,
  ComplianceDocument,
  ComplianceSelfCheckResult,
  ComplianceStatusOverview,
  ComplianceTechnicalStatusItem,
  ComplianceTechnicalStatusLevel,
} from "../../core/models/compliance.model";

export function downloadTextFile(document: ComplianceDocument) {
  const blob = new Blob([document.body], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function technicalLevelLabel(
  level: ComplianceTechnicalStatusLevel,
): string {
  switch (level) {
    case "ok":
      return "OK";
    case "warning":
      return "Prüfen";
    case "problem":
      return "Problem";
    case "info":
      return "Info";
  }
}

export function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toDateTimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function buildFallbackStatus(): ComplianceStatusOverview {
  return {
    generatedAt: new Date().toISOString(),
    technicalItems: [
      {
        id: "runtime-status",
        label: "Laufzeitstatus",
        level: "warning",
        summary:
          "Technischer Status konnte noch nicht vollständig geladen werden.",
        detail:
          "Das Compliance Center lädt Sicherheits- und Temp-Dateistatus nach dem Öffnen nach.",
      },
    ],
    manualItems: [],
    nextTechnicalActions: ["Technischen Status aktualisieren"],
    manualCheckSummary: "",
  };
}

export function buildFallbackSelfCheck(): ComplianceSelfCheckResult {
  return {
    generatedAt: new Date().toISOString(),
    score: 0,
    status: "warning",
    items: [
      {
        id: "self-check-loading",
        label: "Selbstcheck",
        status: "warning",
        summary: "Selbstcheck wurde noch nicht geladen.",
        action: "Selbstcheck aktualisieren.",
      },
    ],
    nextActions: ["Selbstcheck aktualisieren."],
  };
}

export function auditChainStatusItem(
  status?: ComplianceAuditChainStatus,
): ComplianceTechnicalStatusItem {
  if (!status)
    return {
      id: "audit-chain",
      label: "Audit-Hash-Chain",
      level: "warning",
      summary: "Audit-Hash-Chain konnte nicht geprüft werden.",
      detail:
        "Bitte technischen Status erneut laden oder System-/Integritätsbericht prüfen.",
    };
  if (!status.checked)
    return {
      id: "audit-chain",
      label: "Audit-Hash-Chain",
      level: "ok",
      summary: "Keine Audit-Einträge vorhanden.",
    };
  return {
    id: "audit-chain",
    label: "Audit-Hash-Chain",
    level: status.ok ? "ok" : "problem",
    summary: status.ok
      ? `Hash-Kette intakt (${status.checked} Einträge geprüft).`
      : `Hash-Kette auffällig (${status.issues.length} Befund(e)).`,
    detail: status.ok
      ? `Sequenzen ${status.firstSequence ?? "—"} bis ${status.lastSequence ?? "—"}, letzter Hash ${status.latestHash.slice(0, 12)}…`
      : `Erste auffällige Sequenz: ${status.firstBrokenSequence ?? "unbekannt"}. ${status.issues[0]?.message ?? "Integritätsprüfung fehlgeschlagen."}`,
  };
}

export function databaseIntegrityStatusItem(
  status?: ComplianceDatabaseIntegrityStatus,
): ComplianceTechnicalStatusItem {
  if (!status)
    return {
      id: "database-integrity",
      label: "Datenbankschema",
      level: "warning",
      summary: "Datenbankschema konnte nicht geprüft werden.",
      detail:
        "Bitte technischen Status erneut laden oder Migrationsstatus prüfen.",
    };

  if (status.ok)
    return {
      id: "database-integrity",
      label: "Datenbankschema",
      level: "ok",
      summary: `Schema ${status.appliedSchemaVersion ?? status.schemaVersion} vollständig.`,
      detail:
        "Kritische Tabellen und Spalten für Fallakten-, Personen-, Datenschutz-, Audit- und Vorfallfunktionen sind vorhanden.",
    };

  return {
    id: "database-integrity",
    label: "Datenbankschema",
    level: status.repairRequired ? "problem" : "warning",
    summary: `${status.issueCount} Schema-Befund(e).`,
    detail: status.issues.slice(0, 3).join(" · "),
  };
}

export async function loadComplianceStatus(): Promise<ComplianceStatusOverview> {
  const bridge = await waitForBridge();
  if (!bridge?.security) return buildFallbackStatus();

  const security = bridge.security;
  const securityStatus = await security.status();
  const tempStatus = await security.temporaryFileStatus();
  const auditStatus = await bridge.compliance
    ?.auditChainStatus()
    .catch(() => undefined);
  const databaseIntegrityStatus = await bridge.compliance
    ?.databaseIntegrityStatus()
    .catch(() => undefined);

  const technicalItems: ComplianceTechnicalStatusItem[] = [
    {
      id: "vault",
      label: "Verschlüsselter Tresor",
      level:
        securityStatus.initialized && securityStatus.databaseProtected !== false
          ? "ok"
          : "problem",
      summary: securityStatus.initialized
        ? "Tresor ist eingerichtet."
        : "Tresor ist noch nicht eingerichtet.",
      detail:
        securityStatus.databaseProtected === false
          ? "Die Datenbank wird als nicht geschützt gemeldet."
          : undefined,
    },
    {
      id: "temp-files",
      label: "Temporäre Arbeitskopien",
      level: tempStatus.remaining > 0 ? "warning" : "ok",
      summary:
        tempStatus.remaining > 0
          ? `${tempStatus.remaining} temporäre Datei(en) im Arbeitsbereich.`
          : "Keine temporären Arbeitskopien gefunden.",
      detail:
        tempStatus.remaining > 0
          ? "Temporäre PDF-/Dokumentkopien sollten nach Nutzung bereinigt werden."
          : undefined,
    },
    databaseIntegrityStatusItem(databaseIntegrityStatus),
    auditChainStatusItem(auditStatus),
  ];

  return {
    generatedAt: new Date().toISOString(),
    technicalItems,
    manualItems: [],
    nextTechnicalActions: technicalItems
      .filter((item) => item.level === "warning" || item.level === "problem")
      .map((item) => item.label),
    manualCheckSummary: "",
  };
}
