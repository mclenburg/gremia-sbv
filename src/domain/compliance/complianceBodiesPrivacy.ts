import { header } from './complianceDocumentSupport.js';
import { informationAndAccessRightsSection } from './complianceStepEContent.js';
import { RETENTION_POLICY_CATALOG } from '../retention/retentionPolicyCatalog.js';

function retentionRuleLabel(policy: (typeof RETENTION_POLICY_CATALOG)[number]): string {
  const { rule } = policy;
  if (rule.kind === 'months_after_completion') {
    const years = rule.months / 12;
    return Number.isInteger(years) && years >= 1
      ? `${years} Jahre nach Abschluss`
      : `${rule.months} Monate nach Abschluss`;
  }
  if (rule.kind === 'months_after_completion_year_end') {
    const years = rule.months / 12;
    return Number.isInteger(years) && years >= 1
      ? `${years} Jahre nach Jahresende des Verfahrensabschlusses`
      : `${rule.months} Monate nach Jahresende des Verfahrensabschlusses`;
  }
  if (rule.kind === 'term_related') {
    const years = rule.months / 12;
    return Number.isInteger(years) && years >= 1
      ? `amtszeitbezogen, regulär ${years} Jahre`
      : `amtszeitbezogen, regulär ${rule.months} Monate`;
  }
  if (rule.kind === 'permanent_anonymized') return 'dauerhaft nur anonymisiert/gremienbezogen';
  return 'zweck- und vorgangsbezogen';
}

function retentionPolicyRows(): string {
  return RETENTION_POLICY_CATALOG
    .map((policy) => `| ${policy.label} | ${retentionRuleLabel(policy)} | ${policy.legalBasis} | ${policy.explanation}${policy.immediateOnConsentWithdrawal ? ' Widerruf löst eine sofortige Zweck- und Löschprüfung aus.' : ''} |`)
    .join('\n');
}

export function retentionScheduleBody(generatedAt: string): string {
  return `${header('Lösch- und Aufbewahrungskonzept Gremia.SBV', generatedAt)}## 1. Grundsatz

Personenbezogene Daten werden nur solange gespeichert, wie sie für die konkrete SBV-Aufgabe, Nachweisführung oder Rechtsverteidigung erforderlich sind. Danach sind sie zu löschen, zu anonymisieren oder einer dokumentierten Fortspeicherungsprüfung zuzuführen. Gremia.SBV löst keine automatische Löschung aus; jede Löschung bleibt eine bewusste manuelle Entscheidung.

## 2. Verbindlicher Standardkatalog in Gremia.SBV

Die folgenden Standardregeln sind dieselbe fachliche Quelle, die auch das Dashboard „Datenschutzprüfung & Löschung“ für fällige Prüfaufträge verwendet.

| Modul / Vorgangstyp | Standard-Löschprüfung | Rechtsrahmen | Anwendung in Gremia.SBV |
|---|---|---|---|
${retentionPolicyRows()}

## 3. Regelmäßige Prüfung

- Fällige Prüfaufträge werden im Datenschutz-Cockpit angezeigt und müssen dort fachlich bewertet werden.
- Rechtliche Fristen ohne Fallbezug sind zulässig, wenn der Anlass eigenständig dokumentiert ist.
- Exporte außerhalb des Tresors sind besonders kurz zu halten und gesondert zu schützen.
- Personen ohne Schwerbehinderung oder Gleichstellung sowie ausgeschiedene Beschäftigte werden nur dann zur Aussonderungsprüfung vorgemerkt, wenn kein aktiver Zweckbezug mehr erkennbar ist.

## 4. Verantwortlichkeit

Die fachliche Entscheidung trifft die SBV im Rahmen ihrer Aufgaben. Organisatorische Vorgaben zu Datenschutz, Archivierung und Rechtsverteidigung sind mit DSB und ggf. Rechtsberatung abzustimmen.

## 5. Dokumentation

Lösch- und Anonymisierungsvorgänge sollen nachvollziehbar dokumentiert werden, ohne unnötige sensible Inhalte erneut festzuhalten.
`;
}
export function dataSubjectRightsBody(generatedAt: string): string {
  return `${header('Prozess Betroffenenrechte Gremia.SBV', generatedAt)}## 1. Ziel

Dieses Dokument beschreibt einen Arbeitsprozess für Anfragen nach Auskunft, Berichtigung, Löschung, Einschränkung oder Kopie personenbezogener Daten im Zusammenhang mit Gremia.SBV.

## 2. Eingang und Identitätsprüfung

- Eingang der Anfrage dokumentieren.
- Identität prüfen, bevor personenbezogene Inhalte herausgegeben werden.
- Umfang des Ersuchens klären.
- Monatsfrist überwachen und ggf. Verlängerung begründen.

## 3. Fachliche Prüfung

- Welche Daten betreffen die anfragende Person?
- Enthalten Unterlagen Daten Dritter?
- Bestehen Vertraulichkeits-, Schutz- oder Rechtsverteidigungsinteressen?
- Sind Schwärzungen erforderlich?
- Muss der Datenschutzbeauftragte eingebunden werden?

## 4. Antwort

- Antwort strukturiert und verständlich formulieren.
- Datenkategorien, Zwecke, Empfänger und Speicherdauer benennen, soweit einschlägig.
- Keine unnötigen Gesundheitsdetails oder Drittdaten offenlegen.
- Entscheidung über Löschung/Berichtigung dokumentieren.

${informationAndAccessRightsSection()}
## 5. Werkzeuge in Gremia.SBV

- DSAR-Antwortgenerator im Compliance Center.
- Art.-13/14-Datenschutzinformation als anpassbare Compliance-Vorlage.
- Fall- und Dokumentensuche.
- Lösch-/Anonymisierungslogik.
- Audit-Log zur Nachvollziehbarkeit.

## 6. Hinweis

Betroffenenrechte im SBV-Kontext können kollidierende Schutzinteressen berühren. Bei komplexen Fällen ist DSB- oder anwaltliche Prüfung erforderlich.
`;
}
export function exportPolicyBody(generatedAt: string): string {
  return `${header('Export- und Weitergaberegeln Gremia.SBV', generatedAt)}## 1. Grundsatz

Daten bleiben grundsätzlich im verschlüsselten Gremia.SBV-Tresor. Exporte sind Ausnahmen und müssen erforderlich, zweckgebunden und auf das notwendige Minimum beschränkt sein.

## 2. PDF-Berichte und Compliance-Dokumente

- Berichte werden über den zentralen Report-Service erzeugt.
- Der gespeicherte Export ist ein verschlüsselter .gsbvpdf-Container.
- Beim Abruf als PDF wird eine temporäre Klartextkopie für den externen PDF-Viewer erzeugt.
- Temporäre Klartextkopien sind nach Nutzung zu löschen; externe Viewer können eigene Caches erzeugen.

## 3. Weitergabe an Dritte

Vor jeder Weitergabe ist zu prüfen:

- Wer ist Empfänger?
- Welche Rechtsgrundlage oder Aufgabe rechtfertigt die Weitergabe?
- Welche Inhalte sind wirklich erforderlich?
- Müssen Namen, Aktenzeichen oder Gesundheitsdetails geschwärzt werden?
- Ist eine verschlüsselte Übermittlung erforderlich?
- Handelt es sich um eine interne Prüfunterlage oder um ein extern verwendbares Dokument?

## 4. Dokumentation

Exporte und Weitergaben sollen nachvollziehbar dokumentiert werden, insbesondere bei Gesundheitsdaten, BEM, Prävention, Gleichstellung/GdB und Kündigungsvorgängen.
`;
}
