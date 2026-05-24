import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditCaseHandoverExported,
  auditComplianceIncidentCreated,
  auditGremiaBrReadRequest,
  auditMetadataContainsNoDirectIdentifiers,
  auditResourceRecordChanged,
} from '../services/auditEventBuilders';
import { normalizeAuditMetadata } from '../services/auditHashChain';

const projectRoot = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('P9 zentrale Audit-Event-Builder', () => {
  it('baut Compliance-Vorfall-Audits ohne Freitext- oder Personendaten', () => {
    const event = auditComplianceIncidentCreated({
      incidentId: 'incident-123',
      category: 'wrong_export',
      riskLevel: 'high',
      status: 'open',
    });

    expect(event).toMatchObject({
      action: 'create',
      subjectType: 'compliance_incident',
      subjectId: 'incident-123',
    });
    expect(normalizeAuditMetadata(event.metadata)).toContain('wrong_export');
    expect(JSON.stringify(event)).not.toContain('Fallnotizen');
    expect(auditMetadataContainsNoDirectIdentifiers(event.metadata ?? {})).toBe(true);
  });

  it('baut Fallübergabe-Audits nur mit technischen Paket-Metadaten', () => {
    const event = auditCaseHandoverExported({
      packageId: 'handover_abc',
      caseCount: 2,
      measureCount: 3,
      documentCount: 1,
      deadlineCount: 4,
      validUntilPresent: true,
      result: 'success',
    });

    const metadata = normalizeAuditMetadata(event.metadata);
    expect(event).toMatchObject({ action: 'export', subjectType: 'case_handover' });
    expect(metadata).toContain('handover_abc');
    expect(metadata).toContain('caseCount');
    expect(metadata).toContain('validUntilPresent');
    expect(metadata).not.toContain('Max Mustermann');
  });

  it('baut SBV-Ressourcen-Audits mit Record-Typ und Status, aber ohne Titel', () => {
    const event = auditResourceRecordChanged({
      action: 'update',
      recordId: 'resource-1',
      recordType: 'training',
      status: 'approved',
    });

    const metadata = normalizeAuditMetadata(event.metadata);
    expect(event).toMatchObject({
      action: 'update',
      subjectType: 'sbv_resource_record',
      subjectId: 'resource-1',
    });
    expect(metadata).toContain('training');
    expect(metadata).toContain('approved');
    expect(metadata).not.toContain('Schulungstitel');
  });

  it('baut Gremia.BR-Leseaudits mit maskiertem Endpunkt und Ergebnis', () => {
    const event = auditGremiaBrReadRequest({
      endpoint: 'GET /sitzungen/kommende',
      outcome: 'ok',
      status: 200,
    });

    expect(event).toMatchObject({
      action: 'read',
      subjectType: 'gremia_br_http_request',
      subjectId: 'GET /sitzungen/kommende',
    });
    expect(event.metadata).toMatchObject({ endpoint: 'GET /sitzungen/kommende', outcome: 'ok', status: 200 });
  });

  it('verschiebt freie Audit-Objektliterale aus den P9-Zielservices in zentrale Builder', () => {
    const files = [
      'services/complianceIncidentService.ts',
      'services/caseHandoverService.ts',
      'services/sbvResourceService.ts',
      'services/gremiaBr/gremiaBrHttpClient.ts',
    ];
    const offenders = files
      .map((file) => ({ file, content: source(file) }))
      .filter(({ content }) => /\.append\(\s*\{/.test(content))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
