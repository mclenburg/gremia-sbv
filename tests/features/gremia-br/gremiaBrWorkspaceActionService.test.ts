import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { GeneratedDocumentStoreService } from '../../../services/generatedDocumentStoreService';
import { GremiaBrWorkspaceActionService } from '../../../services/gremiaBr/gremiaBrWorkspaceActionService';
import type { GremiaBrReadContext, GremiaBrRequestOptions } from '../../../services/gremiaBr/gremiaBrTypes';
import { openTestDatabase } from '../../helpers/openTestDatabase';
import { inspectPdf } from '../../helpers/pdf';

type PostedRequest = {
  path: string;
  options?: GremiaBrRequestOptions;
};

class GremiaBrActionAuthFake {
  readonly posted: PostedRequest[] = [];

  constructor(
    private readonly context: GremiaBrReadContext = {
      apiMode: 'gremia_br_v2',
      selectedBodyId: 'body-sbv',
      selectedBodyName: 'SBV Musterbetrieb',
      selectedOrganizationId: 'org-1',
      selectedSecurityDomain: 'SBV',
    },
    private readonly agenda: unknown = [],
    private readonly uploadResponse: unknown = { documentId: 'br-doc-1', documentVersionId: 'br-version-1', state: 'READY' },
    private readonly shareResponse: unknown = { id: 'share-1', status: 'ACTIVE', requirement: 'NONE' },
  ) {}

  getReadContext(): GremiaBrReadContext {
    return this.context;
  }

  async get<T>(requestPath: string, _options?: GremiaBrRequestOptions): Promise<T> {
    if (requestPath.includes('/agenda')) return this.agenda as T;
    throw new Error(`Unerwarteter Gremia.BR-Testabruf: ${requestPath}`);
  }

  async post<T>(requestPath: string, options?: GremiaBrRequestOptions): Promise<T> {
    this.posted.push({ path: requestPath, options });
    if (requestPath === '/api/v1/documents') return this.uploadResponse as T;
    if (requestPath.includes('/shares')) return this.shareResponse as T;
    if (requestPath.includes('/agenda')) return { agendaVersionId: 'agenda-version-2' } as T;
    throw new Error(`Unerwartete Gremia.BR-Testaktion: ${requestPath}`);
  }
}

async function createFixture(): Promise<{ database: DatabaseAdapter; storageRoot: string }> {
  const database = await openTestDatabase();
  database.exec(fs.readFileSync('database/schema.sql', 'utf8'));
  const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-br-actions-'));
  return { database, storageRoot };
}

