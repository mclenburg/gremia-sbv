# Verbindliche Entwicklungsregeln für Gremia.SBV

## 1. Geltung und Verbindlichkeit

Diese Regeln gelten für jede Analyse, Planung, Implementierung, Fehlerbehebung, Prüfung und Dokumentation in Gremia.SBV. Sie sind verbindlich. Eine Ausnahme ist nur zulässig, wenn der Auftraggeber sie vor der Umsetzung ausdrücklich und konkret benennt. Implizite Ausnahmen, pragmatische Abkürzungen und nachträgliche Rechtfertigungen sind unzulässig.

Bei Widersprüchen gelten Datenschutz, Informationssicherheit, rechtliche Nachweisfunktion und Barrierefreiheit vor Komfort oder Implementierungsgeschwindigkeit. Bestehende speziellere Projektregeln bleiben ergänzend gültig.

## 2. Produktziel und fachlicher Kontext

Gremia.SBV unterstützt die vertrauliche, rechtssichere und nachvollziehbare Arbeit einer Schwerbehindertenvertretung. Jede Entscheidung muss deshalb an der Gesamtsoftware und am fachlichen Zweck des betroffenen Arbeitsablaufs ausgerichtet werden, nicht nur an einer einzelnen Maske oder einem einzelnen Ticket.

Vor jeder Änderung sind Problem, betroffene Abläufe, vorhandene Architektur, bestehende Tests und ähnliche Funktionen im gesamten Projekt zu untersuchen. Bereits vorhandene Lösungen sind wiederzuverwenden oder sinnvoll zu erweitern. Parallele Sonderlösungen, duplizierte Fachlogik und UI-Wildwuchs sind zu vermeiden. Wird ein Fehler oder Anti-Pattern gefunden, sind vergleichbare Stellen projektweit zu suchen und im fachlich zusammenhängenden Umfang ebenfalls zu korrigieren.

## 3. Architektur und Clean Code

- Der Renderer greift weder direkt auf Datenbank, Dateisystem, Betriebssystem noch Netzwerk zu. Privilegierte Vorgänge laufen über typisierte Preload-Verträge, validierte IPC-Handler und Services im Main-Prozess.
- Fachlogik gehört in Domain- oder Service-Schichten, nicht in React-Komponenten oder IPC-Handler. IPC validiert Eingaben, koordiniert und übersetzt Fehler, enthält aber keine duplizierte Fachlogik.
- Abhängigkeiten werden explizit injiziert. Zuständigkeiten müssen klein, eindeutig und testbar bleiben.
- Domänenbegriffe, Statusmodelle und Fehlertypen werden zentral definiert und einheitlich verwendet.
- Gemeinsame Komponenten und Services sind zu erweitern, wenn dieselbe Aufgabe mehrfach vorkommt. Lokale Kopien mit leicht abweichendem Verhalten sind unzulässig.
- Änderungen müssen migrationsfähig, rückwärtskompatibel und in einem bestehenden Datenbestand sicher sein. Datenmigrationen sind idempotent, plattformunabhängig, verlustfrei und mit realistischen Altbeständen zu testen.
- Fehler werden an ihrer Ursache behoben. Generische Catch-Blöcke dürfen sicherheits- oder fachlich relevante Zustände nicht vortäuschen und Fehler nicht verschlucken.

## 4. Datenschutz und Informationssicherheit

- Gremia.SBV arbeitet grundsätzlich lokal und offline. Personenbezogene und besonders schützenswerte Daten werden verschlüsselt gespeichert und nur so lange wie erforderlich im Klartext gehalten.
- Datenminimierung, Zweckbindung, Speicherbegrenzung, Vertraulichkeit und nachvollziehbare manuelle Entscheidungen sind in Datenmodell, Oberfläche und Exporten umzusetzen.
- Eine fällige Aufbewahrungs- oder Löschfrist führt niemals automatisch zur fachlichen Löschung. Die Software zeigt einen konkreten Prüfauftrag; Prüfung, Begründung, Anonymisierung und Löschung bleiben bewusste manuelle Aktionen.
- Technisch sicher automatisierbare Selbstheilung ist Aufgabe der Software. Erkannte alte Klartextartefakte im geschützten Datenbereich sind sicher in das aktuelle verschlüsselte Format zu überführen und erst nach erfolgreicher Verifikation zu entfernen. Fehler werden konkret und handlungsorientiert angezeigt.
- Rechtliche Fristen und Wiedervorlagen dürfen bewusst ohne Fall- oder Personenbezug bestehen. Ein fehlender Fallbezug ist allein weder Datenschutzverstoß noch Integritätsfehler.
- Datenschutzempfehlungen verlinken auf genau den betroffenen Vorgang. Generische Lösch- oder Anonymisierungsformulare gehören nicht in das Prüf-Cockpit. Fachliche Aktionen werden im zuständigen Modul am konkreten Datensatz ausgeführt.
- Sicherheitsanzeigen müssen den tatsächlich bestätigten Zustand wiedergeben. Bei Unsicherheit ist ein ehrlicher Fehler- oder Nicht-verfügbar-Zustand anzuzeigen.
- Audit-Einträge sind datensparsam, manipulationsnachweisbar und dürfen keine unnötigen Direktidentifikatoren enthalten.
- Temporäre Klartextdateien werden zentral verwaltet und bei Sperre sowie beim Beenden bestmöglich bereinigt.

