import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TemplateService } from '../../../services/templateService';
import { DEFAULT_TEMPLATES } from '../../../services/templateDefaults';
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
  db.exec(`CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);
  service = new TemplateService(db);
  service.ensureSchema(db);
  db.prepare(`INSERT INTO cases (id, case_number, display_name, category, status, summary, risk_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run('case-1', 'SBV-2026-001', 'Erika Muster', 'arbeitsplatz', 'offen', 'Kurzinfo', 'hoch');
});

afterEach(() => db.close());

describe('Vorlagenrendering – positive und negative Funktionspfade', () => {
  it('stellt ein BEM-Anschreiben als SBV-Anregung an den Arbeitgeber bereit', () => {
    const template = DEFAULT_TEMPLATES.find((item) => item.key === 'bem-angebot-datenschutz');
    expect(template?.body).toContain('Sehr geehrte Damen und Herren');
    expect(template?.body).toContain('Bitte unterbreiten Sie');
    expect(template?.body).not.toContain('wir möchten Ihnen ein Betriebliches Eingliederungsmanagement');
  });
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

  it('nutzt gespeicherte Vorlagenvorgaben zentral, ohne konkrete Falldaten zu überschreiben', async () => {
    db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)`).run(
      'template.defaults.v1',
      JSON.stringify({
        'sbv.name': 'SBV Team Standort Nord',
        'sbv.email': 'sbv-nord@example.invalid',
        'sbv.signatur': 'Mit kollegialen Grüßen\nSBV Team Standort Nord',
        'arbeitgeber.name': 'Musterarbeitgeber GmbH',
        'unternehmen.name': 'Musterbetrieb',
        'standort.name': 'Standort Nord',
      }),
      '2026-08-26T10:00:00.000Z',
    );
    const template = await service.createTemplate({
      title: 'Standardwerte Schreiben',
      category: 'beteiligung',
      subject: '{{arbeitgeber.name}} / {{fall.aktenzeichen}}',
      body: '{{person.name}}\n{{unternehmen.name}} · {{standort.name}}\n{{sbv.email}}\n\n{{sbv.signatur}}',
    });

    const rendered = await service.renderTemplate({
      templateId: template.id,
      caseId: 'case-1',
      archive: false,
    });

    expect(rendered.subject).toBe('Musterarbeitgeber GmbH / SBV-2026-001');
    expect(rendered.body).toContain('Erika Muster');
    expect(rendered.body).toContain('Musterbetrieb · Standort Nord');
    expect(rendered.body).toContain('sbv-nord@example.invalid');
    expect(rendered.body).toContain('Mit kollegialen Grüßen\nSBV Team Standort Nord');
    expect(rendered.unresolvedPlaceholders).toEqual([]);
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

  it('archiviert eine unvollständige Vorlage auch bei angeforderter Archivierung nicht als fertiges Dokument', async () => {
    const template = await service.createTemplate({
      title: 'Unvollständiges Schreiben', category: 'sonstiges',
      subject: '{{fall.aktenzeichen}}', body: 'Antwort bis {{frist.datum}}',
    });
    const rendered = await service.renderTemplate({ templateId: template.id, caseId: 'case-1', archive: true });

    expect(rendered.unresolvedPlaceholders).toEqual(['frist.datum']);
    expect(rendered.archivedId).toBeUndefined();
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM template_renders').get()?.count).toBe(0);
  });

  it('weist unbekannte Vorlagen zurück und erzeugt keinen Archivdatensatz', async () => {
    await expect(service.renderTemplate({ templateId: 'missing', caseId: 'case-1' })).rejects.toThrow('Vorlage nicht gefunden.');
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM template_renders').get()?.count).toBe(0);
  });

  it('aktualisiert bestehende Systemvorlagen ohne eigene Vorlagen oder archivierte Entwürfe zu verändern', async () => {
    const system = db.prepare<{ id: string; body: string }>(
      "SELECT id, body FROM document_templates WHERE template_key = 'bem-gespraechsprotokoll'",
    ).get()!;
    db.prepare('UPDATE document_templates SET body = ? WHERE id = ?').run('Alter Systemtext mit [bitte ergänzen]', system.id);
    const custom = await service.createTemplate({ title: 'Eigene Vorlage', category: 'bem', subject: 'Eigen', body: 'Mein Text' });
    service.seedReferenceData();
    expect(db.prepare<{ body: string }>('SELECT body FROM document_templates WHERE id = ?').get(system.id)?.body)
      .not.toContain('[bitte ergänzen]');
    expect(db.prepare<{ body: string }>('SELECT body FROM document_templates WHERE id = ?').get(custom.id)?.body)
      .toBe('Mein Text');
  });
});
