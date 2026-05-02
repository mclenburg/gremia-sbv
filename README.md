# Gremia.SBV

> Eine lokale, verschlüsselte Desktop-Anwendung für die vertrauliche Fallarbeit der Schwerbehindertenvertretung.

Gremia.SBV unterstützt Schwerbehindertenvertretungen bei der strukturierten, datenschutzgerechten und fristensicheren Bearbeitung von Einzelfällen. Im Mittelpunkt stehen Fallakten, Gesprächsnotizen, Fristen, Dokumente, Vorlagen, Kontakte und anonymisierte Tätigkeitsberichte.

Die Anwendung ist bewusst als **Offline-First-Desktop-App** konzipiert. Es gibt keinen zentralen Server, keine Cloud-Synchronisierung und keinen externen Login-Dienst. Sensible Daten verbleiben lokal auf dem Rechner der SBV und werden verschlüsselt gespeichert.

## Zielbild

Gremia.SBV ist keine Kopie von Gremia.BR. Während Gremia.BR gremien-, sitzungs- und beschlussorientiert arbeitet, ist Gremia.SBV fall-, fristen- und vertraulichkeitszentriert.

```text
Gremia.SBV = vertrauliche, fristensichere, datensparsame SBV-Fallarbeit
```

## Grundprinzipien

- **Offline-first:** keine Cloud, keine Telemetrie, kein externer Login.
- **Lokal verschlüsselt:** Datenbankverschlüsselung über SQLCipher-kompatiblen Adapter.
- **Datensparsam:** anonyme, pseudonyme und personenbezogene Fallführung möglich.
- **Fristensicher:** Ampelwarnungen, Wiedervorlagen, iCal-Export.
- **SBV-zentriert:** Schutzauftrag, Beteiligung, Prävention und Fallbegleitung stehen im Mittelpunkt.
- **Keine Arbeitgeber- oder BR-Akte:** Informationen werden nur bewusst und fallbezogen exportiert oder geteilt.

## Tech-Stack

| Bereich | Technik |
|---|---|
| Desktop-Shell | Electron |
| UI | React + TypeScript + Tailwind CSS |
| Build | Vite |
| lokale Datenbank | SQLite mit SQLCipher-kompatibler Verschlüsselung |
| DB-Adapter | `better-sqlite3-multiple-ciphers` als vorgesehener Adapter |
| Schlüsselableitung | Argon2id / scrypt-Konzept, siehe `docs/SECURITY.md` |
| Dokumente | lokaler verschlüsselter Dokumentenspeicher |
| Export | PDF, DOCX, iCal |
| Tests | Vitest |

> Hinweis: Native Electron-Abhängigkeiten müssen je nach Zielplattform ggf. mit `electron-builder install-app-deps` oder vergleichbarer Build-Konfiguration neu gebaut werden.

## Hauptmodule

### Dashboard

- offene Fälle
- kritische Fristen
- Wiedervorlagen
- BEM- und Präventionsvorgänge
- Kündigungs-/Anhörungsvorgänge
- Backup- und Datenschutzwarnungen

### Fallverwaltung

- Fallakte pro Person oder anonym/pseudonym
- Fallstatus: offen, in Bearbeitung, ruhend, abgeschlossen
- Kategorien: BEM, Prävention, Kündigung, Gleichstellung, Nachteilsausgleich, Diskriminierung, Arbeitsplatzgestaltung u. a.
- Gesprächsnotizen
- Dokumentenzuordnung
- Rechtsgrundlagenverknüpfung
- fallbezogene Kontakte

### Fristenkalender

- Wiedervorlagen
- Arbeitgeberantworten
- Kündigungs-/Anhörungsfristen
- BEM-Rückmeldungen
- Gleichstellungs-/Widerspruchsfristen
- Ampellogik
- iCal-Export

### Wissensdatenbank

- SGB IX
- BetrVG-Bezüge
- AGG
- KSchG
- ArbSchG
- eigene Kommentare und Notizen
- Verknüpfung von Normen mit Fällen

### Schriftverkehr und Vorlagen

- Vorlagenverwaltung mit Platzhaltern
- automatisch befüllte Schreiben aus Falldaten
- PDF-/DOCX-Export
- Archivierung ausgehender Schreiben am Fall

### Tätigkeitsbericht

- anonymisierte Fallstatistik
- Jahresbericht nach SBV-Praxisbedarf
- keine personenbezogenen Daten im Bericht
- Export als PDF, DOCX oder Markdown

### Kontakte / Netzwerk

- Inklusionsamt
- Agentur für Arbeit
- Betriebsarzt
- Integrationsfachdienst
- externe Beratungsstellen
- anwaltliche Kontakte
- interne Ansprechpartner

### Sicherheit und Datenschutz

