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
    const items: CaseHandoverChecklistItem[] = [];
    const packageType = input.packageType;

    if (!caseIds.length) {
      items.push(item({
        id: 'case_selection',
        label: 'Fallauswahl fehlt',
        description: 'Für eine Übergabe muss mindestens eine konkrete Fallakte ausgewählt sein.',
        state: 'blocking',
        requiresAcknowledgement: false,
      }));
    } else {
      items.push(item({
        id: 'case_selection',
        label: `${caseIds.length} Fallakte(n) ausgewählt`,
        description: 'Die Auswahl bestimmt den fachlichen Umfang der Übergabe.',
        state: 'ready',
        requiresAcknowledgement: false,
      }));
    }

    if (packageType === 'vacation_handover') {
      if (!input.expiresAt || new Date(input.expiresAt).getTime() <= Date.now()) {
        items.push(item({
          id: 'valid_until',
          label: 'Ablaufdatum prüfen',
          description: 'Urlaubsvertretungen brauchen ein zukünftiges Ende, damit die Rückgabe und Datenschutzprüfung steuerbar bleiben.',
          state: 'blocking',
          requiresAcknowledgement: false,
        }));
      } else {
        items.push(item({
          id: 'valid_until',
          label: 'Ablaufdatum gesetzt',
          description: 'Das Übergabepaket ist zeitlich begrenzt.',
          state: 'ready',
          requiresAcknowledgement: false,
        }));
      }
    }

    if (caseIds.length) {
      const openDeadlineCount = count(this.database, `
        SELECT COUNT(*) AS value
        FROM deadlines
        WHERE case_id IN (${placeholders(caseIds)})
          AND status = 'open'
      `, ...caseIds);
      items.push(openDeadlineCount > 0
        ? item({
          id: 'open_deadlines',
          label: `${openDeadlineCount} offene Frist(en) enthalten`,
          description: 'Offene Fristen werden mit übergeben und müssen von der empfangenden Stelle aktiv weiterverfolgt werden.',
          state: 'attention',
          requiresAcknowledgement: true,
        })
        : item({
          id: 'open_deadlines',
          label: 'Keine offenen Fristen in der Auswahl',
          description: 'Die ausgewählten Fallakten enthalten keine offenen Fristen.',
          state: 'ready',
          requiresAcknowledgement: false,
        }));

      const openPrivacyReviewCount = count(this.database, `
        SELECT COUNT(*) AS value
        FROM privacy_review_items
        WHERE case_id IN (${placeholders(caseIds)})
          AND status = 'open'
      `, ...caseIds);
      items.push(openPrivacyReviewCount > 0
        ? item({
          id: 'open_privacy_reviews',
          label: `${openPrivacyReviewCount} offene Datenschutzprüfung(en) enthalten`,
          description: 'Die empfangende Instanz muss erkennen, dass diese Fälle nach dem Import datenschutzrechtlich zu prüfen sind.',
          state: 'attention',
          requiresAcknowledgement: true,
        })
        : item({
          id: 'open_privacy_reviews',
          label: 'Keine offenen Datenschutzprüfungen in der Auswahl',
          description: 'Zur ausgewählten Fallauswahl liegen keine offenen Datenschutzprüfungen vor.',
          state: 'ready',
          requiresAcknowledgement: false,
        }));
    }

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
