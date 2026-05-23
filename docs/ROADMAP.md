# Roadmap Gremia.SBV

Stand: **0.9.2**

## Produktlinie

Gremia.SBV ist eine lokale, offline-first Electron-/React-Anwendung für vertrauliche SBV-Fallarbeit. Die Anwendung soll Schwerbehindertenvertretungen dabei unterstützen, ihre gesetzlichen Aufgaben strukturiert, datensparsam und nachvollziehbar wahrzunehmen.

Die Referenzlinie bleibt:

- lokale verschlüsselte Datenhaltung,
- keine Cloudpflicht,
- keine Telemetrie,
- keine automatische Synchronisation,
- keine Vermischung von BR- und SBV-Akten,
- fachliche Bedienbarkeit für SBV-Praxis statt allgemeiner Personalaktenverwaltung.

## Aktueller Produktumfang

Im aktuellen Stand umfasst Gremia.SBV folgende Produktbereiche:

- verschlüsselte lokale Fallaktenarbeit auf SQLCipher-Basis,
- Personenverzeichnis für schwerbehinderte, gleichgestellte und ratsuchende Beschäftigte,
- anonyme Beratungsanfrage ohne Direktidentifikatoren,
- BEM-, Präventions-, Beteiligungs-, Kündigungs-, Gleichstellungs-/GdB- und Arbeitsplatzgestaltungsprozesse,
- Maßnahmen, Maßnahmennotizen, Dokumente und Volltextsuche,
- Fristen und Wiedervorlagen inklusive datensparsamer iCal-Exporte,
- Vorlagen, Berichte und Tätigkeitsnachweise,
- Compliance Center mit TOMs, VVT-Entwurf, DSFA-Entwurf, Lösch-/Aufbewahrungskonzept und Betroffenenrechte-Prozess,
- vorbefüllbarer und exportierbarer Arbeitsentwurf für Art.-15-Auskunftsersuchen,
- verschlüsselte Fallübergabe für Vertretung oder Nachfolge,
- Audit-Log mit dem Ziel, keine Direktidentifikatoren oder Freitexte zu protokollieren,
- Auto-Lock, Backup/Restore und Export-Guards,
- optionale Gremia.BR-Lesebrücke nur nach ausdrücklicher Nutzeraktion.

## Fallübergabe / Vertretung

Die Fallübergabe ist ein selektiver, verschlüsselter Transfer einzelner Vorgänge. Sie dient Urlaubsvertretung, Krankheit, Amtswechsel oder Nachfolge.

Leitplanken:

- Export erfolgt als `.gsbvtransfer`-Paket.
- Exportiert werden nur ausgewählte Fallakten und die erforderlichen zugehörigen Inhalte.
- Jede Gremia.SBV-Instanz bleibt eigenständig.
- Original-IDs der exportierenden Instanz werden nicht als fachliche Identität übernommen.
- Paketinterne Referenzen dienen nur zur Wiederherstellung der Beziehungen innerhalb des Pakets.
- Beim Import entstehen lokale IDs der importierenden Instanz.
- Bei möglichen Gegenstücken entscheidet die nutzende Person zwischen neuer Übergabeakte und bewusster Zusammenführung beziehungsweise Aktualisierung.
- Abgelaufene Übergabepakete dürfen nicht importiert werden.
- Bereits importierte Übergabedaten werden nach Ablauf der Vertretungszeit als abgelaufen markiert; weitere Bearbeitung verlangt eine begründete Bestätigung.
- Export, Import und Fortführung nach Ablauf werden ohne personenbezogene Inhalte auditiert.

## Art.-15-Auskunft

Das Compliance Center kann einen Arbeitsentwurf für ein Art.-15-Auskunftsersuchen aus vorhandenen Gremia.SBV-Daten vorbefüllen. Die Vorbefüllung berücksichtigt Personen-, Fallakten-, Fristen-, Maßnahmen-, Import-, Freitext- und Lifecycle-Daten, soweit sie auffindbar sind.

Der Export ist ein Arbeitsentwurf. Vor Herausgabe bleiben organisatorisch erforderlich:

- Identitätsprüfung,
- Prüfung auf Drittdaten,
- Schwärzung,
- rechtliche beziehungsweise verantwortliche Freigabe.

## Vor 1.0 offen

Vor 1.0 stehen keine neuen Großmodule im Vordergrund. Vorrang haben Stabilität und Verlässlichkeit:

- Echtdatennahe Prüfung der Migrationen und Altfallpfade,
- Härtung der Fallübergabe gegen Fehlbedienung, Datenverlust und missverständliche Zusammenführung,
- Audit-Log ohne Direktidentifikatoren in allen Import-, Export- und Lesebrückenpfaden,
- Art.-15-Auskunft organisatorisch klar dokumentieren,
- Barrierefreiheit und Tastaturbedienung in allen kritischen Dialogen sichern,
- Dashboard, Einstellungen, Fallakten und Compliance Center visuell konsistent im harten Industrial-Design halten,
- Build-, Test- und Release-Gates stabilisieren.

## Zulässig bis 1.0

Bis 1.0 sollen nur noch Änderungen erfolgen, die eine dieser Kategorien erfüllen:

- Security-Fix,
- Datenverlust- oder Migrationsfix,
- Build- oder Testfix,
- Barrierefreiheitsfix,
- Dokumentationskorrektur,
- offensichtlicher UI-Fehler ohne neue Fachlogik,
- Korrektur einer bereits begonnenen Vor-1.0-Funktion, wenn sie sonst fachlich irreführend oder gefährlich wäre.

## Spätere 1.x-Themen

Spätere Themen benötigen jeweils eine eigene Architektur- und Datenschutzentscheidung:

- erweiterte datensparsame Auswertungen,
- weitere Modularisierung großer Services,
- zusätzliche fachliche Berichte,
- optionale Leseschnittstellen zu anderen Systemen,
- eventuell weitergehende Rollen- oder Vertretungskonzepte.

Nicht geplant in der Referenzlinie:

- automatische Cloud-Synchronisation,
- Mehrbenutzerbetrieb ohne neues Sicherheitsmodell,
- Hintergrundkopplung mit Gremia.BR,
- Rückschreiben von SBV-Falldaten in BR-Systeme.

## Dokumentationsregel

Roadmap, README und Fachkonzepte beschreiben den aktuellen Produktzustand und die Zielarchitektur. Detailnotizen einzelner Patches, Buildfixes oder Review-Zwischenstände werden nicht als dauerhafte Roadmap geführt.