## 5. UX, Arbeitsabläufe und Barrierefreiheit

Die Oberfläche bildet den fachlichen Arbeitsablauf ab. Sie darf Nutzende nicht mit technischen Implementierungsdetails oder Feldern belasten, die im aktuellen Status noch keinen Sinn ergeben.

- Felder und Aktionen erscheinen erst, wenn sie für den aktuellen Status oder die getroffene Auswahl logisch erforderlich sind. Progressive Offenlegung ist einem dauerhaft sichtbaren Gesamtformular vorzuziehen.
- Technische IDs werden niemals als erwartete Benutzereingabe dargestellt. Beziehungen werden über fachlich verständliche Bezeichnungen ausgewählt.
- Bis einschließlich fünf überschaubare Optionen dürfen als gewöhnliche Auswahl angeboten werden. Bei mehr als fünf potentiellen Einträgen muss die Auswahl mindestens filterbar sein. Für große oder dynamische Mengen ist eine zentrale, barrierefreie Suchauswahl beziehungsweise Combobox zu verwenden.
- Suchauswahlen müssen mit Tastatur vollständig bedienbar sein, einen eindeutigen zugänglichen Namen besitzen, Fokus und aktiven Eintrag korrekt vermitteln sowie Trefferzahl, Auswahl und Leerzustand über geeignete Live-Regionen ankündigen.
- Labels, Eingabefelder, Hinweise und Fehlermeldungen müssen mit den zentralen Form-Komponenten semantisch verbunden und visuell ausreichend getrennt sein.
- Schaltflächen müssen eine erkennbare Wirkung haben. Asynchrone Vorgänge zeigen Beschäftigung, Erfolg oder einen konkreten, sicheren und handlungsorientierten Fehler.
- Navigation aus Cockpits und Empfehlungen führt zum konkreten Datensatz und erhält den fachlichen Kontext.
- Sämtliche Funktionen sind mit Tastatur, Screenreader und Vergrößerung nutzbar. Fokusführung, Dialog-Fokusfalle, Rückgabe des Fokus, Kontraste, reduzierte Bewegung, semantische Überschriften und Live-Meldungen sind verpflichtend.
- Visuelle Gestaltung und Interaktion verwenden die zentralen Gremia-Komponenten und das einheitliche Gremia-Design.

## 6. Dokumente und PDF-Erzeugung

- Alle Dokumente werden unabhängig von Modul und Ursprung über die zentrale Dokument-Pipeline erzeugt, gespeichert, entschlüsselt, für die externe Vorschau bereitgestellt und exportiert.
- Dokumente aus Maßnahmen, Compliance, Wahlen, Versammlungen, Vorlagen und Berichten verwenden denselben Gremia-Stil, dieselben Layoutregeln, dieselbe Fehlerbehandlung und dieselben Sicherheitsmechanismen.
- Vorlagen mit Platzhaltern werden zentral validiert und mit typisierten fachlichen Daten gefüllt. Fehlende Pflichtwerte werden vor der Generierung verständlich benannt.
- PDF-Erzeugung erfolgt im Main-Prozess mit PDFKit beziehungsweise einer AGPL-3-kompatibel lizenzierten Abhängigkeit. Lizenz- und Drittanbieterhinweise bleiben korrekt.
- Unicode-Inhalte werden unverändert und vollständig wiedergegeben. Umlaute, Namen und rechtlich relevante Inhalte dürfen weder transliteriert noch stillschweigend ersetzt oder gekürzt werden.
- Wahlakten sind rechtlich relevante Nachweisdokumente. Ihre Inhalte dürfen nicht verfälscht werden; insbesondere ist jede Umlautersetzung unzulässig.
- Der Tätigkeitsbericht wird ausschließlich aus der verifizierten Audit-Chain projiziert. Andere Datenquellen oder manuell zusammenkopierte Parallelberichte sind unzulässig.
- Ein externer Öffnungsauftrag gilt als erfolgreich angenommen, sobald das Betriebssystemprogramm erfolgreich angefordert wurde. Gremia.SBV muss und kann nicht feststellen, ob das externe Programm das Dokument anschließend sichtbar darstellt.
- Fehlerphasen wie Erzeugung, verschlüsselte Ablage, Entschlüsselung, temporäre Vorschau und Export werden getrennt behandelt. Die UI erhält eine sichere, konkrete Meldung und darf einen gespeicherten Erfolg nicht wegen einer nachgelagerten Vorschau fälschlich als Fehlschlag melden.

