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
  db.prepare(`INSERT INTO cases (id, case_number, display_name, category, status, summary, risk_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run('case-1', 'SBV-2026-001', 'Erika Muster', 'arbeitsplatz', 'offen', 'Kurzinfo', 'hoch');
});

afterEach(() => db.close());

describe('Vorlagenrendering – positive und negative Funktionspfade', () => {
  it('ersetzt Fall- und Zusatzwerte, archiviert das Ergebnis und meldet keine offenen Platzhalter', async () => {
    const template = await service.createTemplate({
      key: 'render-vertrag', title: 'Rendervertrag', category: 'sonstiges',
      subject: '{{fall.aktenzeichen}} – {{frist.datum}}',
      body: 'Person: {{fall.name}}; Status: {{fall.status}}',
    });

    const rendered = await service.renderTemplate({
      templateId: template.id,
      caseId: 'case-1',
      values: { 'frist.datum': '31.08.2026' },
    });

    expect(rendered.subject).toBe('SBV-2026-001 – 31.08.2026');
    expect(rendered.body).toBe('Person: Erika Muster; Status: offen');
    expect(rendered.unresolvedPlaceholders).toEqual([]);
    expect(rendered.archivedId).toBeTruthy();
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM template_renders WHERE id = ?').get(rendered.archivedId!)?.count).toBe(1);
  });

  it('meldet fehlende Platzhalter eindeutig und archiviert auf Wunsch nicht', async () => {
    const template = await service.createTemplate({
      title: 'Offener Wert', category: 'sonstiges', subject: '{{nicht.vorhanden}}', body: '{{fall.name}} / {{weiterer.wert}}',
    });
    const rendered = await service.renderTemplate({ templateId: template.id, caseId: 'case-1', archive: false });

    expect(rendered.unresolvedPlaceholders).toEqual(['nicht.vorhanden', 'weiterer.wert']);
    expect(rendered.archivedId).toBeUndefined();
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM template_renders').get()?.count).toBe(0);
  });

  it('weist unbekannte Vorlagen zurück und erzeugt keinen Archivdatensatz', async () => {
    await expect(service.renderTemplate({ templateId: 'missing', caseId: 'case-1' })).rejects.toThrow('Vorlage nicht gefunden.');
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM template_renders').get()?.count).toBe(0);
  });
});
