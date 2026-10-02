import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from '../databaseService.js';
import type { GremiaBrAuthService } from './gremiaBrAuthService.js';
import type { GremiaBrExternalReferenceService } from './gremiaBrExternalReferenceService.js';
import { GremiaBrHttpError } from './gremiaBrHttpClient.js';
import { gremiaBrRecord } from './gremiaBrPayload.js';
import type { CreateGremiaBrRemoteCaseInput, GremiaBrCaseCreationRecord, GremiaBrProcedureTypeOption } from '../../src/domain/models/gremia-br.model.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';

interface CreationRow {
  id: string;
  local_case_id: string;
  organization_id: string;
  security_domain: string;
  procedure_type: string;
  remote_case_id: string | null;
  remote_case_reference: string | null;
  remote_procedure_id: string | null;
  status: GremiaBrCaseCreationRecord['status'];
  correlation_id: string;
}

function toRecord(row: CreationRow): GremiaBrCaseCreationRecord {
  return {
    id: row.id, localCaseId: row.local_case_id, procedureType: row.procedure_type, status: row.status,
    ...(row.remote_case_reference ? { remoteCaseReference: row.remote_case_reference } : {}),
  };
}

export class GremiaBrCaseCreationService {
  constructor(
    private readonly getDatabase: () => DatabaseAdapter,
    private readonly auth: Pick<GremiaBrAuthService, 'get' | 'post' | 'getReadContext'>,
    private readonly references: Pick<GremiaBrExternalReferenceService, 'createOrUpdate'>,
  ) {}

  async listProcedureTypes(): Promise<GremiaBrProcedureTypeOption[]> {
    const response = await this.auth.get<unknown>('/api/v1/procedure-types');
    if (!Array.isArray(response)) throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR hat keine gültigen Verfahrensarten geliefert.');
    return response.map(gremiaBrRecord).filter((item) => item?.audience === 'sbv').map((item) => {
      if (!item || typeof item.id !== 'string' || !item.id.trim() || typeof item.title !== 'string' || !item.title.trim()) {
        throw new ApplicationError('REMOTE_READ_FAILED', 'Gremia.BR hat eine unvollständige SBV-Verfahrensart geliefert.');
      }
      return { id: item.id, title: item.title };
    });
  }

  pendingForCase(localCaseId: string): GremiaBrCaseCreationRecord | null {
    const row = this.getDatabase().prepare<CreationRow>(`
      SELECT id, local_case_id, organization_id, security_domain, procedure_type, remote_case_id, remote_case_reference, remote_procedure_id, status, correlation_id
      FROM gremia_br_case_creations WHERE local_case_id = ? AND status != 'completed'
    `).get(localCaseId);
    return row ? toRecord(row) : null;
  }

  async create(input: CreateGremiaBrRemoteCaseInput): Promise<GremiaBrCaseCreationRecord> {
    const localCaseId = typeof input.localCaseId === 'string' ? input.localCaseId.trim() : '';
    const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
    const procedureType = typeof input.procedureType === 'string' ? input.procedureType.trim() : '';
    if (!localCaseId || localCaseId.length > 120 || !subject || subject.length > 512 || !procedureType || procedureType.length > 128) {
      throw new ApplicationError('VALIDATION_FAILED', 'Bitte Fallakte, Sachverhalt und SBV-Verfahrensart prüfen.');
    }
    const database = this.getDatabase();
    const localCase = database.prepare<{ id: string }>('SELECT id FROM cases WHERE id = ?').get(localCaseId);
    if (!localCase) throw new ApplicationError('NOT_FOUND', 'Die ausgewählte lokale Fallakte wurde nicht gefunden.');
    if (this.pendingForCase(localCaseId)) throw new ApplicationError('CONFLICT', 'Für diese Fallakte ist eine Anlage offen. Bitte diese zuerst fortsetzen oder prüfen.');
    if (database.prepare('SELECT id FROM gremia_br_case_creations WHERE local_case_id = ? AND procedure_type = ? AND status = ?').get(localCaseId, procedureType, 'completed')) {
      throw new ApplicationError('CONFLICT', 'Diese Verfahrensart wurde für die Fallakte bereits angelegt. Bitte die bestehende Verknüpfung prüfen.');
    }
    const context = this.auth.getReadContext();
    const organizationId = context.selectedOrganizationId?.trim();
    const securityDomain = context.selectedSecurityDomain?.trim();
    if (!organizationId || !securityDomain) throw new ApplicationError('VALIDATION_FAILED', 'Bitte zuerst Organisation und SBV-Sicherheitsbereich in Gremia.BR auswählen.');
    const correlationId = randomUUID();
    const types = await this.auth.get<unknown>('/api/v1/procedure-types', { correlationId });
    if (!Array.isArray(types) || !types.map(gremiaBrRecord).some((item) => item?.id === procedureType && item.audience === 'sbv')) {
      throw new ApplicationError('VALIDATION_FAILED', 'Diese SBV-Verfahrensart ist nicht mehr verfügbar. Bitte die Auswahl bewusst neu laden.');
    }
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    database.prepare(`INSERT INTO gremia_br_case_creations
      (id, local_case_id, organization_id, security_domain, procedure_type, status, correlation_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'case_submission_pending', ?, ?, ?)`).run(id, localCaseId, organizationId, securityDomain, procedureType, correlationId, timestamp, timestamp);
    let remote: Record<string, unknown> | null;
    try {
      remote = gremiaBrRecord(await this.auth.post<unknown>('/api/v1/cases', {
        correlationId,
        body: { organizationId, origin: 'DISABILITY_REPRESENTATION', subject, securityDomain },
      })) ?? null;
    } catch (error) {
      if (error instanceof GremiaBrHttpError && [400, 403, 404, 422].includes(error.status)) {
        database.prepare('DELETE FROM gremia_br_case_creations WHERE id = ?').run(id);
        throw error;
      }
      this.setStatus(id, 'needs_review');
      return this.record(id);
    }
    if (!remote || typeof remote.id !== 'string' || !remote.id || typeof remote.reference !== 'string'
      || remote.organizationId !== organizationId || remote.origin !== 'DISABILITY_REPRESENTATION' || remote.subject !== subject) {
      this.setStatus(id, 'needs_review');
      return this.record(id);
    }
    database.prepare(`UPDATE gremia_br_case_creations SET remote_case_id = ?, remote_case_reference = ?, status = 'case_created', updated_at = ? WHERE id = ?`)
      .run(remote.id, remote.reference, new Date().toISOString(), id);
    return this.finishProcedure(this.row(id));
  }

