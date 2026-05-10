export function stepELegalBasesSection(): string {
  return `## Rechtsgrundlagen Personenverzeichnis und Fallaktenbindung

- Art. 6 Abs. 1 lit. c DSGVO – Verarbeitung zur Erfüllung gesetzlicher Pflichten der Interessenvertretung und des Arbeitgebers.
- Art. 9 Abs. 2 lit. b DSGVO – Verarbeitung besonderer Kategorien personenbezogener Daten im Arbeits- und Sozialschutzrecht.
- § 26 Abs. 3 BDSG – Beschäftigtendaten besonderer Kategorien, soweit für Rechte und Pflichten aus Arbeitsrecht, sozialer Sicherheit und Sozialschutz erforderlich.
- § 163 SGB IX – Arbeitgeberverzeichnis, Anzeige- und Nachweispflichten im Zusammenhang mit schwerbehinderten und gleichgestellten Beschäftigten.
- § 164 Abs. 4 SGB IX – Anspruch auf behinderungsgerechte Beschäftigung, Arbeitsplatzgestaltung, Arbeitsorganisation, Arbeitszeit und technische Arbeitshilfen.
- § 178 Abs. 1 SGB IX – Förderungs- und Überwachungsauftrag der Schwerbehindertenvertretung.
- § 178 Abs. 2 Satz 1 SGB IX – rechtzeitige und umfassende Unterrichtung und Anhörung der Schwerbehindertenvertretung.
`;
}

export function personDirectoryProcessingActivitySection(): string {
  return `## Verarbeitungstätigkeit: Personenverzeichnis schwerbehinderter und gleichgestellter Beschäftigter

**Zwecke:** SBV-Aufgabenwahrnehmung, Beteiligungsprüfung, Fristensteuerung, Statusablaufprüfung, Fallaktenbindung, Datenschutzprüfung und Vorbereitung strukturierter Auskunftsfähigkeit.

**Datenkategorien:** Vorname, Nachname, dienstliche Kontaktdaten, optional Personalnummer, Schutzstatus, Statusgültigkeit, Beschäftigungsstatus, Beschäftigungsende, Fallaktenbezug, Lifecycle-Events und Datenschutz-Prüfstatus.

**Nicht als Standarddaten gespeichert:** genauer GdB, Diagnosen, Krankheitsursachen und private Gesundheitsdetails. Solche Inhalte gehören nur in zweckgebundene Fallnotizen, wenn sie für die konkrete SBV-Aufgabe erforderlich sind.

**Anonyme Beratung:** Anonyme Erstberatung wird nicht als freie Fallakte geführt, sondern als pseudonymer Personenstamm ohne Namen, E-Mail-Adresse, Personalnummer oder identifizierenden Organisationsbereich.
`;
}

export function informationAndAccessRightsSection(): string {
  return `## Art. 13/14 und Art. 15 DSGVO

**Art. 13/14 DSGVO:** Die Information der Beschäftigten ist organisatorisch durch den Arbeitgeber beziehungsweise die verantwortliche Stelle sicherzustellen. Gremia.SBV erzeugt hierfür Dokumentations- und Nachweisbausteine, versendet aber keine eigenständigen Datenschutzinformationen an Beschäftigte.

**Art. 15 DSGVO:** Gremia.SBV bereitet strukturierte Auskunftsfähigkeit vor. Auskünfte müssen Fallakten, Personenstammdaten, Fristen, Dokumentverweise, Lifecycle- und Datenschutz-Prüfentscheidungen auffindbar machen. Vor Herausgabe sind Drittdaten, Vertraulichkeit der SBV-Arbeit und schutzwürdige Interessen gesondert zu prüfen.
`;
}

export function auditHashChainDecisionSection(): string {
  return `## Audit-Hash-Kette ohne Direktidentifikatoren

Audit-Einträge dienen Integrität und Nachvollziehbarkeit. Sie dürfen keine Namen, E-Mail-Adressen, Personalnummern, Diagnosen oder Fallnotizen enthalten. Zulässig sind UUIDs, action, purpose, caseId, subjectId und timestamp.

Bei Löschung oder Anonymisierung bleiben Audit-Einträge hash-kettenstabil erhalten. Ohne die gelöschten oder anonymisierten Fachdaten sind sie nicht mehr direkt identifizierend. Diese Architekturentscheidung verhindert, dass Art.-17-DSGVO-Löschpflichten die Integritätskette zerstören müssen.
`;
}

export function sqlCipherDecisionSection(): string {
  return `## SQLCipher-Entscheidung und Feldverschlüsselung

Strukturierte Personenstammdaten werden im Ruhezustand durch SQLCipher geschützt. Eine zusätzliche Feldverschlüsselung von Namen wird in 0.9.1 bewusst nicht eingeführt, weil Suche, Sortierung, Importabgleich und Dublettenprüfung sonst erheblich eingeschränkt würden.

Die Entscheidung ist verhältnismäßig, solange starke Passphrase, lokaler Offline-first-Betrieb, Exportkontrolle, Backup-Schutz, Zugriffsbeschränkung und Audit-Härtung eingehalten werden. Besonders sensible Freitexte mit Gesundheitsbezug bleiben nach der bestehenden Strategie besonders geschützt und werden bei Zweckfortfall im Datenschutz-Lifecycle geprüft.
`;
}
