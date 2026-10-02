# Produktlinie Gremia.SBV

Gremia.SBV ist eine lokale Fachanwendung für vertrauliche Arbeit der Schwerbehindertenvertretung. Der verschlüsselte Desktop-Tresor bleibt der führende Datenbestand. Cloud und Telemetrie sind für die Nutzung nicht erforderlich. Die Gremia.BR-Kooperationsbrücke ist optional; ein einmaliger Abruf nach dem Entsperren beim Programmstart kann separat aktiviert werden und ist standardmäßig aus.

## Aktueller Produktumfang

- Fallakten, anonyme Beratungen und datensparsame Personen- und Kontaktverwaltung,
- Maßnahmen für BEM, Prävention, Beteiligung, Gleichstellung, Kündigung und Arbeitsplatzgestaltung,
- fallaktenunabhängige Stellenbesetzungen und Arbeitgeberverstöße,
- Fristen, Wiedervorlagen, Tätigkeitsjournal und Dashboard,
- Dokumentation von Sitzungen, Versammlungen, Beschwerden, Arbeitgeberpflichten und Inklusionsvereinbarungen,
- Wahlakten mit Verfahrens- und Nachweisführung,
- Vorlagen, Dokumente, Berichte und verschlüsselte Exporte,
- Compliance Center einschließlich Aufbewahrungsprüfung und Art.-15-Zuarbeit,
- Backup und Wiederherstellung sowie verschlüsselte Vertretungs- und Amtsübergabe,
- Android-Begleit-App mit reduzierter mobiler Arbeitsprojektion und geprüfter Rückgabe,
- optionale Gremia.BR-Kooperation mit getrenntem SBV-Arbeitsbereich.

Die Bedienung der Module steht im [Benutzerhandbuch](handbuch/README.md). Architektur und Datenschutzentscheidungen werden in den jeweiligen Referenzdokumenten beschrieben.

## Verbindliche Leitplanken

- Personenbezogene SBV-Daten bleiben im lokalen verschlüsselten Tresor. Exporte und Übertragungen erfolgen zweckgebunden und auf bewusste Aktion.
- Die Begleit-App erhält nur ausgewählte offene Arbeitskontexte; sie wird nicht zur zweiten vollständigen Fallakte.
- BR- und SBV-Arbeitsbestände bleiben getrennt. Ein aus Gremia.BR übernommener Sitzungskontext ist eine lokale SBV-Arbeitskopie.
- Aufbewahrungsfristen erzeugen konkrete Prüfaufträge, keine automatische fachliche Löschung.
- Tätigkeitsberichte werden aus der verifizierten Auditkette erstellt und vor Weitergabe auf Rückschlüsse geprüft.
- Barrierefreiheit, Nachvollziehbarkeit, Datenminimierung und sichere Migrationen gehören zu jedem betroffenen Arbeitsablauf.

## Weiterentwicklung

Neue Arbeiten werden am tatsächlichen fachlichen Bedarf und an den [verbindlichen Entwicklungsregeln](../AI_INSTRUCTIONS.md) ausgerichtet. Für zusätzliche Schnittstellen, Berichte oder Rollenmodelle sind Architektur, Datenschutzwirkung, Bedienbarkeit und Tests im jeweiligen Änderungsvorhaben zu prüfen. Diese Datei führt keine Patchhistorie oder manuell gepflegten Versionsstände.
