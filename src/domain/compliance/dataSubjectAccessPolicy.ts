import type {
  DataSubjectAccessPrefill,
  DataSubjectAccessPrivacyContactRole,
  DataSubjectAccessReleaseMode,
  DataSubjectAccessRequestInput,
  DataSubjectAccessSourceInventoryItem,
  DataSubjectAccessSourceStatus,
} from '../models/compliance.model.js';

export interface DataSubjectAccessSourceDefinition {
  id: string;
  module: string;
  label: string;
  table?: string;
  dataCategories: string[];
  purposes: string[];
  recipients: string[];
  retentionRule: string;
  origin: string;
  releaseMode: DataSubjectAccessReleaseMode;
  reviewNote?: string;
}

export interface DataSubjectAccessReadiness {
  ready: boolean;
  warnings: string[];
  nextActions: string[];
}

export const DATA_SUBJECT_ACCESS_SOURCES: DataSubjectAccessSourceDefinition[] = [
  {
    id: 'persons',
    module: 'Personen',
    label: 'Personenstamm und Schutzstatus',
    table: 'protected_persons',
    dataCategories: ['Stammdaten', 'Beschäftigungsbezug', 'Schwerbehinderten-/Gleichstellungsstatus'],
    purposes: ['Führung des SBV-Personenverzeichnisses', 'Prüfung von Beteiligungs- und Anhörungspflichten'],
    recipients: ['SBV', 'verantwortliche Stelle/Datenschutzkontakt bei Betroffenenrechten'],
    retentionRule: 'Solange zur Prüfung von SBV-Rechten erforderlich; Löschung/Anonymisierung nach Zweckwegfall und manueller Datenschutzprüfung.',
    origin: 'Arbeitgeberliste, vorgelegte Nachweise, Selbstauskunft oder manuelle SBV-Erfassung.',
    releaseMode: 'direct_summary',
  },
  {
    id: 'legacy_persons',
    module: 'Personen',
    label: 'Alt-Personendaten',
    table: 'persons',
    dataCategories: ['Legacy-Stammdaten', 'Kontakt- und Organisationsdaten'],
    purposes: ['Rückwärtskompatible Fallaktenzuordnung'],
    recipients: ['SBV', 'verantwortliche Stelle/Datenschutzkontakt bei Betroffenenrechten'],
    retentionRule: 'Bis zur Migration oder Lösch-/Anonymisierungsentscheidung im jeweiligen Vorgang.',
    origin: 'Ältere Gremia.SBV-Datenbestände.',
    releaseMode: 'review_required',
    reviewNote: 'Legacy-Daten sind vor Herausgabe gegen den aktuellen Personenstamm zu prüfen.',
  },
  {
    id: 'cases',
    module: 'Fallakten',
    label: 'Fallakten',
    table: 'cases',
    dataCategories: ['Fallbezug', 'Sachverhalt', 'Bearbeitungsstatus', 'Risikoeinschätzung'],
    purposes: ['Vertrauliche SBV-Beratung und Interessenvertretung'],
    recipients: ['SBV; Weitergabe nur zweckbezogen und geprüft'],
    retentionRule: 'Regelmäßig drei Jahre nach Fallabschluss oder früher bei Zweckwegfall, jeweils manuell geprüft.',
    origin: 'Angaben der betroffenen Person, SBV-Dokumentation, Arbeitgeber-/Behördenkommunikation.',
    releaseMode: 'review_required',
    reviewNote: 'Fallinhalte enthalten häufig Dritt- oder Arbeitgeberdaten und müssen vor Herausgabe geprüft werden.',
  },
  {
    id: 'deadlines',
    module: 'Fristen',
    label: 'Fristen und Wiedervorlagen',
    table: 'deadlines',
    dataCategories: ['Fristtitel', 'Fälligkeiten', 'Rechtsgrundlagen', 'Vorgangsbezug'],
    purposes: ['Fristenkontrolle und Nachverfolgung der SBV-Arbeit'],
    recipients: ['SBV'],
    retentionRule: 'Je nach verknüpftem Vorgang; erledigte Fristen nach Standardfrist und manueller Prüfung.',
    origin: 'Manuelle SBV-Erfassung oder automatisch aus Vorgängen abgeleitet.',
    releaseMode: 'review_required',
  },
  {
    id: 'measures',
    module: 'Maßnahmen',
    label: 'Maßnahmen und Prozessmodule',
    table: 'case_measures',
    dataCategories: ['Maßnahmentyp', 'Status', 'Risiko', 'nächste Schritte'],
    purposes: ['Strukturierte Bearbeitung von BEM, Prävention, Arbeitsplatzanpassung, Beteiligung und ähnlichen Vorgängen'],
    recipients: ['SBV; je nach Vorgang Arbeitgeber, Integrationsamt oder weitere Stellen nach Prüfung'],
    retentionRule: 'Nach jeweiliger Modulfrist und manueller Datenschutzprüfung.',
    origin: 'Fallaktenarbeit, Arbeitgeberunterrichtung, Behörden-/Ämterkommunikation, Angaben betroffener Personen.',
    releaseMode: 'review_required',
  },
  {
    id: 'contacts',
    module: 'Kontakte',
    label: 'Kontakte und Rollen',
    table: 'contacts',
    dataCategories: ['Name', 'Organisation', 'Rolle', 'Kontaktwege', 'Notizen'],
    purposes: ['Kommunikation im SBV-Verfahren'],
    recipients: ['SBV'],
    retentionRule: 'Solange verknüpfte Vorgänge bestehen; danach Bereinigung nach manueller Prüfung.',
    origin: 'Manuelle Erfassung oder aus Vorgangskommunikation.',
    releaseMode: 'review_required',
    reviewNote: 'Kontaktangaben Dritter dürfen nicht ungeprüft herausgegeben werden.',
  },
  {
    id: 'imports',
    module: 'Personenimport',
    label: 'Arbeitgeberlisten-Importe',
    table: 'person_import_run_items',
    dataCategories: ['Importzeitpunkt', 'Quelle', 'Änderungsart', 'geänderte Felder'],
    purposes: ['Nachvollziehbare Aktualisierung des Personenverzeichnisses'],
    recipients: ['SBV'],
    retentionRule: 'Metadaten nach Erforderlichkeit für Nachvollziehbarkeit und Datenschutzprüfung.',
    origin: 'Arbeitgeberliste oder vergleichbarer Import.',
    releaseMode: 'metadata_only',
  },
  {
    id: 'generated_documents',
    module: 'Dokumente',
    label: 'Erzeugte Dokumente',
    table: 'generated_documents',
    dataCategories: ['Dokumenttitel', 'Dateiname', 'Erzeugungszeitpunkt', 'Vorgangsbezug'],
    purposes: ['Nachweis und Wiederauffindbarkeit erzeugter SBV-Unterlagen'],
    recipients: ['SBV; Empfänger je nach Dokumentklasse'],
    retentionRule: 'Nach Dokumentklasse und verknüpftem Vorgang.',
    origin: 'Automatisch aus Gremia.SBV erzeugte Dokumente.',
    releaseMode: 'metadata_only',
    reviewNote: 'Dokumentinhalte werden nicht pauschal herausgegeben; Anhänge sind gesondert zu prüfen.',
  },
  {
    id: 'activity_journal',
    module: 'Tätigkeitsjournal',
    label: 'Tätigkeitsjournal-Bezüge',
    table: 'activity_journal_entries',
    dataCategories: ['Tätigkeitsdatum', 'Kategorie', 'Titel', 'Ergebnisnotiz', 'Vorgangsverknüpfung'],
    purposes: ['SBV-Tätigkeitsnachweis und Wiedervorlage'],
    recipients: ['SBV; Tätigkeitsberichte nur anonymisiert/aggregiert'],
    retentionRule: 'Gremienbezogen, datensparsam; personenbezogene Bezüge nach Vorgang prüfen.',
    origin: 'Manuelle SBV-Erfassung, Kontextvorbefüllung oder Timer.',
    releaseMode: 'review_required',
    reviewNote: 'Journaltexte können Dritt- und Gremieninformationen enthalten.',
  },
  {
    id: 'participation_violations',
    module: 'Verstöße',
    label: 'Beteiligungsverstöße',
    table: 'sbv_participation_violations',
    dataCategories: ['Verstoßart', 'Sachverhalt', 'Rechtsgrundlage', 'Eskalationsstand'],
    purposes: ['Nachverfolgung von Arbeitgeberverstößen gegen SBV-Beteiligungsrechte'],
    recipients: ['SBV; Arbeitgeber/Gericht/Behörden nur nach Vorgang und Prüfung'],
    retentionRule: 'Amtszeit- bzw. verfahrensbezogen nach Löschkonzept und manueller Prüfung.',
    origin: 'SBV-Dokumentation, Beteiligungsmaßnahmen, Fristen, Journal oder allgemeine Arbeitgeberpraxis.',
    releaseMode: 'review_required',
  },
  {
    id: 'recruiting',
    module: 'Stellenbesetzungen',
    label: 'Stellenbesetzungs- und Interviewbeteiligung',
    table: 'recruiting_participations',
    dataCategories: ['Stelle', 'Kennziffer', 'Bewerberstatus', 'Interview-/Anhörungsstatus'],
    purposes: ['Kontrolle der SBV-Beteiligung bei Stellenbesetzungen'],
    recipients: ['SBV; Arbeitgeber/BR nur zweckbezogen und geprüft'],
    retentionRule: 'Regelmäßig sechs Monate nach Verfahrensabschluss, sofern keine Anschlussgründe bestehen.',
    origin: 'Arbeitgeberunterrichtung, Interviewdokumentation, SBV-Nachverfolgung.',
    releaseMode: 'review_required',
    reviewNote: 'Bewerberdaten und Vergleichsdaten Dritter sind besonders sorgfältig zu schwärzen.',
  },
  {
    id: 'sbv_office',
    module: 'Dokumentation',
    label: 'SBV-Amtsarbeit und Versammlungen',
    table: 'sbv_meetings',
    dataCategories: ['Sitzungen', 'Tagesordnungspunkte', 'Beschwerden', 'Pflichtenprüfung', 'Versammlungen'],
    purposes: ['Dokumentation der SBV-Amtsarbeit'],
    recipients: ['SBV; Arbeitgeber/Ämter nur je nach Dokument und Rechtsgrundlage'],
    retentionRule: 'Gremien- oder amtszeitbezogen; personenbezogene Bezüge nach Zweck und Vorgang prüfen.',
    origin: 'SBV-Amtsarbeit, Arbeitgeberberichte, Beschwerden, Versammlungsunterlagen.',
    releaseMode: 'review_required',
  },
  {
    id: 'elections',
    module: 'Wahlen',
    label: 'Wahlunterlagen mit Personenbezug',
    table: 'sbv_elections',
    dataCategories: ['Wählerliste', 'Kandidaturen', 'Wahlvorschläge', 'Briefwahlstatus', 'Einwendungen', 'Ergebnisannahme'],
    purposes: ['Vorbereitung, Durchführung und Nachweis der SBV-Wahl'],
    recipients: ['Wahlvorstand/SBV; Bekanntmachungen nur nach SchwbVWO'],
    retentionRule: 'Bis zum Ablauf der Amtszeit bzw. Übergabe an die neue SBV; Wahlgeheimnis bleibt unberührt.',
    origin: 'Arbeitgeberliste, Wahlvorstand, Wahlberechtigte, Kandidierende.',
    releaseMode: 'review_required',
    reviewNote: 'Das Wahlgeheimnis und Daten anderer Wahlberechtigter dürfen nicht beeinträchtigt werden.',
  },
  {
    id: 'privacy_reviews',
    module: 'Datenschutzprüfung',
    label: 'Datenschutzprüfungen, Lösch- und Aufbewahrungsentscheidungen',
    table: 'privacy_review_items',
    dataCategories: ['Prüfgrund', 'Fälligkeit', 'Risiko', 'Status', 'Entscheidung'],
    purposes: ['Nachvollziehbare Speicherbegrenzung und manuelle Datenschutzprüfung'],
    recipients: ['SBV; Datenschutzkontakt/verantwortliche Stelle bei Betroffenenrechten'],
    retentionRule: 'Nach Integritäts- und Nachweisbedarf des Datenschutzprozesses.',
    origin: 'Automatische Löschfristen, manuelle Prüfaufträge, Lösch-/Anonymisierungsentscheidungen.',
    releaseMode: 'metadata_only',
  },
  {
    id: 'lifecycle_audit',
    module: 'Audit',
    label: 'Datensparsame Lifecycle- und Audit-Ereignisse',
    table: 'personal_data_audit_log',
    dataCategories: ['Aktion', 'Zeitpunkt', 'Zweck', 'Vorgangsbezug'],
    purposes: ['Manipulationsnachweis und Nachvollziehbarkeit personenbezogener Verarbeitung'],
    recipients: ['SBV; Datenschutzkontakt/verantwortliche Stelle bei Betroffenenrechten'],
    retentionRule: 'Integritätsbezogen; keine unnötigen Direktidentifikatoren.',
    origin: 'Automatische Auditierung der Anwendung.',
    releaseMode: 'metadata_only',
  },
  {
    id: 'external_references',
    module: 'Gremia.BR',
    label: 'Externe Referenzen aus Gremia.BR',
    table: 'case_external_references',
    dataCategories: ['Referenztitel', 'Beschreibung', 'Quelltyp', 'Snapshot-Metadaten'],
    purposes: ['Kontextbezug zwischen SBV-Fallarbeit und Betriebsratsvorgängen'],
    recipients: ['SBV'],
    retentionRule: 'Nach verknüpfter Fallakte und lokalem Cache-Konzept.',
    origin: 'Lokaler Lesecache oder Referenz auf Gremia.BR.',
    releaseMode: 'metadata_only',
    reviewNote: 'BR-Inhalte können Rechte Dritter oder Gremiengeheimnisse berühren.',
  },
];

