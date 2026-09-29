# Gremia.BR-Kooperationsbrücke

Gremia.SBV kann optional mit einem Gremia.BR-Server verbunden werden. Diese Funktion ist eine **kontrollierte, manuell ausgelöste Kooperationsbrücke**. Sie ergänzt die SBV-Arbeit um BR-Kontext und ermöglicht ausdrücklich ausgelöste Übergaben in den SBV-Arbeitsbereich von Gremia.BR, ohne die getrennten Datenräume von Betriebsrat und Schwerbehindertenvertretung aufzulösen.

## Zweck

Die SBV kann gezielt BR-Informationen abrufen, die für ihre Arbeit relevant sind:

- nächste, laufende und kommende BR-Sitzungen,
- Tagesordnungspunkte mit möglichem SBV-Bezug,
- Protokollstatus und Protokollreferenzen,
- fällige oder überfällige BR-Beschlüsse,
- Beschlussstatistiken als Kontext,
- Dokument-Metadaten und Kategorien als Referenz,
- Suchvorschläge für externe BR-Referenzen.
- eigene offene Aufgaben als persönlichen Arbeitsvorrat.
- eigene noch ausstehende Zugriffsanträge.
- berechtigte Sachverhalte als flüchtige Auswahlgrundlage für verknüpfte Verfahren.

In Gremia.BR 2.0 kann die SBV außerdem bewusst Aktionen für ihren eigenen SBV-Arbeitsbereich auslösen:

- lokal erzeugte PDF-Dokumente aus Gremia.SBV an Gremia.BR übergeben,
- Fallzusammenfassungen als PDF erzeugen und im SBV-Arbeitsbereich bereitstellen,
- Themen als Tagesordnungspunkt für eine Gremia.BR-Sitzung anfordern,
- Gremia.BR-Sitzungen als lokale SBV-Arbeitskopie nach Gremia.SBV übernehmen.

## Nicht-Zweck

Die Kooperationsbrücke ist keine Synchronisation und kein gemeinsamer Datenraum.

Ausgeschlossen sind:

- Hintergrundübertragung oder automatische Synchronisation,
- beliebige Datei-Uploads außerhalb zentral erzeugter Gremia.SBV-PDF-Dokumente,
- Massentransfers vollständiger SBV-Falldaten,
- Hintergrundabfragen,
- BR-Mitgliederverwaltung,
- BR-Notizen,
- Abwesenheiten,
- Audit-Logs,
- Stimmrechtsänderungen,
- Admin- und DSGVO-Endpunkte von Gremia.BR.

## Sicherheit

- Verbindung ist standardmäßig deaktiviert.
- Server-URL und Zugangsdaten werden im SQLCipher-Vault gespeichert.
- JWT-Token werden ausschließlich im Arbeitsspeicher gehalten und nicht persistiert.
- Der Adapter nutzt eine harte Whitelist für lesende Endpunkte und ausdrücklich freigegebene SBV-Arbeitsbereichsaktionen.
- Der manuell abgerufene Remote-Arbeitsstand bleibt nur im Arbeitsspeicher. Ein fehlgeschlagener Gesamtabruf ersetzt den zuvor sichtbaren Stand nicht teilweise.
- Beim Sperren oder Zurücksetzen des lokalen Tresors werden der flüchtige Arbeitsstand und die Gremia.BR-Sitzung verworfen.
- Suchbegriffe und Antwortinhalte werden nicht auditiert.
- Jeder HTTP-Zugriff benötigt ein verfügbares lokales Audit. Vor dem Netzwerkstart wird ein datensparsamer Startsatz geschrieben; ein Ergebnissatz ergänzt Status, Dauer und dieselbe Korrelations-ID. Ist das Audit nicht verfügbar, wird kein Request gestartet.
- Dokumente werden nicht automatisch importiert oder übertragen; jede Übergabe bleibt eine bewusste Nutzeraktion.

## Neue Gremia.BR-API

Die aktuelle Gremia.BR-OpenAPI stellt zusätzliche Endpunkte für den SBV-Arbeitsbereich bereit. Gremia.SBV nutzt davon nur den fachlich passenden Ausschnitt:

