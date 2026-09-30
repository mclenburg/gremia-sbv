# Gremia.BR-Integration: technische Dokumentation

Diese Datei beschreibt die Implementierung der Gremia.BR-Anbindung für Entwicklung, Betrieb und Prüfung. Die Bedienung steht im [Benutzerhandbuch](../handbuch/gremia-br.md). Maßgeblich ist die aktuelle Gremia.BR-OpenAPI mit Endpunkten unter `/api/v1`.

## Architektur und Datenfluss

- Der Renderer verwendet ausschließlich die typisierte Preload-Bridge. IPC-Handler validieren Eingaben und begrenzen Remote-Aktionen auf den bewusst gewählten Arbeitsstand.
- `GremiaBrAuthService` hält Token und Session-Cookie nur im Arbeitsspeicher. Serveradresse und Anmeldedaten liegen im verschlüsselten lokalen Tresor.
- `GremiaBrApiCatalog` und `GremiaBrPolicy` begrenzen die erlaubten Endpunkte. Der HTTP-Client startet einen Request nur, wenn der lokale Audit-Startsatz geschrieben werden konnte.
- Jeder Request erhält einen Audit-Start- und Ergebnissatz mit Endpunkt-Template, Ergebnis, Status, Dauer und Korrelations-ID. Suchbegriffe, konkrete Remote-IDs, Antworttexte und Zugangsdaten gehören nicht ins Audit.
- `GremiaBrCacheService` ersetzt den flüchtigen Arbeitsstand erst nach einem vollständigen, manuell ausgelösten Gesamtabruf. Ein fehlgeschlagener Abruf lässt den bisherigen Stand bestehen. Der Zeitstempel der letzten erfolgreichen Aktualisierung bleibt sichtbar.
- Beim Sperren, beim Zurücksetzen der Verbindung und beim Beenden werden Remote-Arbeitsstand und Authentifizierung verworfen. Remote-Objekte werden nicht als lokale Fachdatensätze dupliziert, sofern die SBV keine ausdrückliche lokale Übernahme auslöst.

## Lesende Arbeitsabläufe

**Gremia.BR aktualisieren** lädt in einer bewussten Aktion die eigenen offenen Aufgaben, eigenen Zugriffsanträge, berechtigten Sachverhalte und Sitzungsdaten. Die Übersicht übernimmt nur arbeitsrelevante Felder. Aufgabenbeschreibungen und Zuweisungsdetails werden erst auf eigene Detailaktion gelesen. Unbekannte Aufgabenstatus oder unvollständige Listen verhindern einen teilweisen Snapshot.

Eigene Aufgabendetails und die vom Server angebotenen Statusübergänge werden jeweils getrennt auf Klick abgerufen. Eine Statusänderung sendet Zielstatus und gelesene Version als eigene Aktion. Bei Konflikt muss die Person die Details bewusst neu laden; der Gesamtsnapshot wird nicht still aktualisiert.

Für verknüpfte Verfahren werden Remote-Sachverhalte aus dem berechtigten Arbeitsstand ausgewählt. Die lokale Referenz enthält keinen Verfahrensvolltext. Verfahrensdetails und Informationsanforderungen werden erst nach ausdrücklicher Auswahl abgerufen und bleiben flüchtig. Die lokale Verknüpfung wird in Migration 0060 eingeführt.

Die Tagesordnung einer Sitzung aus dem ausgewählten Gremium wird über `GET /api/v1/meetings/{meetingId}/agenda` und `/agenda/versions` erst auf eine eigene Aktion geladen. `itemKey` verbindet TOPs über Versionen hinweg. Die erste versandte (`sealed`) Fassung ist der Vergleichsstand; ohne solche Fassung zeigt die Oberfläche keinen behaupteten Änderungsstatus. Hinzugefügte, geänderte und entfernte TOPs werden rein informativ dargestellt, ohne rechtliche Bewertung.

Bei hybriden Sitzungen wird der Remote-Zugang ausschließlich über `GET /api/v1/meetings/{meetingId}/remote-access` auf einen eigenen Klick geladen. Der Main-Prozess akzeptiert nur eine hybride Sitzung mit vorhandenem Zugang aus dem aktuellen Arbeitsstand des ausgewählten Gremiums; Gremia.BR entscheidet über die tatsächliche Berechtigung. Der Zugang erscheint in derselben Sitzungsansicht und wird weder im Snapshot noch in der Datenbank gespeichert. Auswahlwechsel, Refresh und Verlassen der Ansicht entfernen ihn und die gezielt geladene Agenda aus dem UI-Zustand. Fehlertexte dieser Abrufe werden vor der IPC-Übertragung bereinigt.

Die Dokumentensuche sendet den Suchbegriff ausschließlich auf Klick an `/api/v1/documents/search`, eingegrenzt auf die ausdrücklich gewählte Organisation und Sicherheitsdomäne. Treffer übernehmen keine Textausschnitte oder Digests. Für ein ausgewähltes Dokument werden Detail, Versionen und Freigaben erst auf eine weitere Aktion geladen; diese Daten bleiben im flüchtigen UI-Zustand und werden beim Gesamt-Refresh verworfen.

## Schreibende Arbeitsabläufe

Eine neue eigene Aufgabe oder Informationsanforderung wird nur im Kontext eines verknüpften Verfahrens und durch eine ausdrückliche Aktion erstellt. Die Aufgabe bleibt in Gremia.BR. Für den Abschluss einer Informationsanforderung wird der aktuelle Stand im Rahmen derselben Nutzeraktion nochmals gelesen und mit der angezeigten Version verglichen.

Eine Tagesordnungspunkt-Anforderung wird an die ausgewählte Sitzung gesendet. Eine BR-Sitzung kann separat als lokale SBV-Arbeitskopie übernommen werden; Titel, Termin, Ort und Tagesordnung bilden nur eine neutrale Grundlage. Eigene SBV-Positionen und rechtliche Bewertungen werden nicht automatisch gesetzt. Spätere Remote-Aktualisierungen überschreiben die Arbeitskopie nicht.

Die Dokumentübertragung verwendet ausschließlich zentral erzeugte Gremia.SBV-PDFs. Die SBV wählt Dokument, Ziel und Zweck aus. Lokale Fallzusammenfassungen werden über die zentrale PDF-Pipeline erstellt; Diagnoseangaben und interne Notizen werden nicht in den BR-Text übernommen. Die Aktion zeigt den bestätigten Gremia.BR-Status und hält eine lokale Kontrollhistorie der Übertragung.

## Prüfung

Die Tests für die Integrationsgrenzen liegen unter `tests/features/gremia-br/`, `tests/platform/electron/` und `e2e/gremia-br-read-bridge.spec.ts`. Das projektweite Gate ist `npm run build:verify`. Browserabläufe werden mit `npm run test:e2e -- e2e/gremia-br-read-bridge.spec.ts --project=ui-flows` geprüft.