export function sourceInventoryItem(
  definition: DataSubjectAccessSourceDefinition,
  foundCount: number,
  status: DataSubjectAccessSourceStatus,
): DataSubjectAccessSourceInventoryItem {
  return {
    id: definition.id,
    module: definition.module,
    label: definition.label,
    status,
    foundCount,
    dataCategories: definition.dataCategories,
    purposes: definition.purposes,
    recipients: definition.recipients,
    retentionRule: definition.retentionRule,
    origin: definition.origin,
    releaseMode: definition.releaseMode,
    reviewNote: definition.reviewNote,
  };
}

export function preferredPrivacyContactLabel(input: DataSubjectAccessRequestInput): string {
  const explicitRecipient = input.handoverRecipient.trim();
  if (explicitRecipient) return explicitRecipient;
  if (input.privacyContactRole === 'data_protection_officer' && input.privacyContactName.trim()) {
    return input.privacyContactName.trim();
  }
  if (input.privacyContactName.trim()) return input.privacyContactName.trim();
  if (input.responsibleEntity.trim()) return input.responsibleEntity.trim();
  return 'verantwortliche Stelle / Datenschutzkontakt';
}

export function privacyContactRoleLabel(role: DataSubjectAccessPrivacyContactRole): string {
  if (role === 'data_protection_officer') return 'Datenschutzbeauftragte*r';
  if (role === 'responsible_entity') return 'verantwortliche Stelle / Datenschutzkontakt';
  return 'nicht festgelegt';
}

