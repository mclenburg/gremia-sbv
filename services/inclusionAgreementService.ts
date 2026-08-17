import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import { DeadlineService } from './deadlineService.js';
import type { PersonalDataAuditLogService } from './auditLogService.js';
import {
  REQUIRED_INCLUSION_TOPICS,
  inclusionAgreementClosureState,
} from './inclusionAgreementPolicy.js';
import type {
  InclusionAgreementRecord,
  InclusionAgreementTopicRecord,
  SaveInclusionAgreementInput,
  SaveInclusionAgreementTopicInput,
} from '../src/domain/models/sbv-office-workflow.model.js';

const nowIso = () => new Date().toISOString();
const optionalText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

interface AgreementRow {
  id: string;
  title: string;
  status: InclusionAgreementRecord['status'];
  requested_at: string | null;
  employer_response_at: string | null;
  integration_office_invited_at: string | null;
  signed_at: string | null;
  sent_agency_at: string | null;
  sent_integration_office_at: string | null;
  review_due_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TopicRow {
  id: string;
  agreement_id: string;
  topic_key: InclusionAgreementTopicRecord['topicKey'];
  current_state: string | null;
  sbv_target: string | null;
  employer_position: string | null;
  council_position: string | null;
  result_text: string | null;
  status: string;
}

function mapTopic(row: TopicRow): InclusionAgreementTopicRecord {
  return {
    id: row.id,
    agreementId: row.agreement_id,
    topicKey: row.topic_key,
    currentState: row.current_state ?? undefined,
    sbvTarget: row.sbv_target ?? undefined,
    employerPosition: row.employer_position ?? undefined,
    councilPosition: row.council_position ?? undefined,
    resultText: row.result_text ?? undefined,
    status: row.status,
  };
}

export class InclusionAgreementService {
  constructor(
    private db: DatabaseAdapter,
    private deadlines: DeadlineService = new DeadlineService(db),
    private audit?: PersonalDataAuditLogService,
  ) {}

