import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from 'electron';
import { evaluateDatabaseIntegrity } from '../../services/databaseIntegrityService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreateComplianceIncidentInput,
  DataSubjectAccessRequestInput,
  UpdateComplianceIncidentInput,
} from '../../src/domain/models/compliance.model.js';
import {
  assertAllowedEnum,
  assertBoolean,
  assertOptionalBoolean,
  assertOptionalString,
  assertPlainObject,
  assertString,
} from './ipcValidation.js';


const INCIDENT_CATEGORIES = [
  'wrong_export',
  'lost_backup',
  'unauthorized_access_suspected',
  'wrong_recipient',
  'vault_integrity',
  'temporary_file',
  'other',
] as const;

const INCIDENT_RISK_LEVELS = ['low', 'medium', 'high'] as const;
const INCIDENT_STATUSES = ['open', 'in_review', 'reported', 'closed'] as const;

function validateDsarInput(value: unknown): DataSubjectAccessRequestInput {
  const channel = 'compliance:dsar-prefill';
  const input = assertPlainObject(value, channel);
  return {
    requesterName: assertString(input.requesterName, channel, 'Name der anfragenden Person', { minLength: 1, maxLength: 300 }),
    requestReceivedAt: assertString(input.requestReceivedAt, channel, 'Eingangsdatum', { minLength: 1, maxLength: 80 }),
    responseDueAt: assertString(input.responseDueAt, channel, 'Antwortfrist', { minLength: 1, maxLength: 80 }),
    caseReference: assertString(input.caseReference, channel, 'Fallbezug', { maxLength: 300 }),
    identityVerified: assertBoolean(input.identityVerified, channel, 'Identität geprüft'),
    requestScope: assertString(input.requestScope, channel, 'Umfang der Anfrage', { maxLength: 4_000 }),
    preparedBy: assertString(input.preparedBy, channel, 'Bearbeitet durch', { maxLength: 300 }),
  };
}

function validateCreateIncidentInput(value: unknown): CreateComplianceIncidentInput {
  const channel = 'compliance:incidents:create';
  const input = assertPlainObject(value, channel);
  return {
    occurredAt: assertString(input.occurredAt, channel, 'Zeitpunkt des Vorfalls', { minLength: 1, maxLength: 80 }),
    discoveredAt: assertString(input.discoveredAt, channel, 'Zeitpunkt der Kenntnis', { minLength: 1, maxLength: 80 }),
    category: assertAllowedEnum(input.category, channel, 'Vorfallart', INCIDENT_CATEGORIES),
    riskLevel: assertAllowedEnum(input.riskLevel, channel, 'Risikostufe', INCIDENT_RISK_LEVELS),
    summary: assertString(input.summary, channel, 'Kurzbeschreibung', { minLength: 1, maxLength: 4_000 }),
    affectedDataCategories: assertOptionalString(input.affectedDataCategories, channel, 'Betroffene Datenkategorien', { maxLength: 4_000 }),
    immediateMeasures: assertOptionalString(input.immediateMeasures, channel, 'Sofortmaßnahmen', { maxLength: 8_000 }),
  };
}

function validateUpdateIncidentInput(value: unknown): UpdateComplianceIncidentInput {
  const channel = 'compliance:incidents:update';
  const input = assertPlainObject(value, channel);
  return {
    status: input.status === undefined ? undefined : assertAllowedEnum(input.status, channel, 'Status', INCIDENT_STATUSES),
    riskLevel: input.riskLevel === undefined ? undefined : assertAllowedEnum(input.riskLevel, channel, 'Risikostufe', INCIDENT_RISK_LEVELS),
    summary: assertOptionalString(input.summary, channel, 'Kurzbeschreibung', { maxLength: 4_000 }),
    affectedDataCategories: assertOptionalString(input.affectedDataCategories, channel, 'Betroffene Datenkategorien', { maxLength: 4_000 }),
    immediateMeasures: assertOptionalString(input.immediateMeasures, channel, 'Sofortmaßnahmen', { maxLength: 8_000 }),
    dsbNotifiedAt: assertOptionalString(input.dsbNotifiedAt, channel, 'DSB informiert am', { maxLength: 80 }),
    authorityNotificationChecked: input.authorityNotificationChecked === undefined
      ? undefined
      : assertOptionalBoolean(input.authorityNotificationChecked, channel, 'Meldepflicht geprüft', false),
    dataSubjectsInformedAt: assertOptionalString(input.dataSubjectsInformedAt, channel, 'Betroffene informiert am', { maxLength: 80 }),
    closedAt: assertOptionalString(input.closedAt, channel, 'Abgeschlossen am', { maxLength: 80 }),
    lessonsLearned: assertOptionalString(input.lessonsLearned, channel, 'Erkenntnisse', { maxLength: 8_000 }),
  };
}

export function registerComplianceIpc(ipcMain: IpcMain, security: SecurityService, services: ApplicationServices): void {
  registerIpcHandler(ipcMain, IPC_CHANNELS.complianceAuditChainStatus, async () =>
    services.auditLog().verifyChain(),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.complianceDatabaseIntegrityStatus, async () =>
    evaluateDatabaseIntegrity(security.getActiveDatabase()),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.complianceDsarPrefill, async (_event, input) =>
    services.dsarPrefill().buildPrefill(validateDsarInput(input)),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.complianceSelfCheck, async () =>
    services.complianceSelfCheck().evaluate(),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.complianceIncidentsList, async () =>
    services.complianceIncidents().list(),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.complianceIncidentsCreate, async (_event, input) =>
    services.complianceIncidents().create(validateCreateIncidentInput(input)),
  );

  registerIpcHandler(ipcMain, IPC_CHANNELS.complianceIncidentsUpdate, async (_event, id, input) =>
    services.complianceIncidents().update(
      assertString(id, 'compliance:incidents:update', 'Vorfall-ID', { minLength: 1, maxLength: 200 }),
      validateUpdateIncidentInput(input),
    ),
  );
}