export function buildDataSubjectAccessReadiness(input: DataSubjectAccessRequestInput): DataSubjectAccessReadiness {
  const warnings: string[] = [];
  const nextActions: string[] = [];
  const prefill = input.prefill;
  if (!input.requesterName.trim()) {
    warnings.push('Die anfragende Person ist noch nicht benannt.');
    nextActions.push('Person oder Namen der anfragenden Person erfassen.');
  }
  if (!input.subjectPersonId && (prefill?.persons.length ?? 0) !== 1) {
    warnings.push('Der konkrete Personenbezug ist noch nicht eindeutig.');
    nextActions.push('Betroffene Person auswählen oder Suchangaben schärfen.');
  }
  if (!input.requestForwardedAt.trim()) {
    warnings.push('Die Weiterleitung an Datenschutzkontakt/verantwortliche Stelle ist noch nicht dokumentiert.');
    nextActions.push('Weiterleitung oder zuständige Stelle dokumentieren.');
  }
  if (!prefill) {
    warnings.push('Die SBV-Dateninventur wurde noch nicht ausgeführt.');
    nextActions.push('Dateninventur aus Gremia.SBV starten.');
  }
  if ((prefill?.reviewItems.length ?? 0) > 0 && !input.sbvReviewCompleted) {
    warnings.push('Es gibt prüfpflichtige Fundstellen ohne dokumentierte SBV-Prüfung.');
    nextActions.push('Freitexte, Dokumente und Drittpersonenbezüge prüfen und Schwärzungsbedarf dokumentieren.');
  }
  if (!input.sbvReviewCompleted) {
    warnings.push('Die SBV-Zuarbeit ist noch nicht als geprüft markiert.');
    nextActions.push('SBV-Prüfung abschließen, bevor eine Übergabeunterlage erzeugt wird.');
  }
  return {
    ready: warnings.length === 0,
    warnings,
    nextActions: Array.from(new Set(nextActions)),
  };
}

export function countPrefillRecords(prefill: DataSubjectAccessPrefill | undefined): number {
  if (!prefill) return 0;
  return prefill.persons.length +
    prefill.cases.length +
    prefill.deadlines.length +
    prefill.measures.length +
    prefill.importRuns.length +
    prefill.lifecycleEvents.length +
    prefill.freeTextMatches.length;
}
