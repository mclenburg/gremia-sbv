import { header } from './complianceDocumentSupport.js';
export function approvalBody(generatedAt: string): string {
  return `${header('Freigabeformular Gremia.SBV für Datenschutzbeauftragte und IT-Security', generatedAt)}## 1. Zweck der Software

Gremia.SBV dient der vertraulichen Arbeitsorganisation der Schwerbehindertenvertretung.

## 2. Nutzerkreis

- Vertrauensperson der schwerbehinderten Menschen.
- ggf. herangezogene Stellvertretungen nach interner Festlegung.
- keine allgemeine Nutzung durch Arbeitgeber, HR oder Betriebsrat.

## 3. Betriebsform

- Lokale Desktop-Anwendung.
- Offline-first.
- Keine Cloud-Synchronisation.
- Keine Telemetrie.

## 4. Datenarten

- Fallakten und Gesprächsnotizen.
- Fristen.
- Kontakte.
- Präventions-, BEM-, Gleichstellungs-/GdB- und Kündigungsanhörungsdaten.
- mögliche besondere Kategorien personenbezogener Daten nach Art. 9 DSGVO.

## 5. Sicherheitsmaßnahmen

- verschlüsselter Tresor / verschlüsselte Datenbank.
- lokales hashverkettetes Audit-Log für Zugriff/Änderung personenbezogener Daten.
- starke Passphrase.
- verschlüsselte Backups.
- verschlüsselte PDF-Reportcontainer.
- ExportGuard.
- Lösch-/Anonymisierungsfunktionen.
- lokale Datenhaltung.

## 6. Export und Weitergabe

Exporte dürfen nur zweckgebunden, erforderlich und mit minimal notwendigem Inhalt erfolgen. Exporte liegen außerhalb des Tresors und sind besonders zu schützen.

## 7. Offene Prüfentscheidung

| Prüffrage | Bewertung / Auflage |
|---|---|
| Speicherort genehmigt? |  |
| Backup-Ort genehmigt? |  |
| Passphrase-Regeln genehmigt? |  |
| Exportregeln genehmigt? |  |
| DSFA erforderlich / abgeschlossen? |  |
| VVT-Eintrag erforderlich / abgeschlossen? |  |
| Nutzung durch Stellvertretungen geregelt? |  |

## 8. Freigabe

Datenschutzbeauftragte*r:

Name: ___________________________

Entscheidung: ☐ freigegeben ☐ freigegeben mit Auflagen ☐ nicht freigegeben

Auflagen:

______________________________________________________________________

IT-Security:

Name: ___________________________

Entscheidung: ☐ freigegeben ☐ freigegeben mit Auflagen ☐ nicht freigegeben

Auflagen:

______________________________________________________________________

Review-Termin: __________________
`;
}
export function dataProtectionStatusBody(generatedAt: string): string {
  return `${header('Datenschutzstatus Gremia.SBV vor Produktivnutzung', generatedAt)}## 1. Zweck

Diese Prüfliste unterstützt die SBV dabei, den lokalen Gremia.SBV-Tresor vor produktiver Nutzung fachlich, technisch und organisatorisch zu bewerten. Sie ersetzt keine Freigabe durch Datenschutzbeauftragte, IT-Security oder Rechtsberatung.

## 2. Statusampel

| Bereich | Sollzustand | Status / Nachweis |
|---|---|---|
| Verschlüsselter Tresor | Datenbank und Dokumente lokal verschlüsselt |  |
| Auto-Lock | automatische Sperre aktiv und getestet |  |
| Temporäre Arbeitskopien | tmp-Bereich nach PDF-/Dokumentabruf bereinigt |  |
| Audit-Hash-Chain | System- und Integritätsbericht ohne Hash-Fehler |  |
| Backup | verschlüsseltes Backup erzeugt und Restore getestet |  |
| TOMs | erzeugt und fachlich geprüft |  |
| VVT | Entwurf erzeugt und Verantwortlichkeit geklärt |  |
| DSFA | Erforderlichkeit geprüft / Entwurf bewertet |  |
| Löschkonzept | Review- und Löschlogik organisatorisch entschieden |  |
| Stellvertretung | Zugriff und Heranziehung organisatorisch geregelt |  |
| Externe Viewer | Risiken temporärer PDF-Kopien dokumentiert |  |

## 3. Bewertung

- Grün: Technische Grundlage vorhanden und organisatorisch entschieden.
- Rot: Kritische Schutzlücke oder fehlender Nachweis.

## 4. Mindestempfehlung vor produktiver Nutzung

- Auto-Lock testen.
- System- und Integritätsbericht erzeugen.
- Temporäre Arbeitskopien bereinigen.
- Erstes verschlüsseltes Backup erzeugen und testweise prüfen.
- TOMs, VVT und DSFA-Entwurf mit Datenschutzbeauftragten / IT-Security abstimmen. Diese Prüfung wird durch die Software nur erinnert, nicht bewertet.
- Regeln für Stellvertretung und Exporte schriftlich festhalten.
`;
}
