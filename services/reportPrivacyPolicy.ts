const AKTENZEICHEN_PATTERN = /\b(?:SBV|BEM|GDB|GL|KÜ|KUEND|KND|CASE)[-_\/ ]?\d{2,4}[-_\/ ]?\d{1,6}\b/giu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_PATTERN = /(?:\+\d{1,3}[\s/-]?)?(?:\(?\d{2,5}\)?[\s/-]?)?\d{3,}[\s/-]?\d{2,}/g;
const HEALTH_HINT_PATTERN = /\b(?:Diagnose|Depression|Burnout|Krebs|Therapie|Medikation|Attest|Krankschreibung|Arbeitsunfähigkeit|AU|GdB|Merkzeichen)\b/giu;

export interface ReportPrivacyFinding {
  type: 'aktenzeichen' | 'email' | 'phone' | 'health_hint' | 'small_group';
  riskLevel: 'warning' | 'critical';
  value: string;
  message: string;
}

export function minimumReportGroupSize(value: number | undefined, fallback = 3): number {
  const normalized = Number.isFinite(value) ? Number(value) : fallback;
  return Math.max(3, Math.trunc(normalized));
}

function pushRegexFindings(findings: ReportPrivacyFinding[], text: string, regex: RegExp, type: ReportPrivacyFinding['type'], riskLevel: ReportPrivacyFinding['riskLevel'], message: string): void {
  for (const match of text.matchAll(regex)) {
    if (!match[0]) continue;
    findings.push({ type, riskLevel, value: match[0], message });
  }
}

export function scanReportTextForPrivacyRisks(text: string, options: { minimumGroupSize?: number; groupCounts?: Record<string, number> } = {}): ReportPrivacyFinding[] {
  const findings: ReportPrivacyFinding[] = [];
  pushRegexFindings(findings, text, AKTENZEICHEN_PATTERN, 'aktenzeichen', 'critical', 'Aktenzeichen dürfen im anonymisierten Bericht nicht erscheinen.');
  pushRegexFindings(findings, text, EMAIL_PATTERN, 'email', 'critical', 'E-Mail-Adressen sind personenbezogene Daten.');
  pushRegexFindings(findings, text, PHONE_PATTERN, 'phone', 'warning', 'Telefonnummern sollten in anonymisierten Berichten nicht erscheinen.');
  pushRegexFindings(findings, text, HEALTH_HINT_PATTERN, 'health_hint', 'warning', 'Gesundheitsbezogene Einzelangaben prüfen.');

  const min = minimumReportGroupSize(options.minimumGroupSize);
  for (const [label, count] of Object.entries(options.groupCounts ?? {})) {
    if (count > 0 && count < min) {
      findings.push({ type: 'small_group', riskLevel: 'critical', value: `${label}: ${count}`, message: `Fallzahl kleiner als ${min}; für Tätigkeitsberichte zusammenfassen.` });
    }
  }

  const unique = new Map<string, ReportPrivacyFinding>();
  findings.forEach((finding) => unique.set(`${finding.type}:${finding.value}`, finding));
  return [...unique.values()];
}

export function reportPdfTheme(): 'light-industrial-print' {
  return 'light-industrial-print';
}
