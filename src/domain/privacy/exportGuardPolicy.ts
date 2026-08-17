export type ExportRiskLevel = 'none' | 'notice' | 'warning' | 'critical';

export interface ExportScanContext {
  context: string;
  target?: string;
}

export interface ExportScanResult {
  context: string;
  target?: string;
  riskLevel: ExportRiskLevel;
  findings: string[];
  requiresExplicitConfirmation: boolean;
}

const sensitivePatterns: Array<{ label: string; pattern: RegExp; level: ExportRiskLevel }> = [
  { label: 'BEM-spezifische Gesundheits-/Eingliederungsdaten', pattern: /\b(Betriebliches Eingliederungsmanagement|BEM-Angebot|BEM-Verfahren|BEM-Maßnahme|BEM-Gespräch|BEM-Unterlagen|Einwilligungsumfang|Datenschutzhinweis|Widerruf|Wirksamkeitsprüfung)\b/i, level: 'critical' },
  { label: 'mögliche Diagnose- oder Therapiedaten', pattern: /\b(Diagnose|Therapie|Medikation|psychisch|depressiv|Burnout|Angststörung|Reha|Klinik|Arbeitsunfähigkeit|AU-Tage|stufenweise Wiedereingliederung)\b/i, level: 'critical' },
  { label: 'vertrauliche SBV-/BEM-Notiz', pattern: /\b(vertrauliche SBV-Notiz|vertrauliche BEM-Notiz|hoch sensibel|nicht weitergeben|interne Abwägung)\b/i, level: 'critical' },
  { label: 'möglicher Gesundheits-/Behinderungsbezug', pattern: /\b(GdB|Grad der Behinderung|Schwerbehinderung|gleichgestellt|BEM|Arbeitsunfähigkeit|Diagnose|Erkrankung|Reha|Wiedereingliederung)\b/i, level: 'critical' },
  { label: 'möglicher Personenname', pattern: /\b[A-ZÄÖÜ][a-zäöüß]+,\s*[A-ZÄÖÜ][a-zäöüß]+\b|\b[A-ZÄÖÜ]\.?\s+[A-ZÄÖÜ][a-zäöüß]+\b|\b(Herr|Frau)\s+[A-ZÄÖÜ][a-zäöüß]+\b/, level: 'warning' },
  { label: 'Aktenzeichen oder Fallbezug', pattern: /\b(AZ|Aktenzeichen|Fall|BEM|PRÄV|KUEND|KÜND|GLST)[-_\s]*\d{2,4}[-_\s]*\d+\b/i, level: 'warning' },
  { label: 'nicht aufgelöster Platzhalter', pattern: /\{\{[^}]+\}\}/, level: 'notice' }
];

const levelOrder: Record<ExportRiskLevel, number> = {
  none: 0,
  notice: 1,
  warning: 2,
  critical: 3
};

function maxLevel(a: ExportRiskLevel, b: ExportRiskLevel): ExportRiskLevel {
  return levelOrder[a] >= levelOrder[b] ? a : b;
}

export function scanSensitiveExportText(text: string, context: ExportScanContext): ExportScanResult {
  const findings: string[] = [];
  let riskLevel: ExportRiskLevel = 'none';

  for (const rule of sensitivePatterns) {
    if (rule.pattern.test(text)) {
      findings.push(rule.label);
      riskLevel = maxLevel(riskLevel, rule.level);
    }
  }

  return {
    context: context.context,
    target: context.target,
    riskLevel,
    findings: Array.from(new Set(findings)),
    requiresExplicitConfirmation: true
  };
}

export function buildExportWarningMessage(scan: ExportScanResult): string {
  const targetLine = scan.target ? `\nZiel/Objekt: ${scan.target}` : '';
  const findingLine = scan.findings.length
    ? `\n\nErkannte Hinweise:\n- ${scan.findings.join('\n- ')}`
    : '\n\nEs wurden keine konkreten Treffer erkannt. Trotzdem entsteht eine Kopie außerhalb des verschlüsselten Gremia.SBV-Tresors.';

  return [
    `Export bestätigen: ${scan.context}${targetLine}`,
    findingLine,
    '',
    'Durch diesen Schritt können personenbezogene oder besondere Kategorien personenbezogener Daten außerhalb des geschützten Tresors sichtbar werden.',
    'Bitte nur fortfahren, wenn der Export erforderlich ist und der weitere Speicherort kontrolliert wird.',
    '',
    'Fortfahren?'
  ].join('\n');
}


export function scanBemProcessExport(input: {
  title?: string;
  body?: string;
  status?: string;
  containsConfidentialNotes?: boolean;
  unresolvedPlaceholders?: string[];
}): ExportScanResult {
  const text = [
    'BEM-Verfahren',
    input.title ?? '',
    input.status ? `Status: ${input.status}` : '',
    input.containsConfidentialNotes ? 'vertrauliche BEM-Notiz vorhanden' : '',
    input.unresolvedPlaceholders?.length ? `offene Platzhalter: ${input.unresolvedPlaceholders.join(', ')}` : '',
    input.body ?? ''
  ].join('\n');

  const scan = scanSensitiveExportText(text, { context: 'BEM-Dokumentenexport', target: input.title ?? 'BEM-Dokument' });

  const findings = new Set(scan.findings);
  if (input.containsConfidentialNotes) findings.add('vertrauliche BEM-Notiz');
  if (input.unresolvedPlaceholders?.length) findings.add('nicht aufgelöste BEM-Platzhalter');

  return {
    ...scan,
    riskLevel: 'critical',
    findings: Array.from(findings),
    requiresExplicitConfirmation: true
  };
}
