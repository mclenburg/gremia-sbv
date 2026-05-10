# Architektur Gremia.SBV

Stand: **0.9.1**

## Architekturprinzip

Gremia.SBV ist eine lokale Electron-/React-/Node.js-App. Die Architektur folgt der Trennung:

```text
UI-Komponenten → Feature-Hooks → Services → Policies → Datenbank/Migrationen
```

Policies sind pure Functions ohne Datenbankzugriff. Services sind dünne, testbare Orchestrierer. `App.tsx` verdrahtet nur und darf nicht zum Sammelpunkt von Feature-Handlern werden.

## Zentrale Domänen

```text
ProtectedPerson
  └── CaseFile
        ├── Notes
        ├── Measures
        ├── Deadlines
        └── Documents
```

Die Person ist führender Datensatz. Reguläre Fallakten gehören zu genau einer Person. Für Erstberatungen ohne Namensnennung gibt es eine pseudonyme anonyme Anfrage.

## Personenverzeichnis

Das Personenverzeichnis speichert Schutzstatus und Beschäftigungsstatus, aber kein GdB-Standardfeld und keine Diagnosen. Die Personalnummer ist optional. Import-Matching erfolgt bevorzugt über Personalnummer oder dienstliche E-Mail; Name/Vorname allein ist ein Konflikt, kein automatisches Update.

Wichtige Services:

- `protectedPersonService.ts`
- `personImportService.ts`
- `personMatchingService.ts`
- `personLifecyclePolicy.ts`
- `personCaseLinkService.ts` beziehungsweise künftiger `personCaseBindingService.ts`
- `personAnonymizationService.ts`
- `personStatusExpiryService.ts`

## Fallaktenbindung

`case_files.protected_person_id` soll fachlich führend werden. Bestehende `person_case_links` werden in der Migration ausgewertet:

- genau ein aktiver Link → `migrated`,
- mehrere Links → `legacy_unlinked`,
- kein Link → `legacy_unlinked`,
- anonyme Anfrage → `anonymous_request`.

## Datenschutz-Lifecycle

Statusablauf und Beschäftigungsende sind Datenschutz-Prüfereignisse. Zulässige Entscheidungen sind:

1. Status aktualisieren,
2. Fortspeicherung mit Grund und Prüftermin,
3. Anonymisierung,
4. Löschung.

Freitexte werden nicht automatisch anonymisiert, sondern prüfpflichtig markiert.

## Fristen und iCal

Fristen werden über das bestehende Fristensystem geführt. Personenbezogene Ablaufwarnungen dürfen kein paralleles Dashboard-System erzeugen. iCal-Export nutzt `process_type` als Standard und enthält keine Namen oder Fallinhalte.

## Compliance Center

`complianceCenterService.ts` erzeugt TOMs, DSFA, DSGVO-/BDSG-Matrix und Freigabeunterlagen. Personenverzeichnis, Art. 13/14, Art. 15, § 164 Abs. 4 SGB IX und Audit-ohne-Direktidentifikatoren müssen dort gepflegt werden.
