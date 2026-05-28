import { describe, expect, it } from 'vitest';
import { TemplateService } from '../services/templateService';
import type { DatabaseAdapter } from '../services/databaseService';

type TemplateRow = {
  id: string;
  template_key: string;
  title: string;
  category: string;
  description: string | null;
  subject: string;
  body: string;
  legal_basis_json: string;
  tags_json: string;
  is_system: number;
  created_at: string;
  updated_at: string;
};

class FakeTemplateDb implements DatabaseAdapter {
  readonly rows: TemplateRow[] = [];

  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(...params: unknown[]): T[] {
        if (!/SELECT \* FROM document_templates/i.test(sql)) return [];
        const [category, , contextualTag, , contextualCategory, includeSystem, limit] = params as [string | null, string | null, string | null, string | null, string | null, number, number];
        const rows = self.rows
          .filter((row) => !category || row.category === category)
          .filter((row) => !contextualTag || row.tags_json.includes(contextualTag) || row.category === contextualCategory)
          .filter((row) => includeSystem === 1 || row.is_system === 0)
          .sort((left, right) => right.is_system - left.is_system || left.category.localeCompare(right.category) || left.title.localeCompare(right.title))
          .slice(0, Number(limit));
        return rows as T[];
      },
      get(...params: unknown[]): T | undefined {
        if (/WHERE template_key = \?/i.test(sql)) return self.rows.find((row) => row.template_key === params[0]) as T | undefined;
        if (/WHERE id = \?/i.test(sql)) return self.rows.find((row) => row.id === params[0]) as T | undefined;
        return undefined;
      },
      run(...params: unknown[]): unknown {
        if (!/INSERT OR IGNORE INTO document_templates/i.test(sql)) return { changes: 0 };
        const [id, key, title, category, description, subject, body, legalBasis, tags, createdAt, updatedAt] = params;
        if (!self.rows.some((row) => row.template_key === key)) {
          self.rows.push({
            id: String(id),
            template_key: String(key),
            title: String(title),
            category: String(category),
            description: description === null ? null : String(description),
            subject: String(subject),
            body: String(body),
            legal_basis_json: String(legalBasis),
            tags_json: String(tags),
            is_system: 1,
            created_at: String(createdAt),
            updated_at: String(updatedAt),
          });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }
}

describe('0.7.2 Kündigungsvorlagen', () => {
  it('legt den Sofortcheck für Frist und Schutzstatus als Systemvorlage an', async () => {
    const db = new FakeTemplateDb();
    const service = new TemplateService(() => db);

    const templates = await service.listTemplates({ category: 'kuendigung', includeSystem: true });
    const checklist = templates.find((template) => template.key === 'kuendigung-frist-schutzstatus-check');

    expect(checklist).toBeTruthy();
    expect(checklist?.title).toContain('Frist und Schutzstatus');
    expect(checklist?.tags).toEqual(expect.arrayContaining(['massnahme:termination_hearing']));
    expect(checklist?.body).toContain('Sofortcheck');
    expect(checklist?.body).toContain('{{kuendigung.schutzstatus}}');
  });

  it('hält Stellungnahmevorlagen an SBV-Rechten und besonderem Kündigungsschutz fest', async () => {
    const db = new FakeTemplateDb();
    const service = new TemplateService(() => db);

    const templates = await service.listTemplates({ category: 'kuendigung', includeSystem: true });
    const statement = templates.find((template) => template.key === 'kuendigung-sbv-stellungnahme');

    expect(statement?.legalBasis).toEqual(expect.arrayContaining(['§ 178 Abs. 2 Satz 1 SGB IX', '§§ 168 ff. SGB IX']));
    expect(statement?.body).toContain('besonderen Kündigungsschutzes');
  });
});
