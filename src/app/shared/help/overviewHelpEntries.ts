import type { HelpRegistryEntry } from './helpRegistry';

export const OVERVIEW_HELP_ENTRIES = {
  'persons.overview': {
    id: 'persons.overview',
    kicker: 'Personenverzeichnis',
    title: 'Schutzstatus datensparsam führen',
    summary: 'Die Personenansicht ist das führende Verzeichnis für bestätigte oder zu prüfende SBV-Schutzstatus.',
    blocks: [
      { type: 'paragraph', text: 'Erfasst werden nur Angaben, die für SBV-Prüfpflichten, Anhörungen, Fristen und Verfahren erforderlich sind. GdB-Werte gehören nicht in das Verzeichnis.' },
      { type: 'paragraph', text: 'Die Kennzahlen zeigen den Arbeitsbestand: bestätigte Schwerbehinderung, Gleichstellung, prüfbedürftige Status und ausgeschiedene Personen.' },
    ],
  },
  'cases.overview': {
    id: 'cases.overview',
    kicker: 'Fallakte',
    title: 'Fallakte als Arbeitszentrum',
    summary: 'Die Fallakte bündelt Maßnahmen, Notizen, Dokumente und Fristen zu einem konkreten SBV-Vorgang.',
    blocks: [
      { type: 'paragraph', text: 'Eigenständige Fälle entstehen oben über die Kopfzeile. Maßnahmen, Fristen, Dokumente und Notizen werden anschließend im Kontext der ausgewählten Fallakte ergänzt.' },
      { type: 'paragraph', text: 'Der Fallbaum zeigt die fachliche Struktur. Er ist der Einstieg in Maßnahmen, Dokumente, Notizen und Datenschutzprüfungen.' },
    ],
  },
  'deadlines.overview': {
    id: 'deadlines.overview',
    kicker: 'Fristen',
    title: 'Fristen und Wiedervorlagen steuern',
    summary: 'Fristen sind Arbeitsobjekte: öffnen, verlängern, bearbeiten oder erledigen.',
    blocks: [
      { type: 'paragraph', text: 'Fristen dürfen fallfrei sein, wenn sie eine allgemeine SBV-Aufgabe betreffen. Fall- oder Maßnahmenfristen führen direkt zum fachlichen Kontext.' },
      { type: 'paragraph', text: 'Eine Verlängerung braucht eine Begründung, damit die Änderung nachvollziehbar bleibt.' },
    ],
  },
  'templates.overview': {
    id: 'templates.overview',
    kicker: 'Vorlagen',
    title: 'Schreiben mit Platzhaltern',
    summary: 'Vorlagen liefern wiederverwendbare Texte, die erst im fachlichen Kontext mit Daten gefüllt werden.',
    blocks: [
      { type: 'paragraph', text: 'Platzhalter werden zentral validiert. Fehlende Pflichtwerte müssen vor der Dokumenterzeugung verständlich angezeigt werden.' },
      { type: 'paragraph', text: 'Vorlagen ersetzen keine Fallakte; sie erzeugen Schreiben oder Dokumente aus bereits geprüften Fachdaten.' },
    ],
  },
  'knowledge.overview': {
    id: 'knowledge.overview',
    kicker: 'Wissen',
    title: 'Normen und Arbeitshilfen',
    summary: 'Der Wissensbereich unterstützt Einordnung und Verknüpfung, trifft aber keine automatische Rechtsentscheidung.',
    blocks: [
      { type: 'paragraph', text: 'Normen, Hinweise und eigene Kommentare können mit Fallakten verknüpft werden. Die fachliche Bearbeitung bleibt in der Fallakte.' },
    ],
  },
  'contacts.overview': {
    id: 'contacts.overview',
    kicker: 'Kontakte',
    title: 'Ansprechstellen datensparsam führen',
    summary: 'Kontakte unterstützen Fallarbeit und Protokolle, sind aber kein allgemeines Adressbuch.',
    blocks: [
      { type: 'paragraph', text: 'Erfasst werden nur Kontakte mit SBV-Arbeitsbezug, etwa Integrationsamt, Betriebsarzt, Arbeitgeberstellen oder Beratungsstellen.' },
      { type: 'paragraph', text: 'Beim Löschen werden bekannte Textbezüge datenschutzbewusst anonymisiert.' },
    ],
  },
  'equalization.overview': {
    id: 'equalization.overview',
    kicker: 'Gleichstellung / GdB',
    title: 'Antrag und Status aus Fallakten steuern',
    summary: 'Die Übersicht zeigt Beratungs-, Antrags-, Bescheid- und Widerspruchsstände; bearbeitet wird im Fall.',
    blocks: [
      { type: 'paragraph', text: 'Eine Erstanlage erzeugt sichtbar Person, Fallakte und Verfahren. Danach führt die Übersicht direkt in den betroffenen Fallaktenbereich.' },
      { type: 'paragraph', text: 'Wichtig sind Antragseinreichung, Geschäftszeichen, Bescheidzugang und Widerspruchsfrist; GdB-Werte selbst werden nicht im Personenverzeichnis geführt.' },
    ],
  },
  'reports.overview': {
    id: 'reports.overview',
    kicker: 'Berichte',
    title: 'Berichte zielgerichtet erzeugen',
    summary: 'Berichte werden als verschlüsselte PDF-Container erzeugt und nach Zweck und Vertraulichkeit eingeordnet.',
    blocks: [
      { type: 'paragraph', text: 'Tätigkeitsberichte sind anonymisiert zu verwenden. Datenschutz- und Systemberichte bleiben interne Prüfunterlagen.' },
      { type: 'paragraph', text: 'Beim Öffnen entsteht nur eine temporäre Arbeitskopie, die vom Sicherheitsmodul verwaltet wird.' },
    ],
  },
  'compliance.overview': {
    id: 'compliance.overview',
    kicker: 'Compliance',
    title: 'Sicherheit, Datenschutz und Betroffenenrechte',
    summary: 'Das Compliance Center bündelt technische Prüfungen, Vorfälle, Unterlagen und DSGVO-Auskunft.',
    blocks: [
      { type: 'paragraph', text: 'Technische Prüfungen und interne Unterlagen dienen der SBV-Dokumentation. Auskunftsersuchen werden personenbezogen vorbereitet und bleiben organisatorisch zu prüfen.' },
    ],
  },
  'privacyReview.overview': {
    id: 'privacyReview.overview',
    kicker: 'Datenschutzprüfung',
    title: 'Lösch- und Aufbewahrungsprüfung',
    summary: 'Die Ansicht zeigt fällige Prüfaufträge, führt aber keine automatische Löschung aus.',
    blocks: [
      { type: 'paragraph', text: 'Jeder Eintrag führt in den zuständigen Arbeitsbereich oder zur betroffenen Fallaktenstelle. Die Entscheidung wird dort fachlich getroffen.' },
      { type: 'paragraph', text: 'Technisch sicher bereinigbare Artefakte werden von der Software behandelt; Nutzende bekommen keine unsinnigen Aufräumaufträge.' },
    ],
  },
  'settings.overview': {
    id: 'settings.overview',
    kicker: 'Einstellungen',
    title: 'Lokale Konfiguration',
    summary: 'Einstellungen gelten nur für diese Gremia.SBV-Installation und sind nach fachlichen Bereichen getrennt.',
    blocks: [
      { type: 'paragraph', text: 'Sicherheits-, Datenschutz-, Übergabe-, Vorlagen- und Gremia.BR-Einstellungen werden getrennt geführt, damit kritische Wirkungen nicht nebenbei geändert werden.' },
    ],
  },
  'sbvOffice.overview': {
    id: 'sbvOffice.overview',
    kicker: 'SBV-Dokumentation',
    title: 'Übergreifende SBV-Dokumentation',
    summary: 'Dieser Bereich dokumentiert Sitzungen, Nachweise, Protokolle und Arbeitgeberpflichten ohne Fallakten zu ersetzen.',
    blocks: [
      { type: 'paragraph', text: 'Fallbezogene Beratung und Maßnahmen gehören in die Fallakte. Übergreifende Nachweise und Gremienarbeit bleiben hier gebündelt.' },
    ],
  },
  'bem.overview': {
    id: 'bem.overview',
    kicker: 'BEM',
    title: 'BEM-Übersicht',
    summary: 'Die Übersicht zeigt fallbezogene BEM-Verfahren und öffnet den jeweiligen Vorgang in der Fallakte.',
    blocks: [
      { type: 'paragraph', text: 'Neue BEM-Verfahren werden in der Fallakte angelegt, damit der Fallbezug eindeutig bleibt. Die Übersicht dient nur der Nachhaltung und Navigation.' },
    ],
  },
  'prevention.overview': {
    id: 'prevention.overview',
    kicker: 'Prävention',
    title: 'Präventionsübersicht',
    summary: 'Die Übersicht bündelt fallbezogene Präventionsverfahren und öffnet den jeweiligen Vorgang in der Fallakte.',
    blocks: [
      { type: 'paragraph', text: 'Die Bearbeitung bleibt in der Fallakte. Die Übersicht zeigt Status, Fristen und Risiken, damit offene Verfahren nicht untergehen.' },
    ],
  },
  'termination.overview': {
    id: 'termination.overview',
    kicker: 'Kündigungsanhörung',
    title: 'Anhörung und Schutzprüfung steuern',
    summary: 'Die Übersicht zeigt laufende Kündigungsanhörungen; die Bearbeitung bleibt im Fall.',
    blocks: [
      { type: 'paragraph', text: 'Im Mittelpunkt stehen Eingangsdatum, Frist, Schutzstatus, Integrationsamt und die SBV-Stellungnahme. Offene oder überfällige Anhörungen führen direkt in die Fallakte.' },
    ],
  },
} as const satisfies Record<string, HelpRegistryEntry>;
