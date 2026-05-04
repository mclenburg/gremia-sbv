# Patch 0.8.5 – SBV-Beteiligungsmonitor

Dieser Patch ergänzt Gremia.SBV um einen eigenen Beteiligungsmonitor für die Kernrechte der Schwerbehindertenvertretung nach § 178 Abs. 2 SGB IX.

## Fachlicher Schwerpunkt

Der neue Monitor dokumentiert:

- rechtzeitige und umfassende Unterrichtung,
- Anhörung vor der Arbeitgeberentscheidung,
- Mitteilung der getroffenen Entscheidung,
- SBV-Stellungnahmefrist,
- Aussetzungsverlangen nach § 178 Abs. 2 Satz 2 SGB IX,
- Pflichtverstöße und fehlende Unterlagen.

Damit wird die SBV-Beteiligung nicht nur als Freitextnotiz, sondern als prüfbarer Vorgang geführt.

## Technische Änderungen

Neu:

- `src/app/core/models/participation.model.ts`
- `services/participationService.ts`
- `electron/ipc/participationIpc.ts`
- `src/app/features/participation/ParticipationView.tsx`
- `src/app/features/participation/participationWorkbench.css`
- `database/migrations/0019_sbv_participation_monitor.sql`

Geändert:

- App-Version: `0.8.5`
- Schema-Version: `0019`
- Navigation: neues Modul `SBV-Beteiligung`
- Preload-Bridge und Window-Typen um `participation` erweitert
- MigrationService erkennt und validiert Schema 0019

## Datenschutz und Nachvollziehbarkeit

Zugriffe und Änderungen am Beteiligungsmonitor werden über den bestehenden personenbezogenen Audit-Log-Dienst protokolliert und damit von der Hash-Chain-Prüfung aus Patch 0.8.4-d erfasst.

## Fristen

Beim Anlegen einer Beteiligungsprüfung mit Stellungnahmefrist wird automatisch eine Wiedervorlage erzeugt. Beim Eintragen eines Aussetzungsverlangens wird eine Nachholfrist von sieben Tagen angelegt.