  list(): InclusionAgreementRecord[] {
    return this.db
      .prepare<AgreementRow>(
        'SELECT * FROM sbv_inclusion_agreements ORDER BY COALESCE(review_due_at,created_at) DESC',
      )
      .all()
      .map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        requestedAt: row.requested_at ?? undefined,
        employerResponseAt: row.employer_response_at ?? undefined,
        integrationOfficeInvitedAt: row.integration_office_invited_at ?? undefined,
        signedAt: row.signed_at ?? undefined,
        sentAgencyAt: row.sent_agency_at ?? undefined,
        sentIntegrationOfficeAt: row.sent_integration_office_at ?? undefined,
        reviewDueAt: row.review_due_at ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        topics: this.topics(row.id),
      }));
  }

  save(input: SaveInclusionAgreementInput): InclusionAgreementRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
      if (!input.title?.trim()) {
        throw new Error('Inklusionsvereinbarung benötigt einen Titel.');
      }

      const existing = input.id
        ? this.list().find((agreement) => agreement.id === input.id)
        : undefined;
      const id = existing?.id ?? randomUUID();
      const changedAt = nowIso();
      const status = input.status ?? existing?.status ?? 'not_started';
      this.assertClosureAllowed(status, input, existing);

      if (existing) {
        this.updateAgreement(id, existing, input, status, changedAt);
      } else {
        this.insertAgreement(id, input, status, changedAt);
        this.createRequiredTopics(id, changedAt);
      }

      if (input.reviewDueAt) {
        this.ensureReviewDeadline(id, input.reviewDueAt);
      }

      this.audit?.append({
        action: existing ? 'update' : 'create',
        subjectType: 'inclusion_agreement',
        subjectId: id,
        purpose: 'Inklusionsvereinbarung dokumentieren',
      });
      return this.list().find((agreement) => agreement.id === id)!;
    });
  }

  saveTopic(
    agreementId: string,
    input: SaveInclusionAgreementTopicInput,
  ): InclusionAgreementTopicRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
      const existing = this.topics(agreementId).find(
        (topic) => topic.topicKey === input.topicKey,
      );
      if (!existing) throw new Error('Themenfeld nicht gefunden.');

      this.db
        .prepare(
          'UPDATE sbv_inclusion_agreement_topics SET current_state=?,sbv_target=?,employer_position=?,council_position=?,result_text=?,status=?,updated_at=? WHERE id=?',
        )
        .run(
          optionalText(input.currentState ?? existing.currentState),
          optionalText(input.sbvTarget ?? existing.sbvTarget),
          optionalText(input.employerPosition ?? existing.employerPosition),
          optionalText(input.councilPosition ?? existing.councilPosition),
          optionalText(input.resultText ?? existing.resultText),
          input.status ?? existing.status,
          nowIso(),
          existing.id,
        );

      if (this.audit) this.audit.append({
        action: 'update',
        subjectType: 'inclusion_agreement_topic',
        subjectId: existing.id,
        purpose: 'Themenmatrix Inklusionsvereinbarung aktualisieren',
      });
      return this.topics(agreementId).find((topic) => topic.id === existing.id)!;
    });
  }

  createNegotiationResponseDeadline(agreementId: string, dueAt: string) {
    if (!this.list().some((agreement) => agreement.id === agreementId)) {
      throw new Error('Inklusionsvereinbarung nicht gefunden.');
    }

    return this.deadlines.create({
      processId: agreementId,
      processType: 'inclusion_agreement',
      deadlineType: 'follow_up',
      title: 'Antwort auf Verhandlungsaufforderung',
      dueAt,
      legalBasis: '§ 166 Abs. 1 SGB IX',
      severity: 'important',
      calculationMode: 'workflow',
      isLegalDeadline: false,
      sourceEvent: 'inclusion_agreement_negotiation_request',
    });
  }

  negotiationRequestDraft(responseDueAt?: string): { text: string; responseDueAt?: string } {
    const deadline = responseDueAt
      ? `\n\nBitte teilen Sie uns bis zum ${responseDueAt} mit, wann die Verhandlungen aufgenommen werden können.`
      : '';
    return {
      text: `Sehr geehrte Damen und Herren,\n\ndie Schwerbehindertenvertretung beantragt die Aufnahme von Verhandlungen über eine Inklusionsvereinbarung gemäß § 166 Abs. 1 SGB IX.${deadline}\n\nMit freundlichen Grüßen\nSchwerbehindertenvertretung`,
      responseDueAt,
    };
  }

  private topics(agreementId: string): InclusionAgreementTopicRecord[] {
    return this.db
      .prepare<TopicRow>(
        'SELECT * FROM sbv_inclusion_agreement_topics WHERE agreement_id=? ORDER BY topic_key',
      )
      .all(agreementId)
      .map(mapTopic);
  }

  private assertClosureAllowed(
    status: InclusionAgreementRecord['status'],
    input: SaveInclusionAgreementInput,
    existing: InclusionAgreementRecord | undefined,
  ): void {
    if (status !== 'superseded') return;
    const closure = inclusionAgreementClosureState({
      signedAt: input.signedAt ?? existing?.signedAt,
      sentAgencyAt: input.sentAgencyAt ?? existing?.sentAgencyAt,
      sentIntegrationOfficeAt:
        input.sentIntegrationOfficeAt ?? existing?.sentIntegrationOfficeAt,
    });
    if (!closure.canClose) {
      throw new Error(
        'Abschluss bleibt offen, solange Unterzeichnung oder Übermittlung ungeklärt ist.',
      );
    }
  }

  private updateAgreement(
    id: string,
    existing: InclusionAgreementRecord,
    input: SaveInclusionAgreementInput,
    status: InclusionAgreementRecord['status'],
    updatedAt: string,
  ): void {
    this.db
      .prepare(
        'UPDATE sbv_inclusion_agreements SET title=?,status=?,requested_at=?,employer_response_at=?,integration_office_invited_at=?,signed_at=?,sent_agency_at=?,sent_integration_office_at=?,review_due_at=?,updated_at=? WHERE id=?',
      )
      .run(
        input.title.trim(),
        status,
        optionalText(input.requestedAt ?? existing.requestedAt),
        optionalText(input.employerResponseAt ?? existing.employerResponseAt),
        optionalText(input.integrationOfficeInvitedAt ?? existing.integrationOfficeInvitedAt),
        optionalText(input.signedAt ?? existing.signedAt),
        optionalText(input.sentAgencyAt ?? existing.sentAgencyAt),
        optionalText(input.sentIntegrationOfficeAt ?? existing.sentIntegrationOfficeAt),
        optionalText(input.reviewDueAt ?? existing.reviewDueAt),
        updatedAt,
        id,
      );
  }

  private insertAgreement(
    id: string,
    input: SaveInclusionAgreementInput,
    status: InclusionAgreementRecord['status'],
    createdAt: string,
  ): void {
    this.db
      .prepare(
        'INSERT INTO sbv_inclusion_agreements(id,title,status,requested_at,employer_response_at,integration_office_invited_at,signed_at,sent_agency_at,sent_integration_office_at,review_due_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        id,
        input.title.trim(),
        status,
        optionalText(input.requestedAt),
        optionalText(input.employerResponseAt),
        optionalText(input.integrationOfficeInvitedAt),
        optionalText(input.signedAt),
        optionalText(input.sentAgencyAt),
        optionalText(input.sentIntegrationOfficeAt),
        optionalText(input.reviewDueAt),
        createdAt,
        createdAt,
      );
  }

  private createRequiredTopics(agreementId: string, createdAt: string): void {
    for (const key of REQUIRED_INCLUSION_TOPICS) {
      this.db
        .prepare(
          'INSERT INTO sbv_inclusion_agreement_topics(id,agreement_id,topic_key,status,created_at,updated_at) VALUES(?,?,?,?,?,?)',
        )
        .run(randomUUID(), agreementId, key, 'open', createdAt, createdAt);
    }
  }

  private ensureReviewDeadline(agreementId: string, dueAt: string): void {
    const existingDeadline = this.db
      .prepare<{ id: string }>(
        "SELECT id FROM deadlines WHERE process_type='inclusion_agreement' AND process_id=? AND source_event='inclusion_agreement_review' AND status!='cancelled'",
      )
      .get(agreementId);
    if (existingDeadline) return;

    this.deadlines.create({
      processId: agreementId,
      processType: 'inclusion_agreement',
      deadlineType: 'follow_up',
      title: 'Inklusionsvereinbarung evaluieren',
      dueAt,
      legalBasis: '§ 166 SGB IX',
      severity: 'important',
      calculationMode: 'workflow',
      isLegalDeadline: false,
      sourceEvent: 'inclusion_agreement_review',
    });
  }
}
