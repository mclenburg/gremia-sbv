# Patch 0.8.7-a – Compliance-Status Build-Fix

## Ziel

Dieser Hotfix beseitigt einen TypeScript-Strictness-Fehler im Compliance Center.

## Korrektur

`loadComplianceStatus()` hält die über `waitForBridge()` geladene Bridge jetzt vor dem Zugriff auf `security.status()` und `security.temporaryFileStatus()` lokal und typensicher fest.

Dadurch ist der Zugriff für TypeScript nicht mehr potenziell `null`.

## Betroffene Datei

- `src/app/features/compliance/ComplianceView.tsx`

## Version

- App-Version: `0.8.7-a`
- Schema-Version: unverändert `0023`
