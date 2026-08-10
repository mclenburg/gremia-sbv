import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TemplateService } from '../../../services/templateService';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

let db: DatabaseAdapter;
let service: TemplateService;

beforeEach(async () => {
  db = await openTestDatabase();
  db.exec(`CREATE TABLE cases (
    id TEXT PRIMARY KEY, case_number TEXT NOT NULL, display_name TEXT NOT NULL,
    category TEXT NOT NULL, status TEXT NOT NULL, summary TEXT, risk_level TEXT
  );`);
  service = new TemplateService(() => db);
  service.ensureSchema(db);
});

afterEach(() => db.close());

describe('Vorlagenverwaltung – funktionaler Vertrag', () => {
  it('legt eine eigene Vorlage normalisiert an, ändert sie persistent und löscht sie', async () => {
    const created = await service.createTemplate({
      title: '  Eigene Anhörung  ',
      category: 'beteiligung',
      description: '  Beschreibung  ',
      subject: '  Betreff {{fall.aktenzeichen}}  ',
      body: '  Inhalt {{fall.name}}  ',
      legalBasis: ['§ 178 Abs. 2 Satz 1 SGB IX'],
      tags: ['Anhörung'],
    });

    expect(created.title).toBe('Eigene Anhörung');
    expect(created.subject).toBe('Betreff {{fall.aktenzeichen}}');
    expect(created.body).toBe('Inhalt {{fall.name}}');
    expect(created.isSystem).toBe(false);

    const updated = await service.updateTemplate(created.id, {
      title: 'Geänderte Anhörung',
      tags: ['Anhörung', 'Frist'],
    });
    expect(updated.title).toBe('Geänderte Anhörung');
    expect(updated.tags).toEqual(['Anhörung', 'Frist']);
    expect((await service.listTemplates({ includeSystem: false })).some((item) => item.id === created.id && item.title === 'Geänderte Anhörung')).toBe(true);

    await expect(service.deleteTemplate(created.id)).resolves.toEqual({ deleted: true });
    await expect(service.deleteTemplate(created.id)).resolves.toEqual({ deleted: false });
    expect((await service.listTemplates({ includeSystem: false })).some((item) => item.id === created.id)).toBe(false);
  });

  it.each([
    [{ title: ' ', category: 'sonstiges', subject: 'Betreff', body: 'Text' }, 'Bitte einen Titel erfassen.'],
    [{ title: 'Titel', category: 'sonstiges', subject: ' ', body: 'Text' }, 'Bitte einen Betreff erfassen.'],
    [{ title: 'Titel', category: 'sonstiges', subject: 'Betreff', body: ' ' }, 'Bitte einen Vorlagentext erfassen.'],
  ] as const)('weist unvollständige Neuanlagen ohne Persistenz zurück', async (input, message) => {
    const before = await service.listTemplates({ includeSystem: false });
    await expect(service.createTemplate(input)).rejects.toThrow(message);
    expect(await service.listTemplates({ includeSystem: false })).toEqual(before);
  });

  it('schützt Systemvorlagen vor Änderung und Löschung', async () => {
    const systemTemplate = (await service.listTemplates({ includeSystem: true })).find((item) => item.isSystem);
    expect(systemTemplate).toBeDefined();

    await expect(service.updateTemplate(systemTemplate!.id, { title: 'Manipuliert' })).rejects.toThrow('Systemvorlagen können nicht überschrieben werden');
    await expect(service.deleteTemplate(systemTemplate!.id)).rejects.toThrow('Systemvorlagen können nicht gelöscht werden');

    const unchanged = (await service.listTemplates({ includeSystem: true })).find((item) => item.id === systemTemplate!.id);
    expect(unchanged?.title).toBe(systemTemplate!.title);
  });
});
