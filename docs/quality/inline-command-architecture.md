# Inline-Command-Architektur

`useInlineCommands.ts` ist ausschließlich Composition Root und Orchestrator. Fachliche Befehle sind nach Domänengrenzen getrennt:

- Kontakt
- Fallbezug
- Rechtsnorm und Risiko
- Textkommando-Routing
- Frist
- offene Aufgabe
- Vertraulichkeit, Anonymisierung und Vorlage
- BEM
- Prävention
- Gleichstellung/GdB
- Kündigung
- SBV-Beteiligung
- Arbeitsplatzgestaltung

Gemeinsame Zustände liegen in `useInlineCommandDrafts.ts`. Gemeinsame Infrastruktur und Seiteneffektgrenzen werden über `InlineCommandRuntime` injiziert. Fachmodule greifen nicht aufeinander zu und erzeugen keine eigenen parallelen Zustandscontainer.

Architekturregeln:

1. Der Orchestrator enthält keine fachliche Erzeugungslogik.
2. Ein Fachmodul bearbeitet höchstens eine eng zusammengehörige Domäne.
3. Brückenzugriffe bleiben in dem Fachmodul, das den Anwendungsfall besitzt.
4. Textmanipulation, Entitätsverknüpfung und Feedback werden über den Runtime-Vertrag bereitgestellt.
5. Neue Inline-Kommandos erhalten ein eigenes Fachmodul, sobald sie mehr als triviale Markerersetzung ausführen.
6. Alle Dateien und Funktionen bleiben unter den allgemeinen Maintainability-Grenzen.