- Auth: Login, Refresh, Logout, Session-/Profilprüfung,
- Sitzungen: nächste, laufende, kommende Sitzung, Tagesordnung und Protokollstatus,
- Aufgaben: eigene offene Aufgaben nach manuell ausgelöstem Gesamtabruf,
- Zugriffsanträge: eigene noch ausstehende Anträge nach demselben Gesamtabruf,
- Protokolle/Beschlüsse: Listen, Sitzungsbezug, Fälligkeiten und Statistik,
- Dokumente: Liste, Kategorien, Metadaten und HTML-Vorschau,
- Suche: Suche, Vorschläge, erweiterte Suche und Suchstatistik,
- SBV-Arbeitsbereich: PDF-Dokument übergeben, Freigabe im Zielgremium anfordern, Tagesordnungspunkt anfordern.

Nicht freigegeben bleiben insbesondere Admin, Audit, DSGVO, Notizen, Abwesenheiten, Mitgliederverwaltung, Ausschüsse, generische Uploads und alle fachlichen Schreiboperationen außerhalb der ausdrücklich modellierten SBV-Arbeitsbereichsaktionen.

## Nutzung

Die Verbindung wird unter **Einstellungen → Gremia.BR** eingerichtet. Der eigenständige Bereich **Gremia.BR** wird nur sichtbar, wenn eine Instanz konfiguriert ist. Das Dashboard zeigt nur den flüchtigen Arbeitsstand und aktualisiert diesen ausschließlich durch eine bewusste Nutzeraktion. Nach einem Neustart sind die Remote-Inhalte nicht mehr vorhanden. Bereits aus früheren Versionen persistierte Lesecache-Inhalte werden beim Datenbank-Upgrade entfernt. Wird die Anbindung deaktiviert oder werden Zugangsdaten gelöscht, wird der Arbeitsstand geleert.

**Gremia.BR aktualisieren** lädt auch die eigenen offenen Aufgaben und noch ausstehenden Zugriffsanträge in den Bereich **Offene Aktionen**. Bei Aufgaben werden nur Titel, Herkunft, Status und Fälligkeit angezeigt; Beschreibungen und Zuweisungsdetails bleiben außerhalb des lokalen Arbeitsstands. Sitzungs-, TOP- und verfahrensbezogene Aufgaben werden fachlich eingeordnet. Unbekannte Aufgabenstatus werden nicht als technische Werte angezeigt, sondern verhindern einen unvollständigen Gesamtabruf. Bei Zugriffsanträgen werden nur Ressourcenart, Status und Antragsdatum übernommen. Die Anzeige nennt den Zeitpunkt des letzten erfolgreichen Gesamtabrufs und kennzeichnet den Arbeitsstand als möglicherweise veraltete Momentaufnahme.

Der bewusste Gesamtabruf lädt außerdem die für die angemeldete Person zugänglichen Gremia.BR-Sachverhalte. In der flüchtigen Übersicht bleiben davon nur Kennzeichen, Betreff und Verfahrenskennungen; Fallbeschreibungen werden nicht übernommen. Ein unvollständiger Abruf ersetzt den vorherigen Arbeitsstand nicht.

Unter **Verknüpfte Gremia.BR-Verfahren** kann eine lokale Fallakte mit einem Verfahren aus diesem berechtigten Arbeitsstand verbunden werden. Die Auswahl nutzt Fallnummer, Remote-Kennzeichen und Betreff statt technischer Kennungen. **Verfahrensdetails laden** löst erst nach der konkreten Auswahl einen eigenen auditierten Remote-Abruf aus. Anschließend kann die Beziehung bewusst gespeichert oder aufgehoben werden. Die lokale Referenz enthält keinen Remote-Verfahrensvolltext; die Verfahrensdetails bleiben flüchtig. Ein bestehender Datenbestand wird über Schema-Migration 0060 ohne Verlust alter Referenzen erweitert.

Bei einem verknüpften Verfahren lädt **Informationsanforderungen laden** die zugängliche Liste erst nach bewusstem Klick. Die Anzeige enthält ausschließlich Status und Termine aus der aktuellen Antwort; sie wird nicht in der lokalen Fallakte oder einem Suchindex gespeichert.