  async resume(id: string): Promise<GremiaBrCaseCreationRecord> {
    const row = this.row(id);
    if (row.status === 'procedure_created') return this.finishLink(row);
    if (row.status !== 'case_created' || !row.remote_case_id) {
      throw new ApplicationError('CONFLICT', 'Diese Anlage kann nicht automatisch fortgesetzt werden. Bitte den Gremia.BR-Stand manuell prüfen.');
    }
    const context = this.auth.getReadContext();
    if (context.selectedSecurityDomain?.trim() !== row.security_domain || context.selectedOrganizationId?.trim() !== row.organization_id) {
      throw new ApplicationError('CONFLICT', 'Organisation oder Sicherheitsbereich haben sich geändert. Bitte den ursprünglichen Gremia.BR-Kontext wieder auswählen.');
    }
    return this.finishProcedure(row);
  }

  private async finishProcedure(row: CreationRow): Promise<GremiaBrCaseCreationRecord> {
    let procedure: Record<string, unknown> | null;
    try {
      procedure = gremiaBrRecord(await this.auth.post<unknown>('/api/v1/procedures', {
        correlationId: row.correlation_id,
        body: { masterCaseId: row.remote_case_id, procedureType: row.procedure_type, securityDomain: row.security_domain },
      })) ?? null;
    } catch (error) {
      if (!(error instanceof GremiaBrHttpError) || ![400, 403, 404, 409, 422].includes(error.status)) this.setStatus(row.id, 'needs_review');
      return this.record(row.id);
    }
    if (!procedure || typeof procedure.id !== 'string' || !procedure.id
      || procedure.masterCaseId !== row.remote_case_id || procedure.procedureType !== row.procedure_type) {
      this.setStatus(row.id, 'needs_review');
      return this.record(row.id);
    }
    this.getDatabase().prepare(`UPDATE gremia_br_case_creations SET remote_procedure_id = ?, status = 'procedure_created', updated_at = ? WHERE id = ?`)
      .run(procedure.id, new Date().toISOString(), row.id);
    return this.finishLink(this.row(row.id));
  }

  private finishLink(row: CreationRow): GremiaBrCaseCreationRecord {
    if (!row.remote_procedure_id || !row.remote_case_reference) throw new ApplicationError('CONFLICT', 'Die Remote-Anlage ist unvollständig. Bitte den Stand manuell prüfen.');
    try {
      this.references.createOrUpdate({
        caseId: row.local_case_id, sourceType: 'verfahren', sourceId: row.remote_procedure_id,
        title: row.remote_case_reference,
      });
    } catch { return toRecord(row); }
    this.setStatus(row.id, 'completed');
    return this.record(row.id);
  }

  private setStatus(id: string, status: CreationRow['status']): void {
    this.getDatabase().prepare('UPDATE gremia_br_case_creations SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id);
  }

  private row(id: string): CreationRow {
    const row = this.getDatabase().prepare<CreationRow>(`
      SELECT id, local_case_id, organization_id, security_domain, procedure_type, remote_case_id, remote_case_reference, remote_procedure_id, status, correlation_id
      FROM gremia_br_case_creations WHERE id = ?
    `).get(id);
    if (!row) throw new ApplicationError('NOT_FOUND', 'Der Anlagevorgang wurde nicht gefunden.');
    return row;
  }

  private record(id: string): GremiaBrCaseCreationRecord { return toRecord(this.row(id)); }
}
