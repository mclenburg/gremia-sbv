# Datenschutz- und Sicherheitskonzept

Gremia.SBV verarbeitet besonders schutzwürdige Informationen aus der Arbeit der Schwerbehindertenvertretung. Dazu können Gesundheitsdaten, Angaben zu Behinderung, Gleichstellung, Arbeitsplatzproblemen, Kündigungsrisiken, BEM-Verläufen und vertraulichen Gesprächen gehören.

## Grundsatz

SBV-Daten bleiben lokal im verschlüsselten Gremia.SBV-Vault. Es gibt keine Cloudpflicht, keine Telemetrie und keine Hintergrundsynchronisation.

## Datenhaltung

- Fach- und Konfigurationsdaten liegen im SQLCipher-Vault.
- Dokumente werden lokal im geschützten Dokumentenbereich abgelegt.
- Suchindex, OCR-Texte und extrahierte Dokumenttexte gelten ebenfalls als sensible Daten.
- Zugangsdaten für optionale Integrationen werden nicht in localStorage gespeichert.

## Keine zusätzliche Feldverschlüsselung für Stammdaten

Gremia.SBV nutzt SQLCipher als zentrale Verschlüsselungsschicht für den lokalen Vault. Eine zusätzliche Feldverschlüsselung für strukturierte Stammdaten wird bewusst nicht als Standard eingeführt, weil Suchindex, Migrationen, Barrierefreiheit, Wiederherstellung und Wartbarkeit dadurch erheblich erschwert würden.

Für Transportvorgänge außerhalb des Vaults gelten strengere Regeln: Übergabepakete werden separat verschlüsselt und dürfen nicht als Klartext weitergegeben werden.

## Suchindex

Der Suchindex enthält kopierte Textinhalte aus Fallakten, Notizen, Dokumenten, OCR-Ergebnissen und Prozessmodulen. Deshalb gilt:

- Indexdaten liegen nur im verschlüsselten Vault.
- Anonymisierung rebuildet oder löscht betroffene Indexeinträge; Dokument- und OCR-Treffer der anonymisierten Fallakte werden entfernt.
- Falllöschung entfernt Indexeinträge vollständig.
- Dokumentlöschung entfernt Dokument- und OCR-Treffer.
- Suchbegriffe werden nicht in Audit-Logs geschrieben.

## Dokumente und OCR

Dokumenttext-Extraktion erfolgt lokal. OCR ist optional und darf den Upload-Workflow nicht blockieren. Wird OCR genutzt, muss sie lokal laufen; Cloud-Dienste sind ausgeschlossen.

OCR-Treffer werden als maschinell erkannte Inhalte gekennzeichnet, weil OCR fehleranfällig sein kann. Wird eine Fallakte anonymisiert, löscht Gremia.SBV die zugehörigen verschlüsselten Dokumentcontainer aus dem Fall-Dokumentordner sowie die Dokumentmetadaten im Vault. Dadurch bleiben nach der Anonymisierung keine verwaisten Falldokumente ohne zuordenbare Metadaten zurück.

## Fallübergabe / Vertretung

Fallübergaben verlassen den lokalen Vault als verschlüsseltes Transportpaket. Die Funktion ist für selektive Vertretung gedacht, nicht für Backup, Synchronisation oder gemeinsame Datenhaltung.

Regeln:

- nur ausgewählte Fallakten und erforderliche Inhalte exportieren,
- Transport-Passphrase getrennt von der Datei übermitteln,
- abgelaufene Übergabepakete nicht importieren,
- importierte Übergabedaten nach Ablauf der Vertretungszeit markieren,
- weitere Bearbeitung abgelaufener Übergabedaten nur nach begründeter Bestätigung,
- Export und Import ohne personenbezogene Inhalte auditieren.

## Gremia.BR-Lesebrücke

Die Gremia.BR-Anbindung dient ausschließlich der Zusammenarbeit zwischen BR und SBV. Sie ist optional und standardmäßig deaktiviert. Die Schnittstelle ist als Read-only-Lesebrücke ausgelegt und erlaubt keine Schreibzugriffe von Gremia.SBV nach Gremia.BR.

Regeln:

- keine automatische Synchronisation,
- keine Hintergrundabfragen,
- kein Rückschreiben nach Gremia.BR,
- keine Übermittlung von SBV-Falldaten,
- nur explizit ausgelöste lesende Zugriffe,
- harte Endpunkt-Whitelist,
- JWT bevorzugt nur im Arbeitsspeicher,
- Zugangsdaten im SQLCipher-Vault,
- lokaler Gremia.BR-Lesecache mit fester 30-Tage-TTL und automatischem Leeren bei deaktivierter Anbindung,
- Audit nur über Aktion, Zeitpunkt, Endpunkt und Ergebnis – nicht über Inhalte, Query-Werte oder Suchbegriffe.

## Audit

Audit-Einträge sollen Nachvollziehbarkeit schaffen, ohne selbst zum Datenschutzproblem zu werden. Deshalb werden keine Passwörter, Tokens, Suchbegriffe, Dokumentinhalte, Diagnosen, Personennamen oder Falltitel protokolliert. Bei Lösch- und Anonymisierungsvorgängen zeigt die Oberfläche einen Hinweis, dass Sicherheitseinträge im Audit-Log ohne Direktidentifikatoren erhalten bleiben.

## Barrierefreiheit als Sicherheitsmerkmal

Verlässliche Rückmeldungen sind Teil sicherer Bedienung. Speichern, Löschen, Verbindungstests, Suche, Import und Fehler müssen sichtbar und für Screenreader wahrnehmbar sein.

## Öffentliche Repository-Linie

Auch als Open-Source-Projekt bleibt die Referenzlinie von Gremia.SBV:

- offline-first,
- lokale Verschlüsselung,
- keine versteckten Datenflüsse,
- keine automatische Kopplung mit Gremia.BR,
- keine Vermischung von BR- und SBV-Akten.

## Übergreifende SBV-Steuerungsprotokolle

Übergreifende Protokolle in der SBV-Steuerung sind für Gespräche mit Arbeitgeber oder Betriebsrat vorgesehen, die keinem Einzelfall zugeordnet werden können. Beispiele sind betriebliche Regelungen, Anpassungen der Inklusionsvereinbarung, Barrierefreiheit, Verfahrensabsprachen oder strukturelle Beteiligungsfragen.

Die Protokolle sind keine Ersatz-Fallakten. Sie sollen keine Diagnosen, ärztlichen Unterlagen oder personenbezogenen Einzelfalldetails enthalten. Die Anwendung trennt sie deshalb technisch von Fallakten und Fallnotizen. Audit-Einträge zu diesen Protokollen enthalten keine Protokollinhalte, sondern nur Metadaten zur Aktion, Themenkategorie und zum Status.
