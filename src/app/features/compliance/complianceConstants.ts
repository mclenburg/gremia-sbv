import type {
  ComplianceDocumentType,
  ComplianceIncidentCategory,
  ComplianceIncidentRiskLevel,
  ComplianceIncidentStatus,
} from "../../core/models/compliance.model";

export type ComplianceWorkspace =
  | "system"
  | "self_check"
  | "incidents"
  | "documents"
  | "dsar";

export const WORKSPACES: Array<{
  id: ComplianceWorkspace;
  title: string;
  description: string;
}> = [
  {
    id: "system",
    title: "Systemzustand",
    description: "Tresor, temporäre Dateien, Schema und Audit-Hash-Chain.",
  },
  {
    id: "self_check",
    title: "Selbstcheck",
    description:
      "Prüfbarer Sicherheits- und Datenschutzstatus mit Handlungsliste.",
  },
  {
    id: "incidents",
    title: "Datenschutzvorfälle",
    description: "Sicherheitsereignisse dokumentieren und abschließen.",
  },
  {
    id: "documents",
    title: "Unterlagen",
    description: "TOMs, VVT, DSFA, Löschkonzept und Freigaben.",
  },
  {
    id: "dsar",
    title: "Art. 15",
    description: "Auskunftsersuchen vorbereiten und vorbefüllen.",
  },
];

export const INCIDENT_CATEGORIES: Array<{
  value: ComplianceIncidentCategory;
  label: string;
}> = [
  { value: "wrong_export", label: "Falscher Export" },
  { value: "lost_backup", label: "Backup/Datenträger verloren" },
  {
    value: "unauthorized_access_suspected",
    label: "Unberechtigter Zugriff vermutet",
  },
  { value: "wrong_recipient", label: "Falscher Empfänger" },
  { value: "vault_integrity", label: "Tresor-/Integritätsproblem" },
  { value: "temporary_file", label: "Temporäre Klartextdatei" },
  { value: "other", label: "Sonstiges Ereignis" },
];

export const RISK_LEVELS: Array<{
  value: ComplianceIncidentRiskLevel;
  label: string;
}> = [
  { value: "low", label: "niedrig" },
  { value: "medium", label: "mittel" },
  { value: "high", label: "hoch" },
];

export const INCIDENT_STATUSES: Array<{
  value: ComplianceIncidentStatus;
  label: string;
}> = [
  { value: "open", label: "offen" },
  { value: "in_review", label: "in Prüfung" },
  { value: "reported", label: "gemeldet" },
  { value: "closed", label: "abgeschlossen" },
];

export const DOCUMENT_WORKSPACE_EXCLUDED_TYPES: ComplianceDocumentType[] = [
  "dsar_response",
];
