# Datenschutzkonzept Gremia.SBV

## Grundsatz

Gremia.SBV ist ein lokales Arbeitsmittel der Schwerbehindertenvertretung. Es unterstützt eine datensparsame, zweckgebundene und nachvollziehbare Verarbeitung besonders sensibler Beschäftigtendaten.

## Rollen und Verantwortung

Die App selbst ist kein Verantwortlicher im Sinne der DSGVO. Verantwortlichkeit, Datenschutzinformation, Berechtigungskonzept und Freigabe liegen organisatorisch bei der verantwortlichen Stelle. Die SBV nutzt die Anwendung zur Aufgabenwahrnehmung. Technische Administration darf grundsätzlich keine Fallakteninhalte lesen.

## Datenminimierung

- Kein GdB-Standardfeld im Personenverzeichnis.
- Keine Diagnosen als Stammdaten.
- Personalnummer optional.
- Anonyme Beratungsanfrage ohne Direktidentifikatoren möglich.
- Importprofile speichern Mapping, nicht Rohdateien.
- iCal-Standardexport enthält nur Prozesstypen.

## Personenverzeichnis

Das Personenverzeichnis dient der SBV-Arbeitssteuerung, Beteiligungsprüfung, Statusablaufwarnung und Fallaktenbindung. Schutzstatus, Statusgültigkeit, Beschäftigungsstatus und Fallaktenbezug werden verarbeitet, soweit dies für die SBV-Aufgabe erforderlich ist.

## Fallakten und Lifecycle

Reguläre Fallakten werden an eine Person gebunden. Bei Statusablauf, Beschäftigungsende, Anonymisierung oder Löschung entsteht eine Datenschutzprüfung. Fortspeicherung benötigt Grund und erneuten Prüftermin. Freitexte werden nicht automatisch anonymisiert, sondern prüfpflichtig markiert. Die bestätigte Fall-Anonymisierung entfernt zugehörige Dokumentdateien, Dokumentmetadaten, Dokument-Volltexttreffer und Suchindexverweise, damit keine de-referenzierten Dokumentcontainer im lokalen Speicher verbleiben.

## Rechtsgrundlagen

Zu dokumentieren sind insbesondere:

- Art. 6 Abs. 1 lit. c DSGVO,
- Art. 9 Abs. 2 lit. b DSGVO,
- § 26 Abs. 3 BDSG,
- § 163 SGB IX,
- § 164 Abs. 4 SGB IX,
- § 178 Abs. 1 SGB IX,
- § 178 Abs. 2 Satz 1 SGB IX.

## Information der Beschäftigten

Die Anwendung versendet keine eigenständigen Informationen nach Art. 13/14 DSGVO. Die Information der Beschäftigten ist organisatorisch über Arbeitgeber, Datenschutzinformation oder verantwortliche Stelle sicherzustellen. Als Arbeitshilfe stellt Gremia.SBV eine anpassbare Vorlage `DATENSCHUTZINFORMATION_ART_13_14_TEMPLATE.md` bereit und macht diese zusätzlich im Compliance Center abrufbar.



## Audit-Hinweis bei Löschung und Anonymisierung

Bei destruktiven Datenschutzaktionen weist die Anwendung darauf hin, dass Sicherheitseinträge im Audit-Log aus Integritätsgründen erhalten bleiben. Diese Audit-Einträge enthalten keine Direktidentifikatoren wie Name, E-Mail oder Personalnummer. Der Hinweis verhindert, dass Nutzerinnen und Nutzer eine Löschung oder Anonymisierung als vollständige Entfernung auch der manipulationsgeschützten Sicherheitskette missverstehen.

## Gremia.BR-Lesebrücke und Cache-Speicherbegrenzung

Die optionale Gremia.BR-Anbindung bleibt eine manuell ausgelöste Read-only-Lesebrücke. Abgerufene BR-Kontextdaten werden nicht in SBV-Fallakten importiert. Der lokale Lesecache ist technisch auf 30 Tage begrenzt und wird bei deaktivierter Anbindung bzw. beim Löschen der Zugangsdaten geleert. Damit dient der Cache nur der kurzfristigen Arbeitsunterstützung und nicht der dauerhaften Aufbewahrung von Betriebsratsdaten im SBV-Vault.

## Fallübergabe / Vertretung

Für Urlaubsvertretung, Krankheit, Amtswechsel oder Nachfolge kann die SBV einzelne Fallakten mit erforderlichen zugehörigen Inhalten als verschlüsseltes Übergabepaket exportieren. Diese Funktion ist selektiv und zweckgebunden. Sie ersetzt kein Backup und keine Synchronisation.

Abgelaufene Übergabepakete dürfen nicht importiert werden. Bereits importierte Übergabedaten werden nach Ablauf der Vertretungszeit als abgelaufen markiert. Eine weitere Bearbeitung erfordert eine bewusste Bestätigung mit Begründung. Export, Import und Fortführung nach Ablauf werden ohne Personennamen, Diagnosen, Falltitel, Dokumentnamen oder Freitexte auditiert.

## Auskunft nach Art. 15 DSGVO

Mit dem Personenverzeichnis unterstützt die App Auskunftsfähigkeit: verknüpfte Fallakten, Fristen, Maßnahmen, Importläufe und Lifecycle-Ereignisse sind auffindbar. Im Compliance Center kann eine Antwort auf ein Art.-15-Auskunftsersuchen aus Personen-, Fallakten-, Fristen-, Maßnahmen-, Import- und Lifecycle-Daten vorbefüllt, erzeugt und als Markdown oder PDF exportiert werden. Dieser Export ist ein Arbeitsentwurf; Identitätsprüfung, Drittdatenprüfung, Schwärzung und rechtliche Freigabe bleiben organisatorische Schritte.