- Passwort beim App-Start
- automatische Sperre nach Inaktivität
- verschlüsselte Datenbank
- verschlüsselte Backups
- Audit-Log
- Löschkonzept
- Exportwarnungen

Details siehe `docs/SECURITY.md` und `docs/DATENSCHUTZKONZEPT.md`.

## Projektstruktur

```text
gremia-sbv/
├── electron/                  # Electron Main/Preload und IPC
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   └── security/
├── src/                       # React Renderer
│   ├── app/
│   │   ├── core/
│   │   ├── features/
│   │   └── shared/
│   ├── styles/
│   └── main.tsx
├── services/                  # Fachliche Services im Main-Prozess
├── database/                  # Schema, Migrations, Seeds
├── scripts/                   # CLI-Hilfen für DB und Entwicklung
├── docs/                      # Sicherheits- und Datenschutzkonzept
└── tests/
```


## Aktueller Stand 0.3.15

- Dashboard-Fristen können direkt bearbeitet und erledigt werden.
- Fristen werden über die Electron-IPC-Brücke aus der verschlüsselten SQLCipher-Datenbank geladen.
- Fallakten werden nicht mehr nur im UI gehalten, sondern in der Datenbank gespeichert.
- Rechtliche Fristen und Workflow-Schritte benötigen einen Fallbezug.
- Ohne Fallbezug ist nur eine freie Wiedervorlage zulässig.

Siehe auch: `docs/DEADLINE_EDITING_AND_CASE_BINDING.md`.

## Entwicklung

### Voraussetzungen

- Node.js LTS
- npm
- IntelliJ IDEA / WebStorm mit TypeScript-Unterstützung

### Installation

```bash
npm install
```

#
## Aktueller Stand 0.3.15

- Dashboard-Fristen können direkt bearbeitet und erledigt werden.
- Fristen werden über die Electron-IPC-Brücke aus der verschlüsselten SQLCipher-Datenbank geladen.
- Fallakten werden nicht mehr nur im UI gehalten, sondern in der Datenbank gespeichert.
- Rechtliche Fristen und Workflow-Schritte benötigen einen Fallbezug.
- Ohne Fallbezug ist nur eine freie Wiedervorlage zulässig.

Siehe auch: `docs/DEADLINE_EDITING_AND_CASE_BINDING.md`.

