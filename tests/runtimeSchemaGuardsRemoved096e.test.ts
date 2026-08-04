import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService.js';
import { CaseService } from '../services/caseService.js';
import { ContactService } from '../services/contactService.js';
import { DocumentOcrService } from '../services/documents/documentOcrService.js';
import { KnowledgeService } from '../services/knowledgeService.js';
import { PersonCaseBindingService } from '../services/personCaseBindingService.js';
import { PrivacyReviewService } from '../services/privacyReviewService.js';
import { ReportService } from '../services/reportService.js';
import { SearchIndexService } from '../services/search/searchIndexService.js';
import { TemplateService } from '../services/templateService.js';

function runtimeDb(): DatabaseAdapter {
  return {
    exec(sql: string) {
      if (/\b(?:CREATE|ALTER|DROP)\b/i.test(sql)) {
        throw new Error(`Laufzeit-Schemaänderung erkannt: ${sql.slice(0, 80)}`);
      }
    },
    prepare<T = unknown>() {
      return {
        all: () => [] as T[],
        get: () => undefined,
        run: () => ({ changes: 0, lastInsertRowid: 0 }),
      };
    },
    pragma: () => undefined,
    close: () => undefined,
    transaction: <TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) => fn,
  } as DatabaseAdapter;
}

describe('zentrale Datenbankinitialisierung', () => {
  it('führt in normalen Lese- und Arbeitsmethoden keine Schemaänderungen mehr aus', async () => {
    const db = runtimeDb();

    await expect(new CaseService(() => db).listCases()).resolves.toEqual([]);
    await expect(new ContactService(() => db).listContacts()).resolves.toEqual([]);
    expect(new DocumentOcrService(db).enqueueIfUseful('missing')).toBe(false);
    await expect(new KnowledgeService(() => db).listNorms()).resolves.toEqual([]);
    expect(new PersonCaseBindingService(db).migrateLegacyBindings()).toEqual({ migrated: 0, legacyUnlinked: 0, privacyReviewRequired: 0 });
    expect(new PrivacyReviewService(db).listOpenForCase('case-1')).toEqual([]);
    expect(new ReportService(() => db, () => '').listHistory()).toEqual([]);
    expect(new SearchIndexService(db).search({ query: 'test' })).toEqual([]);
    await expect(new TemplateService(() => db).listTemplates()).resolves.toEqual([]);
  });
});