Eine neue Informationsanforderung wird am verknüpften Verfahren mit fehlenden Angaben, optionaler Begründung und optionaler Antwortfrist bewusst erstellt. Die Eingabe wird weder in den allgemeinen Arbeitsstand noch in die lokale Fallakte kopiert. Nach bestätigter Erstellung bleibt die Liste unverändert, sofern sie zuvor nicht ausdrücklich geladen wurde; es erfolgt kein automatischer Remote-Abruf.

**Details** an einer eigenen Aufgabe löst erst beim Anklicken einen zusätzlichen auditierten Remote-Abruf aus. Der Main-Prozess akzeptiert dafür nur Aufgaben aus dem aktuellen eigenen Arbeitsstand. Die Antwort wird auf die für den Dialog benötigten Felder reduziert und beim Schließen aus dem UI-Zustand entfernt; sie wird weder in den Gesamtsnapshot noch in den Vault geschrieben.

Im Aufgabendialog lädt **Statusänderungen abrufen** die aktuell von Gremia.BR angebotenen Übergänge erst auf bewusste Aktion. Nur diese Werte stehen in der filterbaren Auswahl. **Statusänderung bestätigen** sendet den gewählten Zielstatus mit der zuletzt gelesenen Aufgabenversion als eigenen auditierten Request. Gremia.BR entscheidet weiterhin über Berechtigung und Zustandswechsel. Bei einem Konflikt fordert die Oberfläche dazu auf, die Details bewusst neu zu laden; der allgemeine Arbeitsstand wird nicht automatisch oder teilweise aktualisiert.

Alle Übergaben nach Gremia.BR werden im Gremia.BR-Bereich ausgelöst und geprüft. Dadurch bleibt sichtbar, welche Daten Gremia.SBV verlassen und ob Gremia.BR die Aktion angenommen, zurückgestellt oder abgelehnt hat.

## Sitzungsübernahme in die SBV-Dokumentation

Ist die Kooperationsbrücke aktiviert, kann der direkte Bereich **Sitzungen** beziehungsweise **Dokumentation → Gremien** den flüchtigen Gremia.BR-Arbeitsstand verwenden. Angezeigt werden verfügbare BR-Sitzungen; eine Aktualisierung erfolgt weiterhin nur durch eine bewusste Nutzeraktion.

Über **BR-Sitzung übernehmen** kann eine ausgewählte Sitzung in einen eigenen lokalen SBV-Sitzungsvorgang kopiert werden. Soweit vorhanden, werden Sitzungstitel, Beginn, Ort und Tagesordnungspunkte als Arbeitsgrundlage übernommen.

Die Übernahme ist bewusst keine Synchronisation:

- die importierte Sitzung ist anschließend eine eigene SBV-Arbeitskopie,
- Tagesordnungspunkte werden zunächst ohne automatisch gesetzte SBV-Relevanz angelegt,
- eigene SBV-Positionen, Beeinträchtigungsbewertungen und Nichtbeteiligungsbewertungen werden nicht aus Gremia.BR abgeleitet,
- Änderungen in Gremia.SBV werden nicht nach Gremia.BR zurückgeschrieben,
- eine erneute Cache-Aktualisierung überschreibt nicht automatisch die bereits angelegte SBV-Eigenaufzeichnung.

Damit liefert Gremia.BR organisatorischen Sitzungskontext; die fachliche SBV-Dokumentation und Bewertung bleibt im getrennten Gremia.SBV-Datenraum.

## Dokumentübergabe nach Gremia.BR

Für Übergaben nach Gremia.BR sind ausschließlich durch Gremia.SBV erzeugte PDF-Dokumente vorgesehen. Eine Fallzusammenfassung fasst den für den Betriebsrat erforderlichen Kontext zusammen, ohne Diagnosen, unnötige Gesundheitsdaten oder interne SBV-Notizen auszugeben. Der Transfer ist kein Automatismus: Die SBV wählt Dokument, Ziel und Zweck aus, löst die Übertragung aus und erhält anschließend eine nachvollziehbare Statusmeldung.
