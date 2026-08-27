import type {
  RetentionCandidate,
  RetentionModuleSnapshot,
  RetentionPolicyDefinition,
  RetentionRule,
} from '../models/retention.model.js';

export const RETENTION_POLICY_CATALOG: readonly RetentionPolicyDefinition[] = [
  { module: 'recruiting', label: 'Stellenbesetzungen', rule: { kind: 'months_after_completion', months: 6 }, legalBasis: '§ 15 Abs. 4 AGG / § 61b ArbGG', explanation: 'Prüfung sechs Monate nach Verfahrensabschluss; keine automatische Löschung.' },
  { module: 'termination_hearing', label: 'Kündigungsanhörungen', rule: { kind: 'months_after_completion_year_end', months: 36 }, legalBasis: '§ 195, § 199 BGB / § 178 Abs. 2 SGB IX', explanation: 'Prüfung nach Ablauf von drei Jahren ab Jahresende des Verfahrensabschlusses.' },
  { module: 'bem', label: 'BEM', rule: { kind: 'months_after_completion', months: 36 }, legalBasis: '§ 167 Abs. 2 SGB IX; Art. 5 Abs. 1 lit. e DSGVO', explanation: 'Reguläre Prüfung drei Jahre nach Abschluss; ein Widerruf löst eine sofortige Zweck- und Löschprüfung aus.', immediateOnConsentWithdrawal: true },
  { module: 'prevention', label: 'Prävention', rule: { kind: 'months_after_completion', months: 36 }, legalBasis: '§ 167 Abs. 1 SGB IX; Art. 5 Abs. 1 lit. e DSGVO', explanation: 'Prüfung drei Jahre nach Abschluss der Maßnahme.' },
  { module: 'sbv_participation', label: 'SBV-Beteiligung und Beteiligungsverstöße', rule: { kind: 'term_related', months: 48 }, legalBasis: '§§ 177, 178 SGB IX', explanation: 'Standardmäßig bis zum Ende der vierjährigen Amtszeit; laufende Streit- oder Nachweisinteressen sind gesondert zu prüfen.' },
  { module: 'case_file', label: 'Fallakten und Einzelfallberatung', rule: { kind: 'months_after_completion', months: 36 }, legalBasis: 'Art. 5 Abs. 1 lit. e DSGVO; §§ 195, 199 BGB', explanation: 'Prüfung drei Jahre nach Schließung oder früher bei dokumentiertem Zweckwegfall.' },
  { module: 'activity_journal', label: 'Tätigkeitsjournal', rule: { kind: 'permanent_anonymized' }, legalBasis: '§ 178 SGB IX; Art. 5 Abs. 1 lit. c DSGVO', explanation: 'Dauerhafte gremienbezogene Statistik nur anonymisiert; identifizierende Freitexte folgen dem verknüpften Vorgang.' },
  { module: 'protected_person', label: 'Personen und Kontakte', rule: { kind: 'purpose_linked' }, legalBasis: 'Art. 5 Abs. 1 lit. e, Art. 17 DSGVO; §§ 151, 178 SGB IX', explanation: 'Beschäftigte schwerbehinderte und gleichgestellte Menschen bleiben für Beteiligungsprüfungen im Personenverzeichnis. Andere Personen werden nach Wegfall aller Vorgangsbezüge, ausgeschiedene Beschäftigte ab Vertragsende manuell geprüft.' },
  { module: 'election', label: 'Wahlen und Wahlakten', rule: { kind: 'term_related', months: 48 }, legalBasis: '§ 177 SGB IX / SchwbVWO', explanation: 'Bis zum Ablauf der Amtszeit beziehungsweise zur Übergabe an die neu gewählte SBV; Wahlinhalte bleiben unverändert.' },
  { module: 'workplace_accommodation', label: 'Arbeitsplatzgestaltung', rule: { kind: 'months_after_completion', months: 36 }, legalBasis: '§§ 164, 167 SGB IX; Art. 5 Abs. 1 lit. e DSGVO', explanation: 'Prüfung drei Jahre nach Abschluss, soweit kein aktiver Folge- oder Leistungsbezug besteht.' },
  { module: 'equalization_gdb', label: 'Gleichstellung und GdB-Unterstützung', rule: { kind: 'months_after_completion', months: 36 }, legalBasis: '§§ 2, 151 SGB IX; Art. 5 Abs. 1 lit. e DSGVO', explanation: 'Prüfung drei Jahre nach Verfahrensabschluss; Behörden- oder Rechtsbehelfsfristen gehen vor.' },
  { module: 'compliance_incident', label: 'Compliance- und Datenschutzvorfälle', rule: { kind: 'months_after_completion', months: 36 }, legalBasis: 'Art. 5 Abs. 2, Art. 33, Art. 34 DSGVO', explanation: 'Prüfung drei Jahre nach Abschluss; behördliche Verfahren oder Legal Holds sperren die Löschung.' },
] as const;

