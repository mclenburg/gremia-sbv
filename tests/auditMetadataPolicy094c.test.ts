import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata } from '../services/auditHashChain';
import {
  AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE,
  allowedAuditMetadataFields,
  auditMetadataPolicyReport,
  hasAuditMetadataPolicy,
} from '../services/auditMetadataPolicy';
import { AUDIT_SUBJECT_TYPES } from '../services/auditEventBuilders';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return sourceFiles(fullPath);
    return fullPath.endsWith('.ts') ? [fullPath] : [];
  });
}

function literalAuditSubjectTypes(): string[] {
  const matches = new Set<string>();
  for (const file of sourceFiles('services')) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/subjectType:\s*['"]([^'"]+)['"]/g)) {
      matches.add(match[1]);
    }
  }
  return Array.from(matches).sort();
}

describe('Audit-Metadatenpolicy 0.9.4c', () => {
  it('filtert Metadaten anhand der Ereignisfamilie statt über eine globale Zufalls-Whitelist', () => {
    const violationMetadata = normalizeAuditMetadata(
      {
        stage: 'abmahnung',
        status: 'sent',
        violationType: 'not_heard',
        sourceContextType: 'sbv_participation',
        hasFollowUp: true,
        templateKey: 'sbv_violation_abmahnung',
        wrongBehavior: 'Max Mustermann wurde ohne SBV-Anhörung umgesetzt.',
      },
      'sbv_participation_violation',
    );

    expect(violationMetadata).toContain('abmahnung');
    expect(violationMetadata).toContain('not_heard');
    expect(violationMetadata).toContain('true');
    expect(violationMetadata).not.toContain('templateKey');
    expect(violationMetadata).not.toMatch(/Max Mustermann|Anhörung/);

    const documentMetadata = normalizeAuditMetadata(
      {
        violationId: 'violation-1',
        stage: 'abmahnung',
        templateKey: 'sbv_participation_violation_abmahnung',
        templateVersion: '0.9.4-v1',
        documentKind: 'sbv_participation_violation',
        measureDescription: 'Klartext zur Maßnahme',
      },
      'sbv_participation_violation_document',
    );

    expect(documentMetadata).toContain('sbv_participation_violation_abmahnung');
    expect(documentMetadata).toContain('0.9.4-v1');
    expect(documentMetadata).not.toContain('measureDescription');
    expect(documentMetadata).not.toContain('Klartext');
  });

  it('laesst bei unbekannten Ereignisfamilien nur Kernreferenzen zu', () => {
    const metadata = normalizeAuditMetadata(
      {
        subjectId: 'subject-1',
        caseId: 'case-1',
        status: 'sent',
        stage: 'abmahnung',
        templateKey: 'template-1',
      },
      'neues_modul_ohne_policy',
    );

    expect(metadata).toContain('subject-1');
    expect(metadata).toContain('case-1');
    expect(metadata).not.toContain('sent');
    expect(metadata).not.toContain('abmahnung');
    expect(metadata).not.toContain('template-1');
  });

  it('deckt alle im Service-Code verwendeten Audit-SubjectTypes mit einer expliziten Policy ab', () => {
    const subjectTypes = Array.from(new Set([
      ...literalAuditSubjectTypes(),
      ...Object.values(AUDIT_SUBJECT_TYPES),
    ])).sort();
    const report = auditMetadataPolicyReport(subjectTypes);

    expect(report.missing).toEqual([]);
    for (const subjectType of subjectTypes) {
      expect(hasAuditMetadataPolicy(subjectType)).toBe(true);
      expect(allowedAuditMetadataFields(subjectType).has('subjectId')).toBe(true);
      expect(allowedAuditMetadataFields(subjectType).has('caseId')).toBe(true);
    }
  });

  it('haelt die neuen sensiblen 0.9.3/0.9.4-Ereignisfamilien getrennt', () => {
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.activity_journal).toContain('entryDate');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.activity_journal).not.toContain('templateKey');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation).toContain('violationType');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation).not.toContain('measureDescription');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation_document).toContain('templateVersion');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation_document).not.toContain('wrongBehavior');
  });
});
