# Architekturdiagramme

Stand: **0.9.1**

Diese Seite ergänzt `ARCHITECTURE.md` um zwei bewusst grobe Mermaid-Sichten. Sie soll neuen Entwicklerinnen und Entwicklern schnell zeigen, wie Daten durch Gremia.SBV laufen und welche Hauptkomponenten fachlich zusammengehören.

## Datenfluss UI bis Datenbank

```mermaid
flowchart TD
  User[SBV-Nutzerin / SBV-Nutzer]
  UI[React UI\nFeature-Views, Panels, Dialoge]
  Components[Shared UI\nModuleFrame, IndustrialField, TextCommandTextarea]
  Hooks[Feature-Hooks und View-Handler\nStatus, Validierung, Nutzeraktionen]
  Bridge[Preload Bridge\nwindow.gremiaSbv]
  IPC[Electron IPC Handler\nvalidierte Kanalgrenzen]
  Services[Node Services\nfachliche Orchestrierung]
  Policies[Pure Policies\nRegeln ohne DB-Zugriff]
  DB[SQLCipher SQLite\nverschlüsselte lokale Datenbank]
  Audit[Audit / Hash Chain\ndatensparsame Nachvollziehbarkeit]
  Backup[Backup / Restore\nverschlüsselte Nutzdatenpakete]
  Reports[Reports / Exporte\nPrivacy Guards]

  User --> UI
  UI --> Components
  Components --> Hooks
  Hooks --> Bridge
  Bridge --> IPC
  IPC --> Services
  Services --> Policies
  Services --> DB
  Services --> Audit
  DB --> Backup
  Services --> Reports

  Policies -. keine Seiteneffekte .-> Services
  Reports -. prüft Exportgrenzen .-> Policies
  Backup -. keine Klartext-Nebenspeicher .-> DB
```

### Lesart

Die UI spricht nie direkt mit der Datenbank. Fachliche Regeln liegen als testbare Policies oder Services vor. Electron-IPC bildet die Sicherheits- und Validierungsgrenze zwischen Renderer und Node-Kontext. Persistenz erfolgt lokal in SQLCipher; Audit, Backup und Exporte sind eigene Pfade und dürfen keine unkontrollierten personenbezogenen Nebenablagen erzeugen.

## Grobe Komponentensicht der Anwendung

```mermaid
flowchart LR
  Shell[App Shell\nNavigation, Lock Screen, Theme]
  A11y[Barrierefreiheit\nAnnouncer, Fokusführung, Tastatur]
  Bridge[Bridge / IPC\nPreload, Handler, Validierung]
  Data[Persistenz\nSQLCipher, Migrationen, Schema-Version]
  Security[Security & Privacy\nSession Lock, Audit, Retention, Anonymisierung]

  subgraph Core[Core]
    Shell
    A11y
    Bridge
  end

  subgraph Domain[SBV-Fachmodule]
    Persons[Personenverzeichnis]
    Cases[Fallakten-Workbench]
    Measures[Maßnahmen & Prozessknoten]
    Bem[BEM]
    Prevention[Prävention]
    Equalization[Gleichstellung / GdB]
    Termination[Kündigungsanhörung]
    Workplace[Arbeitsplatzgestaltung]
    Participation[SBV-Beteiligung]
  end

  subgraph Support[Querschnittsmodule]
    Deadlines[Fristen & iCal]
    Documents[Dokumente]
    Templates[Vorlagen]
    Knowledge[Wissensbasis]
    Contacts[Kontakte]
    Reports[Berichte / Exporte]
    Compliance[Compliance Center]
    Settings[Einstellungen, Backup, Portable]
  end

  Core --> Domain
  Domain --> Support
  Domain --> Security
  Support --> Security
  Bridge --> Data
  Security --> Data

  Persons --> Cases
  Cases --> Measures
  Measures --> Bem
  Measures --> Prevention
  Measures --> Equalization
  Measures --> Termination
  Measures --> Workplace
  Measures --> Participation
  Cases --> Deadlines
  Cases --> Documents
  Cases --> Reports
  Compliance --> Security
  Settings --> Data
```

### Lesart

Die Fallakten-Workbench ist der fachliche Mittelpunkt. Das Personenverzeichnis führt Schutz- und Beschäftigungsstatus; Fallakten und Maßnahmen hängen daran. Prozessmodule wie BEM, Prävention, Gleichstellung, Kündigungsanhörung und Arbeitsplatzgestaltung nutzen dieselben Grundmuster für Maßnahmen, Fristen, Notizen, Dokumente und Datenschutzprüfung. Querschnittsmodule dürfen die Fachmodule unterstützen, aber keine parallelen Schattenprozesse erzeugen.

## Architekturregeln aus den Diagrammen

1. **Renderer bleibt fachlich dünn:** UI-Komponenten sammeln Eingaben, zeigen Status an und rufen Bridge-Funktionen auf.
2. **IPC ist Grenze:** Jeder Renderer-Aufruf wird über Preload und IPC geführt; keine direkten Node- oder Datenbankzugriffe aus React.
3. **Policies bleiben rein:** Regeln zu Datenschutz, Export, Fristen, Workflows und Anonymisierung müssen ohne Datenbank und ohne UI testbar sein.
4. **Services orchestrieren:** Services verbinden Policies, Datenbank, Audit und Exporte; sie enthalten keine Präsentationslogik.
5. **Datenschutz ist Querschnitt:** Anonymisierung, Löschung, Retention, Audit und Export-Guards müssen neue Fachobjekte ausdrücklich einbeziehen.
6. **Keine Parallelwelten:** Neue Funktionen verwenden vorhandene Workbench-, Prozess-, Fristen-, Notiz- und Inline-Befehlsmuster statt eigene Sonderpfade aufzubauen.
