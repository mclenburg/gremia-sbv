import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata } from '../../services/auditHashChain';
import {
  AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE,
  allowedAuditMetadataFields,
} from '../../services/auditMetadataPolicy';
import { AUDIT_SUBJECT_TYPES } from '../../services/auditEventBuilders';

describe('Audit-Metadatenpolicy 0.9.4c', () => {
  it('schreibt keine frei eingegebene Sicherheitsdomäne ins Audit', () => {
    const metadata = JSON.parse(normalizeAuditMetadata({
      actionType: 'document_shared', targetSecurityDomain: 'Vertrauliche Fallakte', status: 'success',
    }, 'gremia_br_workspace_action'));
    expect(metadata).toMatchObject({ actionType: 'document_shared', status: 'success' });
    expect(metadata).not.toHaveProperty('targetSecurityDomain');
  });
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

  it('deckt alle registrierten Audit-Ereignisfamilien mit einer expliziten Policy ab', () => {
    for (const subjectType of Object.values(AUDIT_SUBJECT_TYPES)) {
      expect(Object.hasOwn(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE, subjectType)).toBe(true);
      expect(allowedAuditMetadataFields(subjectType).has('subjectId')).toBe(true);
      expect(allowedAuditMetadataFields(subjectType).has('caseId')).toBe(true);
    }
  });

  it('beschraenkt 0.9.7-A-Auditmetadaten auf technische Referenzen', () => {
    const hold = JSON.parse(normalizeAuditMetadata({
      ownerType: 'election', ownerId: 'election-1', reasonKey: 'challenge.pending', released: false,
      freeText: 'personenbezogene Begründung',
    }, 'retention_legal_hold'));
    expect(hold).toMatchObject({ ownerType: 'election', ownerId: 'election-1', reasonKey: 'challenge.pending', released: false });
    expect(hold).not.toHaveProperty('freeText');

    const transfer = JSON.parse(normalizeAuditMetadata({
      formatVersion: 1, manifestHash: 'a'.repeat(64), result: 'imported', payload: 'Wahlakteninhalt',
    }, 'election_transfer'));
    expect(transfer).toMatchObject({ formatVersion: 1, manifestHash: 'a'.repeat(64), result: 'imported' });
    expect(transfer).not.toHaveProperty('payload');

    const document = JSON.parse(normalizeAuditMetadata({
      ownerType: 'meeting', ownerId: 'meeting-1', documentClass: 'generated_document', title: 'Vertraulicher Titel',
    }, 'sbv_office_document'));
    expect(document).toMatchObject({ ownerType: 'meeting', ownerId: 'meeting-1', documentClass: 'generated_document' });
    expect(document).not.toHaveProperty('title');

    const election = JSON.parse(normalizeAuditMetadata({
      entityType: 'candidate', officeType: 'representative', result: 'criteria_met',
      personSnapshot: 'Max Mustermann', freeText: 'vertrauliche Wahlinformation',
    }, 'election'));
    expect(election).toMatchObject({ entityType: 'candidate', officeType: 'representative', result: 'criteria_met' });
    expect(election).not.toHaveProperty('personSnapshot');
    expect(election).not.toHaveProperty('freeText');
  });

  it('haelt die neuen sensiblen 0.9.3/0.9.4-Ereignisfamilien getrennt', () => {
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.activity_journal).toContain('entryDate');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.activity_journal).not.toContain('templateKey');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation).toContain('violationType');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation).not.toContain('measureDescription');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation_document).toContain('templateVersion');
    expect(AUDIT_METADATA_POLICY_BY_SUBJECT_TYPE.sbv_participation_violation_document).not.toContain('wrongBehavior');
  });

  it('protokolliert von der automatischen Klartextbereinigung nur datensparsame Zähler', () => {
    const metadata = JSON.parse(normalizeAuditMetadata({
      eventType: 'cleanup',
      converted: 2,
      recoveredExisting: 1,
      invalidPdf: 1,
      unsupported: 3,
      symbolicLinks: 1,
      failed: 1,
      requiresReview: 6,
      filePath: 'exports/vertraulicher-tätigkeitsbericht.pdf',
    }, 'security_session'));

    expect(metadata).toMatchObject({
      eventType: 'cleanup',
      converted: 2,
      recoveredExisting: 1,
      invalidPdf: 1,
      unsupported: 3,
      symbolicLinks: 1,
      failed: 1,
      requiresReview: 6,
    });
    expect(metadata).not.toHaveProperty('filePath');
  });
});
