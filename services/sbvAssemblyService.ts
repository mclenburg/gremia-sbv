import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { DatabaseUnitOfWork } from './databaseUnitOfWork.js';
import type { PersonalDataAuditLogService } from './auditLogService.js';
import { DeadlineService } from './deadlineService.js';
import type {
  SaveSbvAssemblyInput,
  SbvAssemblyRecord,
} from '../src/app/core/models/sbv-office-workflow.model.js';
import { canMarkAssemblyReady, shouldWarnAboutAnnualAssembly } from './sbvAssemblyPolicy.js';

const nowIso = () => new Date().toISOString();
const optionalText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

interface AssemblyRow {
  id: string;
  year: number;
  scheduled_at: string | null;
  location_or_mode: string | null;
  invitation_at: string | null;
  agenda: string | null;
  accessibility_check_status: string | null;
  materials_status: string | null;
  employer_report_status: SbvAssemblyRecord['employerReportStatus'];
  minutes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapAssembly(row: AssemblyRow): SbvAssemblyRecord {
  return {
    id: row.id,
    year: row.year,
    scheduledAt: row.scheduled_at ?? undefined,
    locationOrMode: row.location_or_mode ?? undefined,
    invitationAt: row.invitation_at ?? undefined,
    agenda: row.agenda ?? undefined,
    accessibilityCheckStatus: row.accessibility_check_status ?? undefined,
    materialsStatus: row.materials_status ?? undefined,
    employerReportStatus: row.employer_report_status,
    minutes: row.minutes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SbvAssemblyService {
  constructor(
    private db: DatabaseAdapter,
    private audit?: PersonalDataAuditLogService,
    private deadlines: DeadlineService = new DeadlineService(db),
  ) {}

  list(): SbvAssemblyRecord[] {
    return this.db
      .prepare<AssemblyRow>('SELECT * FROM sbv_assemblies ORDER BY year DESC, scheduled_at DESC')
      .all()
      .map(mapAssembly);
  }

  save(input: SaveSbvAssemblyInput): SbvAssemblyRecord {
    return new DatabaseUnitOfWork(this.db).run(() => {
      const existing = input.id
        ? this.list().find((assembly) => assembly.id === input.id)
        : undefined;
      const status = input.status ?? existing?.status ?? 'draft';
      const scheduledAt = input.scheduledAt ?? existing?.scheduledAt;
      const invitationAt = input.invitationAt ?? existing?.invitationAt;

      if (status === 'ready' && !canMarkAssemblyReady({ scheduledAt, invitationAt })) {
        throw new Error('Bereit erfordert Termin und Einladung.');
      }

      const id = existing?.id ?? randomUUID();
      const changedAt = nowIso();

      if (existing) {
        this.updateExisting(id, existing, input, status, scheduledAt, invitationAt, changedAt);
      } else {
        this.insertNew(id, input, status, scheduledAt, invitationAt, changedAt);
      }

      this.audit?.append({
        action: existing ? 'update' : 'create',
        subjectType: 'sbv_assembly',
        subjectId: id,
        purpose: existing
          ? 'Schwerbehindertenversammlung aktualisieren'
          : 'Schwerbehindertenversammlung anlegen',
      });

      return this.list().find((assembly) => assembly.id === id)!;
    });
  }

  createFollowUp(
    assemblyId: string,
    dueAt: string,
    title = 'Folgeaufgabe Schwerbehindertenversammlung',
  ) {
    if (!this.list().some((assembly) => assembly.id === assemblyId)) {
      throw new Error('Schwerbehindertenversammlung nicht gefunden.');
    }

    return this.deadlines.create({
      processId: assemblyId,
      processType: 'sbv_assembly',
      deadlineType: 'follow_up',
      title,
      dueAt,
      legalBasis: '§ 178 Abs. 6 SGB IX',
      severity: 'important',
      calculationMode: 'workflow',
      isLegalDeadline: false,
      sourceEvent: 'sbv_assembly_follow_up',
    });
  }

  annualWarning(year: number, now = new Date()): boolean {
    return shouldWarnAboutAnnualAssembly(this.list(), year, now);
  }

  private updateExisting(
    id: string,
    existing: SbvAssemblyRecord,
    input: SaveSbvAssemblyInput,
    status: string,
    scheduledAt: string | undefined,
    invitationAt: string | undefined,
    updatedAt: string,
  ): void {
    this.db
      .prepare(
        'UPDATE sbv_assemblies SET year=?,scheduled_at=?,location_or_mode=?,invitation_at=?,agenda=?,accessibility_check_status=?,materials_status=?,employer_report_status=?,minutes=?,status=?,updated_at=? WHERE id=?',
      )
      .run(
        input.year,
        optionalText(scheduledAt),
        optionalText(input.locationOrMode ?? existing.locationOrMode),
        optionalText(invitationAt),
        optionalText(input.agenda ?? existing.agenda),
        optionalText(input.accessibilityCheckStatus ?? existing.accessibilityCheckStatus),
        optionalText(input.materialsStatus ?? existing.materialsStatus),
        input.employerReportStatus ?? existing.employerReportStatus,
        optionalText(input.minutes ?? existing.minutes),
        status,
        updatedAt,
        id,
      );
  }

  private insertNew(
    id: string,
    input: SaveSbvAssemblyInput,
    status: string,
    scheduledAt: string | undefined,
    invitationAt: string | undefined,
    createdAt: string,
  ): void {
    this.db
      .prepare(
        'INSERT INTO sbv_assemblies(id,year,scheduled_at,location_or_mode,invitation_at,agenda,accessibility_check_status,materials_status,employer_report_status,minutes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        id,
        input.year,
        optionalText(scheduledAt),
        optionalText(input.locationOrMode),
        optionalText(invitationAt),
        optionalText(input.agenda),
        optionalText(input.accessibilityCheckStatus),
        optionalText(input.materialsStatus),
        input.employerReportStatus ?? 'not_requested',
        optionalText(input.minutes),
        status,
        createdAt,
        createdAt,
      );
  }
}
