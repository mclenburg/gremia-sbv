import type { ComplianceDocumentDescriptor, ComplianceDocumentType } from '../models/compliance.model.js';
import { legalCalendarDate } from '../time/legalTime.js';
export const COMPLIANCE_DOCUMENTS: ComplianceDocumentDescriptor[] = [
  {
    type: 'toms',
    title: 'TOMs – Technische und organisatorische Maßnahmen',
    description: 'Dokumentiert die technischen und organisatorischen Schutzmaßnahmen für lokale SBV-Fallarbeit.',
    buttonLabel: 'TOMs abrufen'
  },
  {
    type: 'vvt',
    title: 'VVT-Eintrag – SBV-Fallarbeit',
    description: 'Entwurf für das Verzeichnis von Verarbeitungstätigkeiten nach Art. 30 DSGVO.',
    buttonLabel: 'VVT abrufen'
  },
  {
    type: 'dsfa',
    title: 'DSFA-Entwurf',
    description: 'Vorbewertung zur Datenschutz-Folgenabschätzung nach Art. 35 DSGVO.',
    buttonLabel: 'DSFA abrufen'
  },
  {
    type: 'data_protection_notice',
    title: 'Datenschutzinformation Art. 13/14 DSGVO',
    description: 'Anpassbare Vorlage für die proaktive Datenschutzinformation betroffener Beschäftigter.',
    buttonLabel: 'Datenschutzinformation abrufen'
  },
  {
    type: 'dsgvo_bdsg_matrix',
    title: 'DSGVO-/BDSG-Compliance-Auswertung',
    description: 'Matrix zu Anforderungen, Umsetzung, Bewertung und offenen Punkten.',
    buttonLabel: 'Compliance-Auswertung abrufen'
  },
  {
    type: 'retention_schedule',
    title: 'Lösch- und Aufbewahrungskonzept',
    description: 'Arbeitsentwurf für Aufbewahrung, Löschung, Anonymisierung und Review-Fristen.',
    buttonLabel: 'Löschkonzept abrufen'
  },
  {
    type: 'data_subject_rights',
    title: 'Prozess Betroffenenrechte',
    description: 'Prüf- und Ablaufhilfe für Auskunft, Berichtigung, Löschung und Einschränkung.',
    buttonLabel: 'Betroffenenrechte abrufen'
  },
  {
    type: 'export_policy',
    title: 'Export- und Weitergaberegeln',
    description: 'Interne Nutzungsregel für Klartextexporte, PDF-Abrufe und externe Weitergabe.',
    buttonLabel: 'Exportregeln abrufen'
  },
  {
    type: 'dsb_it_security_approval',
    title: 'Vorlage DSB / IT-Security',
    description: 'Formular zur Genehmigung der Softwarenutzung mit Sicherheitsmaßnahmen.',
    buttonLabel: 'Freigabeformular abrufen'
  },
  {
    type: 'data_protection_status',
    title: 'Technischer Datenschutzstatus vor Produktivnutzung',
    description: 'Prüfliste für Auto-Lock, Backup, Audit, temporäre Dateien, DSFA/TOM/VVT und organisatorische Freigaben.',
    buttonLabel: 'Technischen Status abrufen'
  },
  {
    type: 'dsar_response',
    title: 'SBV-Zuarbeit zur Art.-15-Auskunft',
    description: 'Geprüfte Zuarbeit der SBV für Datenschutzkontakt oder verantwortliche Stelle; DSB optional, keine ungeprüfte Direktantwort.',
    buttonLabel: 'Art.-15-Zuarbeit abrufen'
  }
];
export function nowIso(): string {
  return new Date().toISOString();
}
export function displayDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function plusDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
export function toDateInputValue(date: Date): string {
  return legalCalendarDate(date);
}
export function complianceDocumentFileName(type: ComplianceDocumentType, generatedAt: string): string {
  const stamp = generatedAt.replace(/[:.]/g, '-').slice(0, 19);
  return `gremia-sbv-${type}-${stamp}.pdf`;
}
export function header(title: string, generatedAt: string): string {
  return `# ${title}

Erzeugt am: ${displayDateTime(generatedAt)}

Hinweis: Diese Unterlage dokumentiert die in Gremia.SBV vorgesehenen und umgesetzten Maßnahmen. Sie ersetzt keine abschließende Bewertung durch Datenschutzbeauftragte, IT-Security oder Rechtsberatung.

`;
}