## Entwicklung starten

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```


## Aktueller Stand 0.3.15

- Dashboard-Fristen können direkt bearbeitet und erledigt werden.
- Fristen werden über die Electron-IPC-Brücke aus der verschlüsselten SQLCipher-Datenbank geladen.
- Fallakten werden nicht mehr nur im UI gehalten, sondern in der Datenbank gespeichert.
- Rechtliche Fristen und Workflow-Schritte benötigen einen Fallbezug.
- Ohne Fallbezug ist nur eine freie Wiedervorlage zulässig.

Siehe auch: `docs/DEADLINE_EDITING_AND_CASE_BINDING.md`.

## Entwicklungsstand

Dieses Repository ist ein bewusst schlankes Startgerüst. Es enthält noch keine fertige Produktivlogik, sondern:

- fachliche Modulstruktur
- Electron/React/Vite-Grundlage
- SQLCipher-orientiertes Datenbankschema
- Service-Schnittstellen
- Datenschutz- und Sicherheitsdokumentation
- Platzhalter für spätere Gremia.BR-Leseschnittstelle

## Spätere Gremia.BR-Schnittstelle

Die Anwendung bleibt offline. Eine spätere Schnittstelle zu Gremia.BR soll höchstens **lesend** erfolgen, z. B. für:

- Sitzungs-/Beschlussbezug
- BR-Ansprechpartner
- Betriebsvereinbarungen
- Termine oder relevante Vorgänge

Wichtig: Gremia.SBV darf nicht automatisch personenbezogene SBV-Falldaten an Gremia.BR übertragen.

Siehe `services/gremiaBrReadAdapter.ts`.

## Datenschutzregel

Gremia.SBV behandelt Fallinformationen grundsätzlich als vertrauliche SBV-Daten. Exporte, Weitergaben und Deanonymisierung müssen bewusst ausgelöst und protokolliert werden.

## Fachliche Leitplanken ab Version 0.2

Gremia.SBV bleibt ein **Offline-Tool**. Alle produktiven Funktionen müssen ohne Netzwerkzugriff funktionieren. Eine spätere Verbindung zu Gremia.BR ist ausschließlich als **lesende Schnittstelle** vorgesehen, etwa zum Import von Sitzungsterminen, Betriebsvereinbarungen oder BR-Beschlüssen, die für einen SBV-Fall relevant sein können. Gremia.SBV darf dadurch nicht zu einem gemeinsamen Fallakten-System mit dem Betriebsrat werden.

### Zusätzliche Prozessmodule

| Modul | Zweck | Datenschutz-Hinweis |
|---|---|---|
| BEM | Eigenständiger Prozess mit Einladung, Zustimmung, Erstgespräch, Maßnahmen, Evaluation und Abschluss | BEM-Daten strikt von Personalakte und Tätigkeitsbericht trennen |
| Gleichstellung | Prozess zur Beratung und Begleitung von Gleichstellungsanträgen | Status „beantragt“ und Nachweise sparsam speichern |
| Kündigungsanhörung | Workflow für stufenweise Prüfung von SBV-Beteiligung, BR-Beteiligung und Integrationsamt | Fristen und Zugangsdaten besonders deutlich kennzeichnen |
| Portabilität | App und Daten auf einem verschlüsselten Datenträger nutzbar | Keine Pfade außerhalb des App-Datenverzeichnisses erzwingen |

### Empfohlene Entwicklungsreihenfolge

1. Datenbankmodell für Fälle, Personen, Dokumente und Fristen
2. Fristenkalender mit Ampellogik
3. Fallverwaltung mit Gesprächsnotizen
4. Dokumentenmanagement mit Verschlüsselung
5. Tätigkeitsbericht-Generator mit strikter Anonymisierung

Diese Reihenfolge ist verbindlich für die frühe Architektur: Erst das Datenfundament, dann der erste tägliche Nutzen, danach Komfort- und Exportfunktionen.

## 🕒 Fristen- und Wiedervorlagenzentrale ab Version 0.3

Das Fristenmodul ist als SBV-Risiko- und Wiedervorlagesystem angelegt. Es unterscheidet ausdrücklich zwischen:

- rechtlichen Fristen,
- Wiedervorlagen,
- Terminen,
- Warnungen,
- Workflow-Schritten.

### Harte Dashboard-Regel

> Jede offene Frist erscheint spätestens ab 48 Stunden vor Ablauf auf dem Dashboard.

Diese Regel ist in `services/deadlineService.ts` über `getDashboardState()` umgesetzt und damit nicht nur eine optische Konvention der Oberfläche.

### Enthaltene Standardprozesse

- BEM-Rückmeldung und Maßnahmenevaluation
- Präventionsverfahren nach § 167 Abs. 1 SGB IX
- Kündigungsanhörung als kritischer Workflow
- Gleichstellungsverfahren
- GdB-/Bescheid-Widerspruchsfristen
- allgemeine Arbeitgeberantworten und Wiedervorlagen

### Datenschutz im Kalender

Für sensible Fristen gibt es neben dem internen Titel ein Feld `confidential_title`. Dieses soll für Dashboard, Kalenderexporte und spätere Betriebssystembenachrichtigungen genutzt werden, damit keine personenbezogenen oder gesundheitsbezogenen Details sichtbar werden.


## 0.3.3 Layout & Startschutz

- Dashboard entschlackt
- Industrial-Design eingeführt
- Passwort-Gate vor dem Dashboard
- klickbare Modulkacheln und Sidebar-Navigation
- erste Erfassungsmasken für Fälle und Fristen

Siehe `docs/LAYOUT_0_3_3.md`.

## 0.3.16 – Fallnotizen und Volltextsuche

Dieses Paket ergänzt die Fallakte um Gesprächsnotizen und Protokolle. Zusätzlich gibt es eine Volltextsuche über Notizen/Protokolle sowie den vorbereiteten Dokumentenindex. Dashboard-Kacheln wurden optisch bereinigt und enthalten kein separates „Öffnen“-Label mehr.

## Version 0.3.39 – Backup & Wiederherstellung

- verschlüsselte `.gsbvbackup`-Backups
- Backupprüfung mit Prüfsummen
- Wiederherstellung mit Sicherheitsbestätigung
- temporäre Arbeitskopien und vorhandene Backups werden nicht in neue Backups aufgenommen


## Teststrategie

Ab Version 0.3.41 gilt: Neue Funktionalität wird grundsätzlich mit Tests ausgeliefert.

Wichtige Befehle:

```bash
npm run test
npm run test:privacy
npm run test:backup
npm run test:migrations
npm run release:check
```

Details siehe `docs/TEST_COVERAGE_BASELINE.md`.


## Version 0.4.0 – Präventionsverfahren

- Präventionsverfahren nach § 167 Abs. 1 SGB IX als fallbezogener Fachprozess ergänzt.
- Workflow-Schritte mit Tooltip-Hilfen ergänzt.
- automatische Wiedervorlage für Arbeitgeberreaktion.
- Warnlogik für 48h, überfällige Reaktion, Kündigungsrisiko und Inklusionsamt.
- Tests für Präventionsworkflow ergänzt.