## 7. Tests und Qualitätssicherung

- Änderungen werden testgetrieben umgesetzt: Zuerst wird das gewünschte Verhalten durch einen fehlschlagenden Test beschrieben, dann minimal implementiert und anschließend bereinigt.
- Funktionale Verhaltenstests sind zu bevorzugen. Tests gegen Quelltextfragmente, exakte Implementierungsstrings oder interne Struktur sind nur zulässig, wenn das Verhalten technisch nicht sinnvoll beobachtbar ist.
- Jeder Test ist vor Verwendung gegen den aktuellen Produktionscode zu prüfen: Setup, Vorbedingungen, Datenbankschema, Plattformannahmen und Erwartung müssen realistisch sein und eine echte Chance auf Grün besitzen.
- Fehlerpfade, Altbestände, Migrationen, Tastaturbedienung, zugängliche Namen, Fokus, Live-Meldungen und sichere Rückabwicklung werden entsprechend dem Risiko getestet.
- Dokumenttests prüfen nicht nur, dass Bytes entstanden sind, sondern zentrale Pipeline, verschlüsselte Speicherung, Lesbarkeit, Unicode-Inhalte und das fachliche Ergebnis.
- Mock-Tests dürfen reale Integrationsfehler nicht verdecken. Kritische Datenbank- und Dokumentpfade benötigen mindestens einen Test mit realem Schema beziehungsweise realistischem migriertem Bestand.
- Vor Abschluss laufen die betroffenen Unit-, Komponenten-, Integrations- und E2E-Tests sowie die projektweiten Qualitätsgates. Bestehende Tests werden vor einem Patch erneut anhand des Programmcodes plausibilisiert.

## 8. Fehlerbehandlung und Beobachtbarkeit

- Nutzermeldungen nennen den betroffenen Arbeitsschritt, den erreichten Zustand und eine mögliche nächste Handlung, ohne sensible interne Details offenzulegen.
- Interne Diagnostik enthält stabile Fehlercodes und die fehlgeschlagene Phase, aber keine personenbezogenen Inhalte, Geheimnisse oder Dokumenttexte.
- Ein teilweise erfolgreicher Ablauf wird als solcher modelliert. Bereits sicher gespeicherte Daten werden nicht als vollständig fehlgeschlagen dargestellt, nur weil ein nachgelagerter Komfortschritt scheitert.
- Keine Oberfläche darf Erfolg, Sperre, Löschung, Speicherung oder Versand behaupten, bevor der dafür maßgebliche Vorgang bestätigt wurde.

## 9. Git, Versionierung und Auslieferung

- Der `main`-Branch wird nicht verändert und muss jederzeit lauffähig bleiben. Entwicklung erfolgt auf einem separaten Arbeitsbranch im vorhandenen lokalen Repository.
- Die Version wird nur auf ausdrückliche Anweisung des Auftraggebers erhöht.
- Das Projekt befindet sich vor Version 1.0; reine Patchhistorien oder nachträgliche Änderungsdokumentationen werden nicht angelegt. Der Code und die bestehende Fachdokumentation sollen wie aus einem Guss wirken.
- Es werden keine Patch-ZIP-Dateien erzeugt, solange dies nicht erneut ausdrücklich verlangt wird.
- Änderungen werden spätestens nach einem übergebenen Patch beziehungsweise nach einem abgeschlossenen, verifizierten Umsetzungsschritt committed. Unabhängige vorhandene Änderungen des Auftraggebers bleiben unangetastet.
- Builds und Tests werden mit den für Pull Requests und Releases tatsächlich verwendeten Befehlen geprüft; Unterschiede zwischen den Buildpfaden müssen ausdrücklich abgedeckt sein.

## 10. Definition of Done

Eine Änderung ist erst abgeschlossen, wenn:

1. fachlicher Ablauf und Datenschutzwirkung korrekt sind,
2. vorhandene ähnliche Lösungen geprüft und Wildwuchs vermieden wurden,
3. Architekturgrenzen und zentrale Komponenten eingehalten werden,
4. Barrierefreiheit und UX im tatsächlichen Ablauf funktionieren,
5. Fehlerzustände ehrlich, sicher und verständlich sind,
6. Migrationen und vorhandene Datenbestände geschützt sind,
7. relevante Tests realistisch, verhaltensbasiert und grün sind,
8. die vorgesehenen Build- und Qualitätsgates grün sind,
9. keine unbeabsichtigte Versionsänderung erfolgte und
10. der Arbeitsstand nachvollziehbar committed ist.