const POLICY_BY_MODULE = new Map(RETENTION_POLICY_CATALOG.map((policy) => [policy.module, policy] as const));

function addCalendarMonths(value: Date, months: number): Date {
  const result = new Date(value.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export function retentionReviewDueAt(completedAt: string, rule: RetentionRule): string | undefined {
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return undefined;
  if (rule.kind === 'purpose_linked' || rule.kind === 'permanent_anonymized') return undefined;
  if (rule.kind === 'months_after_completion_year_end') {
    const dueYear = completed.getUTCFullYear() + Math.floor(rule.months / 12);
    return new Date(Date.UTC(dueYear, 11, 31, 23, 59, 59, 999)).toISOString();
  }
  return addCalendarMonths(completed, rule.months).toISOString();
}

export function buildModuleRetentionCandidates(
  snapshots: readonly RetentionModuleSnapshot[],
  now: Date,
): RetentionCandidate[] {
  const candidates: RetentionCandidate[] = [];
  for (const snapshot of snapshots) {
    const policy = POLICY_BY_MODULE.get(snapshot.module);
    if (!policy) continue;
    if (snapshot.module === 'bem' && snapshot.consentWithdrawnAt) {
      candidates.push({
        id: `module-purpose-expiry-${snapshot.module}-${snapshot.id}`,
        type: 'immediate_purpose_expiry_review',
        riskLevel: 'critical',
        title: `${policy.label}: sofortige Zweck- und Löschprüfung`,
        reference: snapshot.title,
        description: 'Die Einwilligung wurde widerrufen. Manuell prüfen, welche Daten mangels anderer Rechtsgrundlage unverzüglich zu löschen sind.',
        recommendedAction: 'loeschen',
        dueSince: snapshot.consentWithdrawnAt,
        entityType: snapshot.module,
        entityId: snapshot.id,
        privacyReviewRequired: true,
        policyKey: snapshot.module,
        legalBasis: policy.legalBasis,
      });
      continue;
    }
    if (snapshot.purposeStillActive || !snapshot.completedAt) continue;
    const dueAt = retentionReviewDueAt(snapshot.completedAt, policy.rule);
    if (!dueAt || new Date(dueAt).getTime() > now.getTime()) continue;
    candidates.push({
      id: `module-retention-${snapshot.module}-${snapshot.id}`,
      type: 'module_retention_review_due',
      riskLevel: 'warning',
      title: `${policy.label}: Lösch- und Datenschutzprüfung fällig`,
      reference: snapshot.title,
      description: `${policy.explanation} Die Löschung bleibt eine bewusste manuelle Entscheidung.`,
      recommendedAction: 'pruefen',
      createdAt: snapshot.completedAt,
      dueSince: dueAt,
      entityType: snapshot.module,
      entityId: snapshot.id,
      caseId: snapshot.caseId ?? undefined,
      privacyReviewRequired: true,
      policyKey: snapshot.module,
      legalBasis: policy.legalBasis,
    });
  }
  return candidates;
}
