import type { DatabaseAdapter } from './databaseService.js';
import type { ActivityJournalCategory, ActivityJournalCategoryPreferenceRecord, ActivityJournalContextType } from '../src/app/core/models/activity-journal.model.js';
import { ACTIVITY_JOURNAL_CATEGORIES, ACTIVITY_JOURNAL_CONTEXT_TYPES } from '../src/app/core/models/activity-journal.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function assertCategory(category: ActivityJournalCategory): void {
  if (!ACTIVITY_JOURNAL_CATEGORIES.includes(category)) throw new Error(`Unzulässige Journal-Kategorie: ${category}`);
}

function assertContextType(contextType: ActivityJournalContextType): void {
  if (!ACTIVITY_JOURNAL_CONTEXT_TYPES.includes(contextType)) throw new Error(`Unzulässiger Journal-Kontext: ${contextType}`);
}

export class ActivityJournalPreferenceService {
  constructor(private readonly db: DatabaseAdapter) {
    this.ensureSchema();
  }

  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_journal_category_preferences (
        context_type TEXT PRIMARY KEY CHECK(context_type IN ('case','person','bem_process','prevention_process','sbv_participation','termination_hearing','equalization_process','sbv_control_protocol','recruiting_participation','recruiting_interview','deadline','document','journal','fallfrei')),
        category TEXT NOT NULL CHECK(category IN ('case_work','consultation','bem_preparation','prevention','participation','employer_meeting','committee_work','sbv_steering','research','documentation','qualification','external_network','sbv_self_organization')),
        updated_at TEXT NOT NULL
      );
    `);
  }

  getPreferredCategory(contextType: ActivityJournalContextType): ActivityJournalCategory | undefined {
    assertContextType(contextType);
    const row = this.db.prepare<{ category?: string }>('SELECT category FROM activity_journal_category_preferences WHERE context_type = ?').get(contextType);
    return ACTIVITY_JOURNAL_CATEGORIES.includes(row?.category as ActivityJournalCategory) ? row?.category as ActivityJournalCategory : undefined;
  }

  rememberCategory(contextType: ActivityJournalContextType, category: ActivityJournalCategory): ActivityJournalCategoryPreferenceRecord {
    assertContextType(contextType);
    assertCategory(category);
    const updatedAt = nowIso();
    this.db.prepare(`
      INSERT INTO activity_journal_category_preferences (context_type, category, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(context_type) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at
    `).run(contextType, category, updatedAt);
    return { contextType, category, updatedAt };
  }
}
