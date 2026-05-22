# Datenschutz- und Sicherheitskonzept

Gremia.SBV verarbeitet besonders schutzwürdige Informationen aus der Arbeit der Schwerbehindertenvertretung. Dazu können Gesundheitsdaten, Angaben zu Behinderung, Gleichstellung, Arbeitsplatzproblemen, Kündigungsrisiken, BEM-Verläufen und vertraulichen Gesprächen gehören.

## Grundsatz

SBV-Daten bleiben lokal im verschlüsselten Gremia.SBV-Vault. Es gibt keine Cloudpflicht, keine Telemetrie und keine Hintergrundsynchronisation.

## Datenhaltung

- Fach- und Konfigurationsdaten liegen im SQLCipher-Vault.
- Dokumente werden lokal im geschützten Dokumentenbereich abgelegt.
- Suchindex, OCR-Texte und extrahierte Dokumenttexte gelten ebenfalls als sensible Daten.
- Zugangsdaten für optionale Integrationen werden nicht in localStorage gespeichert.

## Keine zusätzliche Feldverschlüsselung

Gremia.SBV nutzt SQLCipher als zentrale Verschlüsselungsschicht für den lokalen Vault. Eine zusätzliche Feldverschlüsselung innerhalb der Fachdatensätze wird bewusst nicht eingeführt, weil sie Suchindex, Migrationen, Barrierefreiheit, Wiederherstellung und Wartbarkeit unnötig verkomplizieren würde. Der Schutz wird stattdessen über den verschlüsselten Vault, klare Zugriffspfade, Datenminimierung, Audit und sichere Lösch-/Anonymisierungspfade erreicht.

## Suchindex

Der Suchindex enthält kopierte Textinhalte aus Fallakten, Notizen, Dokumenten, OCR-Ergebnissen und Prozessmodulen. Deshalb gilt:

- Indexdaten liegen nur im verschlüsselten Vault.
- Anonymisierung rebuildet oder löscht betroffene Indexeinträge.
- Falllöschung entfernt Indexeinträge vollständig.
- Dokumentlöschung entfernt Dokument- und OCR-Treffer.
- Suchbegriffe werden nicht in Audit-Logs geschrieben.

## Dokumente und OCR

Dokumenttext-Extraktion erfolgt lokal. OCR ist optional und darf den Upload-Workflow nicht blockieren. Wird OCR genutzt, muss sie lokal laufen; Cloud-Dienste sind ausgeschlossen.

OCR-Treffer werden als maschinell erkannte Inhalte gekennzeichnet, weil OCR fehleranfällig sein kann.

## Gremia.BR-Lesebrücke

Die Gremia.BR-Anbindung dient ausschließlich der Zusammenarbeit zwischen BR und SBV. Sie ist optional und standardmäßig deaktiviert. Die Schnittstelle ist als Read-only-Lesebrücke ausgelegt und erlaubt keine Schreibzugriffe von Gremia.SBV nach Gremia.BR.

Regeln:

- keine automatische Synchronisation,
- keine Hintergrundabfragen,
- keine Hintergrundsynchronisation,
- kein Rückschreiben nach Gremia.BR,
- keine Übermittlung von SBV-Falldaten,
- nur explizit ausgelöste lesende Zugriffe,
- harte Endpunkt-Whitelist,
- JWT bevorzugt nur im Arbeitsspeicher,
- Zugangsdaten im SQLCipher-Vault,
- Audit nur über Aktion, Zeitpunkt und Ergebnis – nicht über Inhalte oder Suchbegriffe.

## Audit

Audit-Einträge sollen Nachvollziehbarkeit schaffen, ohne selbst zum Datenschutzproblem zu werden. Deshalb werden keine Passwörter, Tokens, Suchbegriffe, Dokumentinhalte oder Gesundheitsinformationen protokolliert.

## Barrierefreiheit als Sicherheitsmerkmal

Verlässliche Rückmeldungen sind Teil sicherer Bedienung. Speichern, Löschen, Verbindungstests, Suche, Import und Fehler müssen sichtbar und für Screenreader wahrnehmbar sein.

## Öffentliche Repository-Linie

Auch als Open-Source-Projekt bleibt die Referenzlinie von Gremia.SBV:

- offline-first,
- lokale Verschlüsselung,
- keine versteckten Datenflüsse,
- keine automatische Kopplung mit Gremia.BR,
- keine Vermischung von BR- und SBV-Akten.
