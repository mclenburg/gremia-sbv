# Architekturdiagramme

Diese Seite ergänzt `ARCHITECTURE.md` um zwei bewusst grobe Architektursichten. Die Diagramme sind als SVG eingebunden, damit sie auch in Markdown-Viewern, PDF-Exporten und Reviews ohne Mermaid-Renderer sofort sichtbar bleiben. Die Mermaid-Quellen liegen separat unter `docs/mermaid/` und bleiben die pflegbare Wahrheit.

## Datenfluss UI bis Datenbank

![Datenfluss von React UI über Bridge und IPC bis zur SQLCipher-Datenbank](./assets/architecture-data-flow.svg)

Mermaid-Quelle: [`docs/mermaid/architecture-data-flow.mmd`](./mermaid/architecture-data-flow.mmd)

### Lesart

Die UI spricht nie direkt mit der Datenbank. Fachliche Regeln liegen als testbare Policies oder Services vor. Electron-IPC bildet die Sicherheits- und Validierungsgrenze zwischen Renderer und Node-Kontext. Persistenz erfolgt lokal in SQLCipher; Audit, Backup und Exporte sind eigene Pfade und dürfen keine unkontrollierten personenbezogenen Nebenablagen erzeugen.

## Grobe Komponentensicht der Anwendung

![Grobe Komponentensicht mit Core, SBV-Fachmodulen, Querschnittsmodulen, Security und Persistenz](./assets/architecture-components.svg)

Mermaid-Quelle: [`docs/mermaid/architecture-components.mmd`](./mermaid/architecture-components.mmd)

### Lesart

Die Fallakten-Workbench ist der fachliche Mittelpunkt. Das Personenverzeichnis führt Schutz- und Beschäftigungsstatus; Fallakten und Maßnahmen hängen daran. Prozessmodule wie BEM, Prävention, Gleichstellung, Kündigungsanhörung und Arbeitsplatzgestaltung nutzen dieselben Grundmuster für Maßnahmen, Fristen, Notizen, Dokumente und Datenschutzprüfung. Querschnittsmodule dürfen die Fachmodule unterstützen, aber keine parallelen Schattenprozesse erzeugen.

## Architekturregeln aus den Diagrammen

1. **Renderer bleibt fachlich dünn:** UI-Komponenten sammeln Eingaben, zeigen Status an und rufen Bridge-Funktionen auf.
2. **IPC ist Grenze:** Jeder Renderer-Aufruf wird über Preload und IPC geführt; keine direkten Node- oder Datenbankzugriffe aus React.
3. **Policies bleiben rein:** Regeln zu Datenschutz, Export, Fristen, Workflows und Anonymisierung müssen ohne Datenbank und ohne UI testbar sein.
4. **Services orchestrieren:** Services verbinden Policies, Datenbank, Audit und Exporte; sie enthalten keine Präsentationslogik.
5. **Datenschutz ist Querschnitt:** Anonymisierung, Löschung, Retention, Audit und Export-Guards müssen neue Fachobjekte ausdrücklich einbeziehen.
6. **Keine Parallelwelten:** Neue Funktionen verwenden vorhandene Workbench-, Prozess-, Fristen-, Notiz- und Inline-Befehlsmuster statt eigene Sonderpfade aufzubauen.
