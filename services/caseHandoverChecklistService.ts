import type {
  CaseHandoverChecklist,
  CaseHandoverChecklistConfirmation,
  CaseHandoverChecklistItem,
  CaseHandoverPackageType,
} from '../src/domain/models/case-handover.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { officeHandoverScope, type PackagePayload } from './caseHandoverSupport.js';

type CountRow = { value: number };

function count(database: DatabaseAdapter, sql: string, ...params: unknown[]): number {
  try {
    return database.prepare<CountRow>(sql).get(...params)?.value ?? 0;
  } catch {
    return 0;
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(',');
}

function item(input: CaseHandoverChecklistItem): CaseHandoverChecklistItem {
  return input;
}

export class CaseHandoverChecklistService {
  constructor(private readonly database: DatabaseAdapter) {}

  build(input: {
    packageType: CaseHandoverPackageType;
    caseIds: readonly string[];
    expiresAt?: string;
  }): CaseHandoverChecklist {
    const caseIds = unique(input.caseIds);
    const packageType = input.packageType;
    const items = [
      this.buildCaseSelectionItem(caseIds),
      ...this.buildVacationItems(packageType, input.expiresAt),
      ...this.buildCaseStateItems(caseIds),
      ...this.buildScopeItems(packageType),
    ];

    const blockingItemIds = items.filter((entry) => entry.state === 'blocking').map((entry) => entry.id);
    const requiredAcknowledgementIds = items.filter((entry) => entry.requiresAcknowledgement).map((entry) => entry.id);
    return {
      packageType,
      caseCount: caseIds.length,
      items,
      blockingItemIds,
      requiredAcknowledgementIds,
      readyToExport: blockingItemIds.length === 0,
    };
  }

  private buildCaseSelectionItem(caseIds: readonly string[]): CaseHandoverChecklistItem {
    if (!caseIds.length) {
      return item({
        id: 'case_selection',
        label: 'Fallauswahl fehlt',
        description: 'Für eine Übergabe muss mindestens eine konkrete Fallakte ausgewählt sein.',
        state: 'blocking',
        requiresAcknowledgement: false,
      });
    }
    return item({
      id: 'case_selection',
      label: `${caseIds.length} Fallakte(n) ausgewählt`,
      description: 'Die Auswahl bestimmt den fachlichen Umfang der Übergabe.',
      state: 'ready',
      requiresAcknowledgement: false,
    });
  }

  private buildVacationItems(packageType: CaseHandoverPackageType, expiresAt?: string): CaseHandoverChecklistItem[] {
    if (packageType !== 'vacation_handover') return [];

    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      return [item({
        id: 'valid_until',
        label: 'Ablaufdatum prüfen',
        description: 'Urlaubsvertretungen brauchen ein zukünftiges Ende, damit die Rückgabe und Datenschutzprüfung steuerbar bleiben.',
        state: 'blocking',
        requiresAcknowledgement: false,
      })];
    }

    return [item({
      id: 'valid_until',
      label: 'Ablaufdatum gesetzt',
      description: 'Das Übergabepaket ist zeitlich begrenzt.',
      state: 'ready',
      requiresAcknowledgement: false,
    })];
  }

  private buildCaseStateItems(caseIds: readonly string[]): CaseHandoverChecklistItem[] {
    if (!caseIds.length) return [];

    return [
      this.buildCountItem({
        count: this.countOpenCaseRows('deadlines', caseIds),
        activeId: 'open_deadlines',
        activeLabel: (value) => `${value} offene Frist(en) enthalten`,
        activeDescription: 'Offene Fristen werden mit übergeben und müssen von der empfangenden Stelle aktiv weiterverfolgt werden.',
        emptyLabel: 'Keine offenen Fristen in der Auswahl',
        emptyDescription: 'Die ausgewählten Fallakten enthalten keine offenen Fristen.',
      }),
      this.buildCountItem({
        count: this.countOpenCaseRows('privacy_review_items', caseIds),
        activeId: 'open_privacy_reviews',
        activeLabel: (value) => `${value} offene Datenschutzprüfung(en) enthalten`,
        activeDescription: 'Die empfangende Instanz muss erkennen, dass diese Fälle nach dem Import datenschutzrechtlich zu prüfen sind.',
        emptyLabel: 'Keine offenen Datenschutzprüfungen in der Auswahl',
        emptyDescription: 'Zur ausgewählten Fallauswahl liegen keine offenen Datenschutzprüfungen vor.',
      }),
    ];
  }

  private countOpenCaseRows(table: 'deadlines' | 'privacy_review_items', caseIds: readonly string[]): number {
    return count(this.database, `
      SELECT COUNT(*) AS value
      FROM ${table}
      WHERE case_id IN (${placeholders(caseIds)})
        AND status = 'open'
    `, ...caseIds);
  }

  private buildCountItem(input: {
    count: number;
    activeId: CaseHandoverChecklistItem['id'];
    activeLabel: (count: number) => string;
    activeDescription: string;
    emptyLabel: string;
    emptyDescription: string;
  }): CaseHandoverChecklistItem {
    if (input.count > 0) {
      return item({
        id: input.activeId,
        label: input.activeLabel(input.count),
        description: input.activeDescription,
        state: 'attention',
        requiresAcknowledgement: true,
      });
    }
    return item({
      id: input.activeId,
      label: input.emptyLabel,
      description: input.emptyDescription,
      state: 'ready',
      requiresAcknowledgement: false,
    });
  }

  private buildScopeItems(packageType: CaseHandoverPackageType): CaseHandoverChecklistItem[] {
    const items: CaseHandoverChecklistItem[] = [];
    if (packageType === 'office_handover') {
      items.push(item({
        id: 'office_scope',
        label: 'Amtsbestand statt Privatjournal',
        description: 'Vorlagen, Fristenregeln, Wahlakten und Datenschutzstatus gehören zur Amtsübergabe; das persönliche Tätigkeitsjournal bleibt ausgeschlossen.',
        state: 'attention',
        requiresAcknowledgement: true,
      }));
    }

    if (packageType === 'return_delta') {
      items.push(item({
        id: 'return_delta_scope',
        label: 'Nur Änderungen aus der Vertretung',
        description: 'Das Rückgabepaket enthält nur seit dem Import hinzugekommene oder geänderte Fallinhalte.',
        state: 'attention',
        requiresAcknowledgement: true,
      }));
    }
    return items;
  }

  assertConfirmed(input: {
    checklist?: CaseHandoverChecklistConfirmation;
    payload: PackagePayload;
  }): void {
    const checklist = this.build({
      packageType: input.payload.packageType ?? 'vacation_handover',
      caseIds: input.payload.cases.map((entry) => String(entry.data.id ?? '')),
      expiresAt: input.payload.expiresAt,
    });
    if (checklist.blockingItemIds.length) {
      throw new Error(`Übergabe ist noch nicht exportfähig: ${checklist.items.filter((entry) => entry.state === 'blocking').map((entry) => entry.label).join(', ')}`);
    }
    const acknowledged = new Set(input.checklist?.acknowledgedItemIds ?? []);
    const missing = checklist.requiredAcknowledgementIds.filter((id) => !acknowledged.has(id));
    if (missing.length) {
      const labels = checklist.items.filter((entry) => missing.includes(entry.id)).map((entry) => entry.label).join(', ');
      throw new Error(`Bitte die Übergabe-Checkliste bestätigen: ${labels}`);
    }
    if ((input.payload.packageType ?? 'vacation_handover') === 'office_handover') {
      const scope = officeHandoverScope(input.payload);
      if (scope?.activityJournalIncluded !== false) {
        throw new Error('Amtsübergaben dürfen kein persönliches Tätigkeitsjournal enthalten.');
      }
    }
  }
}
