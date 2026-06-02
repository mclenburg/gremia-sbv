# Sicherheitskonzept Gremia.SBV

## Ziel

Gremia.SBV verarbeitet hochsensible Informationen aus der SBV-Arbeit. Dazu können Gesundheitsdaten, Angaben zu Schwerbehinderung, Gleichstellung, BEM, Kündigungen, Konflikten, Arbeitsplatzanpassungen und anwaltlichen Verfahren gehören.

Die Anwendung unterstützt Vertraulichkeit, Integrität, Datensparsamkeit und lokale Kontrolle.

## Grundregeln

1. Keine Cloud-Synchronisierung.
2. Keine Telemetrie.
3. Keine externen Fonts/CDNs.
4. Keine automatischen Netzwerkzugriffe.
5. Keine Arbeitgeber- oder BR-Benutzerkonten.
6. Keine automatische Weitergabe an Gremia.BR.
7. Export nur bewusst und protokolliert.
8. Audit-Log ohne Direktidentifikatoren.

## Verschlüsselung

### Datenbank

Die lokale Datenbank wird SQLCipher-kompatibel verschlüsselt. Die Plattformintegration wird über Build-/Readiness-Prüfungen für Electron, SQLCipher-kompatible native Abhängigkeiten und die unterstützten Zielplattformen abgesichert.

Strukturierte Personenstammdaten wie Name und dienstliche E-Mail liegen innerhalb der verschlüsselten Datenbank. Eine zusätzliche Feldverschlüsselung für Namen wird nicht eingeführt, weil Suchbarkeit, Importabgleich und Datenqualität erforderlich sind und der Zusatznutzen bei lokal verschlüsselter Datenbank nicht im Verhältnis zur Komplexität steht. Freitexte mit Gesundheitsbezug folgen weiterhin den bestehenden Schutz- und Exportregeln.

### Passwort und Master-Key

Das Benutzerpasswort wird nicht direkt als Datenbankschlüssel verwendet. Der lokale Master-Key wird über eine KDF geschützt; Passwortwechsel und Backup-Strategie bleiben getrennt von der Fachdatenlogik.

## Dokumente

Dokumente werden nicht unverschlüsselt im Dateisystem abgelegt. Metadaten liegen in der Datenbank, Inhalte im verschlüsselten Dokumentenspeicher. Bei bestätigter Fall-Anonymisierung werden die zugehörigen Dokumentcontainer und Dokumentmetadaten entfernt; die reine Trennung von Metadaten und Datei gilt nicht als ausreichende Anonymisierung.

## Automatische Sperre

Die Anwendung sperrt nach Inaktivität. Beim Sperren werden Schlüssel aus dem Arbeitsspeicher entfernt, soweit technisch möglich.

## Audit-Log

Das Audit-Log ist append-only und über Hashes verkettet. Audit-Einträge enthalten keine Namen, E-Mail-Adressen, Personalnummern oder sonstigen Direktidentifikatoren. Erlaubt sind UUIDs, Aktion, Zweck, Zeitstempel und technische Entitätsbezüge. Dadurch bleibt die Hash-Kette stabil, wenn Fachdaten anonymisiert oder gelöscht werden. Destruktive Datenschutzdialoge weisen darauf hin, dass diese Sicherheitseinträge ohne Direktidentifikatoren erhalten bleiben.

## Export und iCal

Exports sind bewusste lokale Aktionen. Der iCal-Export nutzt als Standard eine datensparsame Benennung nach Vorgangstyp: Termine zeigen den Prozesstyp, aber keine Personennamen, Diagnosen, Personalnummern oder Fallnotizen.

## Backups als Offline-Angriffsfläche

Backups sind eine primäre Offline-Angriffsfläche. Deshalb werden Backup-Payloads verschlüsselt und mit den aktuellen KDF-Parametern geschützt: scrypt N=131072, r=8, p=1.

## Sicherheitsfreigabe

Security, Datenschutz und Build-Artefakte werden über Tests, Qualitätsgate und Compliance Center geprüft. Die lokale Architektur ersetzt keine organisatorische Datenschutzfreigabe durch die zuständigen Stellen.
