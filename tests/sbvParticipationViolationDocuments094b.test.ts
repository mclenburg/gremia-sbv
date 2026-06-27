import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { SbvParticipationViolationDocumentService } from '../services/sbvParticipationViolationDocumentService';
import { SbvParticipationViolationTemplateService } from '../services/sbvParticipationViolationTemplateService';

type Row = Record<string, unknown>;

class DocumentDb implements DatabaseAdapter {
  violations: Row[] = [{
    id: 'vio-1', stage: 'abmahnung', status: 'sent', violation_type: 'repeated_violation', source_context_type: 'case', source_context_id: 'case-1', case_id: 'case-1',
    related_participation_id: null, related_termination_hearing_id: null, related_deadline_id: null, related_activity_journal_entry_id: null, related_sbv_control_protocol_id: null,
    subject: 'SBV-Anhörung erneut übergangen', measure_description: 'Der Arbeitgeber setzte eine Maßnahme mit SBV-Bezug fort.', wrong_behavior: 'Die SBV wurde wiederholt nicht vor der Entscheidung angehört.', required_behavior: 'Die SBV ist unverzüglich und umfassend zu unterrichten und vor Entscheidung anzuhören.', consequence_warning: 'Bei Wiederholung werden gerichtliche Schritte und ein OWi-Hinweis geprüft.', legal_basis: '§ 178 Abs. 2 SGB IX; § 238 Abs. 1 Nr. 8 SGB IX', follow_up_due_at: null, created_at: '2026-06-01T10:00:00.000Z', updated_at: '2026-06-01T10:00:00.000Z', sent_at: null, closed_at: null,
  }];
  events: Row[] = [];
  generatedDocuments: Row[] = [];
  violationDocuments: Row[] = [];
  audit: Row[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      all(...params: unknown[]): T[] {
        if (normalized.includes('SELECT * FROM sbv_participation_violation_documents WHERE violation_id = ?')) return self.violationDocuments.filter((row) => row.violation_id === params[0]) as T[];
        if (normalized.includes('SELECT * FROM sbv_participation_violations')) return self.violations as T[];
        return [] as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (normalized.includes('SELECT * FROM sbv_participation_violations WHERE id = ?')) return self.violations.find((row) => row.id === params[0]) as T | undefined;
        if (normalized.includes('SELECT 1 AS value FROM cases WHERE id = ?')) return { value: 1 } as T;
        if (normalized.includes('SELECT sequence, entry_hash FROM personal_data_audit_log ORDER BY sequence DESC LIMIT 1')) return self.audit.at(-1) as T | undefined;
        return undefined;
      },
      run(...params: unknown[]): { changes: number } {
        if (normalized.includes('INSERT INTO generated_documents')) {
          self.generatedDocuments.push({ id: params[0], case_id: params[1], template_id: params[2], violation_id: params[3], document_kind: params[4], template_version: params[5], title: params[6], storage_path: params[7], filename: params[8], mime_type: params[9], sha256: params[10], document_key: params[11], iv: params[12], auth_tag: params[13], size_bytes: params[14], created_at: params[15] });
          return { changes: 1 };
        }
        if (normalized.includes('INSERT INTO sbv_participation_violation_documents')) {
          self.violationDocuments.push({ id: params[0], violation_id: params[1], document_id: params[2], stage: params[3], template_key: params[4], template_version: params[5], immutable_snapshot: 1, created_at: params[6] });
          return { changes: 1 };
        }
        if (normalized.includes('INSERT INTO sbv_participation_violation_events')) {
          self.events.push({ id: params[0], violation_id: params[1], event_type: 'document_generated', from_status: params[2], to_status: params[3], note: params[4], created_at: params[5] });
          return { changes: 1 };
        }
        if (normalized.includes('INSERT INTO personal_data_audit_log')) {
          self.audit.push({ id: params[0], sequence: params[1], entry_hash: params[11], metadata_json: params[9] });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }
  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('Beteiligungsverstoß-Dokumente 0.9.4-b', () => {
  it('validiert Eskalationsstufen nach Pflichtfeldern statt freie Textgeneratoren zu erlauben', () => {
    const service = new SbvParticipationViolationTemplateService();
    const result = service.validate({
      stage: 'abmahnung', subject: 'fehlende Anhörung', sourceReference: 'Fall SBV-1', measureDescription: 'Maßnahme', wrongBehavior: 'nicht angehört', requiredBehavior: 'vor Entscheidung anhören', includeOwiHint: false, includeLegalReviewHint: true, privacyMode: 'case_reference',
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('Konsequenzwarnung');
  });

  it('erzeugt ein DOCX nur bewusst, verschlüsselt als gsbvdoc und schreibt nur Metadaten in Verlauf und Audit', async () => {
    const db = new DocumentDb();
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-violation-doc-'));
    try {
      const result = await new SbvParticipationViolationDocumentService(db, () => dir).generateDocument('vio-1');

      expect(result.filename).toMatch(/\.docx$/);
      expect(result.storagePath).toMatch(/\.gsbvdoc$/);
      expect(readFileSync(result.storagePath).subarray(0, 2).toString()).not.toBe('PK');
      expect(db.generatedDocuments[0]).toMatchObject({ document_kind: 'sbv_participation_violation', template_version: '0.9.4-v1', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      expect(db.violationDocuments[0]).toMatchObject({ violation_id: 'vio-1', immutable_snapshot: 1 });
      expect(db.events.map((event) => event.event_type)).toContain('document_generated');
      const auditJson = db.audit.map((row) => String(row.metadata_json)).join('\n');
      expect(auditJson).toContain('sbv-participation-violation-abmahnung');
      expect(auditJson).not.toContain('wiederholt nicht vor der Entscheidung');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('nutzt einen injizierten Violation-Service statt im Dokumentpfad hart zu koppeln', async () => {
    const db = new DocumentDb();
    const dir = mkdtempSync(path.join(tmpdir(), 'gremia-violation-doc-injected-'));
    const injectedReader = {
      get: (violationId: string) => {
        expect(violationId).toBe('vio-injected');
        return {
          id: 'vio-injected',
          stage: 'request' as const,
          status: 'open' as const,
          violationType: 'not_heard' as const,
          sourceContextType: 'case' as const,
          sourceContextId: 'case-1',
          caseId: 'case-1',
          subject: 'Anhörung nachholen',
          measureDescription: 'Eine SBV-relevante Maßnahme wurde vorbereitet.',
          wrongBehavior: 'Die SBV wurde nicht vor der Entscheidung angehört.',
          requiredBehavior: 'Die SBV ist vor der Entscheidung vollständig zu beteiligen.',
          legalBasis: '§ 178 Abs. 2 SGB IX',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
        };
      },
    };
    try {
      const result = await new SbvParticipationViolationDocumentService(db, () => dir, injectedReader).generateDocument('vio-injected');

      expect(result.templateKey).toBe('sbv-participation-violation-request');
      expect(db.generatedDocuments[0]).toMatchObject({ violation_id: 'vio-injected', document_kind: 'sbv_participation_violation' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

});
