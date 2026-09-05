import type { CaseHandoverCockpit, CaseHandoverCockpitItem, CaseHandoverPackageType } from '../src/domain/models/case-handover.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { ensureCaseHandoverExportLedgerSchema } from './caseHandoverExportLedger.js';

type HeaderRow = {
  id: string;
  package_id: string;
  created_at: string;
  valid_until?: string | null;
  status: string;
  package_type?: string | null;
  target_instance_id?: string | null;
  case_count?: number | null;
  metadata_json?: string | null;
};

type CaseLinkRow = {
  parent_id: string;
  case_id: string;
  case_number: string;
  display_name: string;
};

export class CaseHandoverCockpitService {
  constructor(private readonly database: DatabaseAdapter) {}

  list(): CaseHandoverCockpit {
    ensureCaseHandoverExportLedgerSchema(this.database);
    const outgoing = this.outgoing();
    const incoming = this.incoming();
    const vacationItems = [...outgoing, ...incoming].filter((item) => item.packageType === 'vacation_handover');
    return {
      activeVacationCount: vacationItems.filter((item) => item.status === 'active').length,
      expiredVacationCount: vacationItems.filter((item) => item.status === 'expired').length,
      returnableCount: incoming.filter((item) => item.canExportReturnDelta).length,
      outgoing,
      incoming,
    };
  }

  private outgoing(): CaseHandoverCockpitItem[] {
    const headers = this.database.prepare<HeaderRow>(`
      SELECT id, package_id, exported_at AS created_at, valid_until, package_type, target_instance_id, case_count, status, metadata_json
      FROM case_handover_exports
      ORDER BY exported_at DESC
    `).all();
    const cases = this.groupCaseLinks(this.database.prepare<CaseLinkRow>(`
      SELECT e.id AS parent_id, c.id AS case_id, c.case_number, c.display_name
      FROM case_handover_exports e
      JOIN case_handover_export_items i ON i.handover_export_id = e.id AND i.local_entity_type = 'case'
      JOIN cases c ON c.id = i.local_entity_id
      ORDER BY c.case_number
    `).all());
    return headers.map((header) => this.toItem(header, 'outgoing', cases.get(header.id) ?? []));
  }

  private incoming(): CaseHandoverCockpitItem[] {
    const headers = this.database.prepare<HeaderRow>(`
      SELECT id, package_id, imported_at AS created_at, valid_until, status, mode, created_case_count + updated_case_count AS case_count, metadata_json
      FROM case_handover_imports
      ORDER BY imported_at DESC
    `).all();
    const cases = this.groupCaseLinks(this.database.prepare<CaseLinkRow>(`
      SELECT i.handover_import_id AS parent_id, c.id AS case_id, c.case_number, c.display_name
      FROM case_handover_import_items i
      JOIN cases c ON c.id = i.local_entity_id
      WHERE i.local_entity_type = 'case'
      ORDER BY c.case_number
    `).all());
    return headers.map((header) => this.toItem(header, 'incoming', cases.get(header.id) ?? []));
  }

  private groupCaseLinks(rows: CaseLinkRow[]): Map<string, CaseLinkRow[]> {
    const grouped = new Map<string, CaseLinkRow[]>();
    for (const row of rows) grouped.set(row.parent_id, [...(grouped.get(row.parent_id) ?? []), row]);
    return grouped;
  }

  private toItem(header: HeaderRow, direction: 'outgoing' | 'incoming', cases: CaseLinkRow[]): CaseHandoverCockpitItem {
    const packageType = this.packageType(header);
    const status = statusFrom(header.status, header.valid_until);
    return {
      id: header.id,
      direction,
      packageId: header.package_id,
      packageType,
      status,
      createdAt: header.created_at,
      validUntil: header.valid_until ?? undefined,
      caseCount: Number(header.case_count ?? cases.length),
      caseIds: cases.map((item) => item.case_id),
      caseLabels: cases.map((item) => `${item.case_number} · ${item.display_name}`),
      targetInstanceId: header.target_instance_id ?? undefined,
      canExportReturnDelta: direction === 'incoming' && packageType === 'vacation_handover' && status !== 'returned' && cases.length > 0,
    };
  }

  private packageType(header: HeaderRow): CaseHandoverPackageType {
    if (header.package_type === 'return_delta') return 'return_delta';
    const metadata = parseMetadata(header.metadata_json);
    return metadata.mode === 'return_delta' ? 'return_delta' : 'vacation_handover';
  }
}

function statusFrom(status: string, validUntil?: string | null): CaseHandoverCockpitItem['status'] {
  if (status === 'returned') return 'returned';
  if (validUntil) {
    const expires = new Date(validUntil).getTime();
    if (Number.isFinite(expires) && expires < Date.now()) return 'expired';
  }
  return status === 'active' || status === 'open' ? 'active' : 'open';
}

function parseMetadata(value?: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