function insertCaseFixture(database: DatabaseAdapter): void {
  database.prepare(`
    INSERT INTO protected_persons (
      id, created_at, updated_at, first_name, last_name, organizational_unit,
      employment_state, protection_status, status_source, lifecycle_state
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'person-1',
    '2026-08-20T08:00:00.000Z',
    '2026-08-20T08:00:00.000Z',
    'Ada',
    'Beispiel',
    'Produktion',
    'active_employee',
    'severely_disabled',
    'document_presented',
    'active',
  );
  database.prepare(`
    INSERT INTO cases (
      id, case_number, display_name, category, status, priority, opened_at,
      summary, risk_level, protected_person_id, person_binding_state, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'case-1',
    'SBV-2026-001',
    'Arbeitsplatzanpassung Montage',
    'arbeitsplatz',
    'offen',
    'hoch',
    '2026-08-21T09:00:00.000Z',
    'Arbeitgeber plant Versetzung ohne vollständige Beteiligungsunterlagen.',
    'hoch',
    'person-1',
    'active',
    '2026-08-21T09:00:00.000Z',
    '2026-08-21T09:00:00.000Z',
  );
  database.prepare(`
    INSERT INTO case_measures (
      id, case_id, type, title, status, risk_level, summary, next_step,
      due_at, opened_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'measure-1',
    'case-1',
    'participation',
    'Unterlagen beim Arbeitgeber nachfordern',
    'open',
    'hoch',
    'Informationen zur Maßnahme fehlen.',
    'BR über Beteiligungsdefizit informieren.',
    '2026-08-30T12:00:00.000Z',
    '2026-08-21T09:00:00.000Z',
    '2026-08-21T09:00:00.000Z',
    '2026-08-21T09:00:00.000Z',
  );
  database.prepare(`
    INSERT INTO deadlines (
      id, case_id, process_type, deadline_type, title, due_at, severity, status,
      calculation_mode, legal_basis, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'deadline-1',
    'case-1',
    'case',
    'follow_up',
    'Rückmeldung Arbeitgeber prüfen',
    '2026-08-31T12:00:00.000Z',
    'important',
    'open',
    'manual',
    '§ 178 Abs. 2 SGB IX',
    '2026-08-21T09:00:00.000Z',
    '2026-08-21T09:00:00.000Z',
  );
}

describe('GremiaBrWorkspaceActionService', () => {
  it('erstellt eine BR-Fallzusammenfassung über zentrale PDF-Erzeugung und verschlüsselte Dokumentablage', async () => {
    const { database, storageRoot } = await createFixture();
    try {
      insertCaseFixture(database);
      const service = new GremiaBrWorkspaceActionService(database, () => storageRoot, new GremiaBrActionAuthFake());

      const record = await service.createCaseSummaryDocument({
        caseId: 'case-1',
        purpose: 'Information des Betriebsrats zur geplanten Maßnahme',
        recipientLabel: 'Betriebsrat',
      });
      const plain = await new GeneratedDocumentStoreService(database, storageRoot).read(record.id);
      const text = (await inspectPdf(plain)).textByPage.join(' ');

      expect(record).toMatchObject({
        title: 'Fallzusammenfassung für Gremia.BR: SBV-2026-001',
        filename: 'fallzusammenfassung-gremia-br-SBV-2026-001.pdf',
        mimeType: 'application/pdf',
      });
      expect(text).toContain('Fallzusammenfassung für Gremia.BR');
      expect(text).toContain('Information des Betriebsrats zur geplanten Maßnahme');
      expect(text).toContain('Arbeitsplatzanpassung Montage');
      expect(text).toContain('BR über Beteiligungsdefizit informieren.');
      expect(text).not.toContain('case-1');
    } finally {
      database.close();
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });

  it('überträgt nur erzeugte PDFs und protokolliert Upload und Freigabe nachvollziehbar', async () => {
    const { database, storageRoot } = await createFixture();
    try {
      insertCaseFixture(database);
      const store = new GeneratedDocumentStoreService(database, storageRoot);
      const document = await store.store({
        source: 'document',
        caseId: 'case-1',
        title: 'Fallzusammenfassung für BR',
        filename: 'fallzusammenfassung.pdf',
        mimeType: 'application/pdf',
        plain: Buffer.from('%PDF-1.7\nSBV Dokument'),
      });
      const auth = new GremiaBrActionAuthFake();
      const service = new GremiaBrWorkspaceActionService(database, () => storageRoot, auth);

      const result = await service.transferGeneratedPdf({
        documentId: document.id,
        targetSecurityDomain: 'BR',
        targetBodyName: 'Betriebsrat',
        purpose: 'BR soll die Beteiligung in der nächsten Sitzung behandeln.',
        protectionClass: 'HIGH',
      });
      const actions = database.prepare<{ action_type: string; status: string; remote_document_id: string | null; remote_share_id: string | null }>(`
        SELECT action_type, status, remote_document_id, remote_share_id
        FROM gremia_br_workspace_actions
        ORDER BY created_at ASC
      `).all();
      const audits = database.prepare<{ count: number }>(`
        SELECT COUNT(*) AS count
        FROM personal_data_audit_log
        WHERE subject_type = 'gremia_br_workspace_action'
      `).get();

      expect(auth.posted.map((request) => request.path)).toEqual([
        '/api/v1/documents',
        '/api/v1/documents/br-doc-1/shares',
      ]);
      expect(auth.posted[0].options?.formData?.get('title')).toBe('Fallzusammenfassung für BR');
      expect(auth.posted[0].options?.formData?.get('bodyId')).toBe('body-sbv');
      expect(auth.posted[0].options?.formData?.get('protectionClass')).toBe('HIGH');
      expect(auth.posted[1].options?.body).toMatchObject({
        targetSecurityDomain: 'BR',
        purpose: 'BR soll die Beteiligung in der nächsten Sitzung behandeln.',
        documentVersionId: 'br-version-1',
      });
      expect(result).toMatchObject({
        localDocumentId: document.id,
        remoteDocumentId: 'br-doc-1',
        remoteShareId: 'share-1',
        targetSecurityDomain: 'BR',
        status: 'shared',
      });
      expect(actions).toEqual([
        { action_type: 'document_uploaded', status: 'uploaded', remote_document_id: 'br-doc-1', remote_share_id: null },
        { action_type: 'document_shared', status: 'shared', remote_document_id: 'br-doc-1', remote_share_id: 'share-1' },
      ]);
      expect(audits?.count).toBe(2);
    } finally {
      database.close();
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });

  it('meldet einen von Gremia.BR abgelehnten Dokument-Upload ohne nachfolgende Freigabe', async () => {
    const { database, storageRoot } = await createFixture();
    try {
      insertCaseFixture(database);
      const document = await new GeneratedDocumentStoreService(database, storageRoot).store({
        source: 'document',
        caseId: 'case-1',
        title: 'Fallzusammenfassung für BR',
        filename: 'fallzusammenfassung.pdf',
        mimeType: 'application/pdf',
        plain: Buffer.from('%PDF-1.7\nSBV Dokument'),
      });
      const auth = new GremiaBrActionAuthFake(undefined, [], { uploadId: 'upload-1', state: 'REJECTED', failureCode: 'POLICY' });
      const service = new GremiaBrWorkspaceActionService(database, () => storageRoot, auth);

      await expect(service.transferGeneratedPdf({
        documentId: document.id,
        targetSecurityDomain: 'BR',
        purpose: 'BR soll informiert werden.',
      })).rejects.toThrow('nicht angenommen');

      expect(auth.posted.map((request) => request.path)).toEqual(['/api/v1/documents']);
    } finally {
      database.close();
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });

  it('weist bei Gremia.BR-Freigaben mit Genehmigungspflicht auf den offenen externen Schritt hin', async () => {
    const { database, storageRoot } = await createFixture();
    try {
      insertCaseFixture(database);
      const document = await new GeneratedDocumentStoreService(database, storageRoot).store({
        source: 'document',
        caseId: 'case-1',
        title: 'Fallzusammenfassung für BR',
        filename: 'fallzusammenfassung.pdf',
        mimeType: 'application/pdf',
        plain: Buffer.from('%PDF-1.7\nSBV Dokument'),
      });
      const auth = new GremiaBrActionAuthFake(undefined, [], undefined, { id: 'share-approval-1', status: 'REQUESTED', requirement: 'APPROVAL_AND_STEP_UP' });
      const service = new GremiaBrWorkspaceActionService(database, () => storageRoot, auth);

      const result = await service.transferGeneratedPdf({
        documentId: document.id,
        targetSecurityDomain: 'BR',
        purpose: 'BR soll informiert werden.',
      });
      const shareAction = database.prepare<{ status: string }>(
        "SELECT status FROM gremia_br_workspace_actions WHERE action_type = 'document_shared'",
      ).get();

      expect(result.status).toBe('requested');
      expect(result.message).toContain('wartet dort auf Genehmigung');
      expect(shareAction?.status).toBe('requested');
    } finally {
      database.close();
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });

  it('fordert einen SBV-Tagesordnungspunkt an, ohne bestehende Gremia.BR-Agenda-Items zu verlieren', async () => {
    const { database, storageRoot } = await createFixture();
    try {
      const auth = new GremiaBrActionAuthFake(undefined, {
        items: [{
          id: 'old-item-id',
          itemKey: 'old-item-key',
          title: 'Genehmigung Protokoll',
          type: 'INFORMATION',
          source: 'CHAIR',
          protectionClass: 'INTERNAL',
          timeAllocationMinutes: 5,
        }],
      });
      const service = new GremiaBrWorkspaceActionService(database, () => storageRoot, auth);

      const result = await service.requestAgendaItem({
        meetingId: 'meeting-1',
        title: 'SBV-Beteiligung Arbeitsplatzanpassung',
        description: 'Bitte in der nächsten BR-Sitzung behandeln.',
        protectionClass: 'CONFIDENTIAL',
        timeAllocationMinutes: 15,
      });
      const agendaPost = auth.posted.find((request) => request.path.includes('/agenda'));
      const body = agendaPost?.options?.body as { items: unknown[]; changeNote: string } | undefined;
      const action = database.prepare<{ action_type: string; remote_meeting_id: string; remote_agenda_version_id: string }>(
        'SELECT action_type, remote_meeting_id, remote_agenda_version_id FROM gremia_br_workspace_actions LIMIT 1',
      ).get();

      expect(body?.items).toHaveLength(2);
      expect(body?.items[0]).toMatchObject({ itemKey: 'old-item-key', title: 'Genehmigung Protokoll' });
      expect(body?.items[1]).toMatchObject({
        title: 'SBV-Beteiligung Arbeitsplatzanpassung',
        source: 'SBV_REQUEST',
        type: 'CONSULTATION',
        protectionClass: 'CONFIDENTIAL',
      });
      expect(body?.changeNote).toBe('SBV-Anforderung aus Gremia.SBV');
      expect(result).toMatchObject({
        meetingId: 'meeting-1',
        agendaVersionId: 'agenda-version-2',
        status: 'requested',
      });
      expect(action).toEqual({
        action_type: 'agenda_item_requested',
        remote_meeting_id: 'meeting-1',
        remote_agenda_version_id: 'agenda-version-2',
      });
    } finally {
      database.close();
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });

  it('blockiert Aktionen ohne ausgewählten Gremia.BR-2.0-Arbeitsbereich mit konkreter Nutzerführung', async () => {
    const { database, storageRoot } = await createFixture();
    try {
      const service = new GremiaBrWorkspaceActionService(database, () => storageRoot, new GremiaBrActionAuthFake({
        apiMode: 'legacy_read_bridge',
      }));

      await expect(service.requestAgendaItem({ meetingId: 'meeting-1', title: 'TOP' }))
        .rejects.toThrow('Gremia.BR-2.0');
    } finally {
      database.close();
      fs.rmSync(storageRoot, { recursive: true, force: true });
    }
  });
});
