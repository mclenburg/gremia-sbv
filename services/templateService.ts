import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from './databaseService.js';
import { buildFallbackTemplateContext, normalizeTemplateKey, renderTemplateText, type TemplateContext } from './templatePolicy.js';
import type { CreateTemplateInput, RenderContextTemplateInput, RenderTemplateInput, RenderedTemplateResult, TemplateCategory, TemplateListFilters, TemplateRecord, UpdateTemplateInput } from '../src/app/core/models/template.model.js';

function nowIso(): string {
  return new Date().toISOString();
}

function optionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function jsonString(value: string[] | undefined): string {
  return JSON.stringify(value ?? []);
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapTemplate(row: any): TemplateRecord {
  return {
    id: row.id,
    key: row.template_key,
    title: row.title,
    category: row.category as TemplateCategory,
    description: row.description ?? undefined,
    subject: row.subject,
    body: row.body,
    legalBasis: parseJsonArray(row.legal_basis_json),
    tags: parseJsonArray(row.tags_json),
    isSystem: Boolean(row.is_system),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function defaultTemplates(): CreateTemplateInput[] {
  return [
    {
      key: 'praeventionsverfahren-einfordern',
      title: 'Präventionsverfahren einfordern',
      category: 'praevention',
      description: 'Freundlich-verbindliche Aufforderung zur unverzüglichen Einleitung eines Präventionsverfahrens.',
      subject: 'Präventionsverfahren nach § 167 Abs. 1 SGB IX – {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 1 SGB IX', '§ 178 Abs. 2 Satz 1 SGB IX'],
      tags: ['Prävention', 'Inklusionsamt', 'Arbeitgeberpflicht'],
      body: `Sehr geehrte Damen und Herren,

im Zusammenhang mit dem Vorgang {{fall.aktenzeichen}} liegen aus Sicht der Schwerbehindertenvertretung Schwierigkeiten vor, die geeignet sind, das Arbeitsverhältnis zu gefährden oder weiter zu belasten.

Ich fordere daher die unverzügliche Einleitung des Präventionsverfahrens nach § 167 Abs. 1 SGB IX. Nach dieser Vorschrift sind bei entsprechenden Schwierigkeiten frühzeitig die Schwerbehindertenvertretung, die zuständige Interessenvertretung sowie das Inklusionsamt einzuschalten.

Bitte teilen Sie mir bis zum {{frist.datum}} mit, wann das Verfahren eingeleitet wird, welche Beteiligten vorgesehen sind und welche ersten Klärungsschritte der Arbeitgeber beabsichtigt.

Ich weise vorsorglich darauf hin, dass eine weitere Verzögerung die rechtliche und tatsächliche Risikolage für den Arbeitgeber erhöht. Ziel der Schwerbehindertenvertretung ist weiterhin eine sachgerechte, lösungsorientierte und belastbare Klärung im Interesse des betroffenen Menschen.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'sbv-beteiligung-unterlagen-nachfordern',
      title: 'SBV-Beteiligung / Unterlagen nachfordern',
      category: 'beteiligung',
      description: 'Wenn eine Angelegenheit ohne ausreichende Unterrichtung oder Anhörung der SBV läuft.',
      subject: 'Beteiligung der SBV nach § 178 Abs. 2 SGB IX – {{fall.aktenzeichen}}',
      legalBasis: ['§ 178 Abs. 2 Satz 1 SGB IX'],
      tags: ['Beteiligung', 'Anhörung', 'Unterlagen'],
      body: `Sehr geehrte Damen und Herren,

zur Angelegenheit {{fall.aktenzeichen}} bitte ich um unverzügliche und vollständige Unterrichtung der Schwerbehindertenvertretung nach § 178 Abs. 2 Satz 1 SGB IX.

Die SBV ist in allen Angelegenheiten, die einzelne schwerbehinderte oder gleichgestellte Menschen oder die Gruppe betreffen, unverzüglich und umfassend zu unterrichten und vor einer Entscheidung anzuhören. Eine sachgerechte Stellungnahme ist erst möglich, wenn die entscheidungserheblichen Informationen vollständig vorliegen.

Bitte stellen Sie mir die hierzu erforderlichen Unterlagen und den aktuellen Sachstand bis zum {{frist.datum}} zur Verfügung. Bis zur ordnungsgemäßen Beteiligung gehe ich davon aus, dass keine abschließende Entscheidung getroffen oder umgesetzt wird.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'bem-verfahren-nachhalten',
      title: 'BEM-Verfahren nachhalten',
      category: 'bem',
      description: 'Verbindliches Nachhalten eines BEM- oder Wiedereingliederungsprozesses.',
      subject: 'BEM / Wiedereingliederung – Sachstand {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 2 SGB IX'],
      tags: ['BEM', 'Gesundheitsschutz', 'Wiedereingliederung'],
      body: `Sehr geehrte Damen und Herren,

zum Vorgang {{fall.aktenzeichen}} bitte ich um Mitteilung des aktuellen Sachstands zum Betrieblichen Eingliederungsmanagement beziehungsweise zu den besprochenen Wiedereingliederungs- und Unterstützungsmaßnahmen.

Ein wirksames BEM ist kein Einzelgespräch, sondern ein strukturierter Klärungsprozess mit Prüfung geeigneter Maßnahmen, Umsetzung und Evaluation. Im Mittelpunkt steht die Frage, welche arbeitsplatzbezogenen Bedingungen angepasst werden müssen, damit Beschäftigung gesundheitlich tragfähig möglich bleibt.

Bitte teilen Sie mir bis zum {{frist.datum}} mit, welche nächsten Schritte vorgesehen sind und wann eine gemeinsame Auswertung der bisherigen Maßnahmen erfolgen soll.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'bem-angebot-datenschutz',
      title: 'BEM-Angebot mit Datenschutzhinweis',
      category: 'bem',
      description: 'BEM-Angebot mit Freiwilligkeit, Datenschutz und Beteiligtenhinweis.',
      subject: 'Angebot eines Betrieblichen Eingliederungsmanagements – {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 2 SGB IX', 'Art. 9 DSGVO'],
      tags: ['BEM', 'massnahme:bem', 'status:angebot_vorzubereiten', 'Datenschutz', 'Einwilligung'],
      body: `Sehr geehrte*r {{fall.name}},

wir möchten Ihnen ein Betriebliches Eingliederungsmanagement nach § 167 Abs. 2 SGB IX anbieten.

Ziel des BEM ist es, gemeinsam zu klären, wie Arbeitsunfähigkeit möglichst überwunden, erneuter Arbeitsunfähigkeit vorgebeugt und Ihr Arbeitsplatz erhalten werden kann. Die Teilnahme ist freiwillig. Aus einer Ablehnung dürfen Ihnen keine unmittelbaren Nachteile entstehen.

Im BEM werden nur die Informationen verarbeitet, die für die Klärung geeigneter Maßnahmen erforderlich sind. Über Beteiligte, Umfang und Inhalte entscheiden Sie mit. Sie können eine erteilte Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.

Bitte teilen Sie bis zum {{bem.reaktionsfrist}} mit, ob Sie das Angebot annehmen möchten und welche Personen beteiligt werden sollen.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'bem-einwilligung-beteiligte',
      title: 'BEM-Einwilligung und Beteiligte dokumentieren',
      category: 'bem',
      description: 'Dokumentation der freiwilligen Einwilligung und des gewünschten Beteiligtenkreises.',
      subject: 'BEM – Einwilligung und Beteiligte – {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 2 SGB IX', 'Art. 6 DSGVO', 'Art. 9 DSGVO'],
      tags: ['BEM', 'massnahme:bem', 'status:angenommen', 'Einwilligung', 'Beteiligte'],
      body: `BEM-Verfahren: {{fall.aktenzeichen}}

Die betroffene Person hat das BEM-Angebot angenommen.

Einwilligungsumfang / Beteiligte:
{{bem.beteiligte}}

Datenschutzhinweis erteilt am:
{{bem.angebot_am}}

Hinweis:
Die Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden. Inhalte des BEM werden nur zweckgebunden und nur im erforderlichen Umfang dokumentiert.`
    },
    {
      key: 'bem-gespraechsprotokoll',
      title: 'BEM-Gesprächsprotokoll',
      category: 'bem',
      description: 'Strukturiertes Protokoll für Erst- oder Folgegespräche im BEM.',
      subject: 'BEM-Gesprächsprotokoll – {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 2 SGB IX'],
      tags: ['BEM', 'massnahme:bem', 'status:gespraech_geplant', 'Protokoll'],
      body: `BEM-Gesprächsprotokoll

Fall: {{fall.aktenzeichen}}
Betroffene Person: {{fall.name}}
Termin: {{bem.erstgespraech}}
Beteiligte: {{bem.beteiligte}}

Ausgangslage:
{{bem.ausloeser}}

Besprochene arbeitsplatzbezogene Belastungen / Ressourcen:
[bitte nur erforderliche Angaben dokumentieren]

Vereinbarte nächste Schritte:
[bitte ergänzen]

Datenschutz- und Vertraulichkeitshinweis:
Die Dokumentation enthält nur die für das BEM erforderlichen Informationen. Diagnosen werden nicht dokumentiert, sofern sie für die Maßnahmenklärung nicht erforderlich sind.`
    },
    {
      key: 'bem-massnahmenplan',
      title: 'BEM-Maßnahmenplan',
      category: 'bem',
      description: 'Maßnahmenplan mit Verantwortlichen und Wirksamkeitsprüfung.',
      subject: 'BEM-Maßnahmenplan – {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 2 SGB IX', '§ 164 Abs. 4 SGB IX'],
      tags: ['BEM', 'massnahme:bem', 'status:massnahmen_vereinbart', 'Maßnahmenplan'],
      body: `BEM-Maßnahmenplan

Fall: {{fall.aktenzeichen}}

Vereinbarte Maßnahmen:
{{bem.massnahmen}}

Verantwortliche / Umsetzung:
{{bem.beteiligte}}

Wirksamkeitsprüfung:
{{bem.wirksamkeitspruefung}}

Hinweis:
Die Wirksamkeit der Maßnahmen wird zum genannten Termin geprüft. Anpassungen sind möglich, wenn die Maßnahme nicht ausreichend trägt oder sich die Arbeitsbedingungen verändern.`
    },
    {
      key: 'bem-wirksamkeitspruefung',
      title: 'BEM-Wirksamkeitsprüfung',
      category: 'bem',
      description: 'Auswertung der Umsetzung und Wirkung vereinbarter BEM-Maßnahmen.',
      subject: 'BEM-Wirksamkeitsprüfung – {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 2 SGB IX'],
      tags: ['BEM', 'massnahme:bem', 'status:wirksamkeit_pruefen', 'Evaluation'],
      body: `BEM-Wirksamkeitsprüfung

Fall: {{fall.aktenzeichen}}
Prüftermin: {{bem.wirksamkeitspruefung}}

Geprüfte Maßnahmen:
{{bem.massnahmen}}

Ergebnis / Wirkung:
{{bem.ergebnis}}

Weitere Schritte:
[bitte ergänzen]

Bewertung der SBV:
[bitte ergänzen]`
    },
    {
      key: 'bem-abschlussvermerk',
      title: 'BEM-Abschlussvermerk',
      category: 'bem',
      description: 'Abschlussvermerk mit Ergebnis, offenen Punkten und Aufbewahrungshinweis.',
      subject: 'BEM-Abschlussvermerk – {{fall.aktenzeichen}}',
      legalBasis: ['§ 167 Abs. 2 SGB IX', 'DSGVO'],
      tags: ['BEM', 'massnahme:bem', 'status:abgeschlossen', 'Abschluss', 'Datenschutz'],
      body: `BEM-Abschlussvermerk

Fall: {{fall.aktenzeichen}}
Status: {{bem.status}}
Ergebnis:
{{bem.ergebnis}}

Offene Punkte:
[bitte ergänzen]

Aufbewahrung / Löschung:
BEM-Unterlagen sind getrennt und zweckgebunden aufzubewahren. Nicht erforderliche oder nicht mehr erforderliche Informationen sind zu löschen beziehungsweise nicht weiter zu verwenden.

Abschlussdatum:
{{datum.heute}}

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'kuendigung-frist-schutzstatus-check',
      title: 'Kündigungsanhörung – Frist und Schutzstatus sichern',
      category: 'kuendigung',
      description: 'Interne SBV-Checkliste für Eingang, Frist, Schutzstatus und Integrationsamt.',
      subject: 'Kündigungsanhörung – Frist-/Schutzstatus-Check – {{fall.aktenzeichen}}',
      legalBasis: ['§ 178 Abs. 2 Satz 1 SGB IX', '§§ 168 ff. SGB IX'],
      tags: ['Kündigung', 'Frist', 'Schutzstatus', 'massnahme:termination_hearing', 'status:eingang'],
      body: `Kündigungsanhörung – Sofortcheck

Fall: {{fall.aktenzeichen}}
Eingang: {{kuendigung.eingang}}
SBV-Frist: {{kuendigung.sbv_frist}}
Kündigungsart: {{kuendigung.art}}
Schutzstatus: {{kuendigung.schutzstatus}}

Sofort zu klären:
- Ist die SBV vollständig unterrichtet?
- Ist der Schutzstatus geklärt?
- Muss das Integrationsamt beteiligt werden?
- Liegen Kündigungsgrund und entscheidungserhebliche Unterlagen vollständig vor?

Fehlende Punkte:
{{kuendigung.fehlende_unterlagen}}`
    },
    {
      key: 'kuendigung-unterlagen-unvollstaendig',
      title: 'Kündigungsanhörung – Unterlagen unvollständig',
      category: 'kuendigung',
      description: 'Nachforderung fehlender Informationen zur SBV-Anhörung.',
      subject: 'Kündigungsanhörung – Unterlagen unvollständig – {{fall.aktenzeichen}}',
      legalBasis: ['§ 178 Abs. 2 Satz 1 SGB IX', '§§ 168 ff. SGB IX'],
      tags: ['Kündigung', 'SBV-Anhörung', 'massnahme:termination_hearing', 'status:unterlagen_pruefen'],
      body: `Sehr geehrte Damen und Herren,

die Schwerbehindertenvertretung wurde zur beabsichtigten Kündigung im Fall {{fall.aktenzeichen}} beteiligt.

Nach aktueller Prüfung sind die vorliegenden Unterlagen für eine sachgerechte Stellungnahme nicht vollständig.

Es fehlen insbesondere:
{{kuendigung.fehlende_unterlagen}}

Bitte reichen Sie die fehlenden Informationen unverzüglich nach. Bis zur vollständigen Unterrichtung kann die Schwerbehindertenvertretung die Angelegenheit nicht abschließend bewerten.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'kuendigung-integrationsamt-hinweis',
      title: 'Kündigungsanhörung – Integrationsamt prüfen',
      category: 'kuendigung',
      description: 'Hinweis auf besonderen Kündigungsschutz und Zustimmungserfordernis.',
      subject: 'Kündigungsanhörung – Integrationsamt / besonderer Kündigungsschutz – {{fall.aktenzeichen}}',
      legalBasis: ['§§ 168 ff. SGB IX', '§ 178 Abs. 2 Satz 1 SGB IX'],
      tags: ['Kündigung', 'Integrationsamt', 'massnahme:termination_hearing', 'status:integrationsamt_pruefen'],
      body: `Sehr geehrte Damen und Herren,

im Zusammenhang mit der beabsichtigten Kündigung im Fall {{fall.aktenzeichen}} ist der besondere Kündigungsschutz zu prüfen.

Dokumentierter Schutzstatus:
{{kuendigung.schutzstatus}}

Stand Integrationsamt:
{{kuendigung.integrationsamt_stand}}

Aus Sicht der Schwerbehindertenvertretung darf eine Kündigung schwerbehinderter oder gleichgestellter Menschen ohne die erforderliche Beteiligung und Zustimmung des Integrationsamts nicht umgesetzt werden.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'kuendigung-sbv-stellungnahme',
      title: 'Kündigungsanhörung – SBV-Stellungnahme',
      category: 'kuendigung',
      description: 'Strukturierte Stellungnahme der SBV zur Kündigungsanhörung.',
      subject: 'SBV-Stellungnahme zur Kündigungsanhörung – {{fall.aktenzeichen}}',
      legalBasis: ['§ 178 Abs. 2 Satz 1 SGB IX', '§ 164 Abs. 4 SGB IX', '§§ 168 ff. SGB IX'],
      tags: ['Kündigung', 'SBV-Stellungnahme', 'massnahme:termination_hearing', 'status:stellungnahme_in_arbeit'],
      body: `Stellungnahme der Schwerbehindertenvertretung

Fall: {{fall.aktenzeichen}}
Kündigungsart: {{kuendigung.art}}
Eingang der Anhörung: {{kuendigung.eingang}}
SBV-Frist: {{kuendigung.sbv_frist}}

Arbeitgebervortrag:
{{kuendigung.grund}}

Bewertung der SBV:
{{kuendigung.bewertung}}

Stellungnahme:
{{kuendigung.stellungnahme}}

Die Schwerbehindertenvertretung bittet um Berücksichtigung der behinderungsbedingten Belange, der Beteiligungsrechte nach § 178 Abs. 2 Satz 1 SGB IX und – soweit einschlägig – des besonderen Kündigungsschutzes nach §§ 168 ff. SGB IX. Die weitere Entscheidung und deren Begründung bitte ich zu dokumentieren.`
    },
    {
      key: 'gleichstellung-antrag-unterstuetzung',
      title: 'Gleichstellungsantrag unterstützen',
      category: 'gleichstellung',
      description: 'Beratungsschreiben zur Antragstellung und betrieblichen Begründung.',
      subject: 'Gleichstellungsantrag – Unterstützung durch die SBV – {{fall.aktenzeichen}}',
      legalBasis: ['§ 2 Abs. 3 SGB IX', '§ 151 SGB IX'],
      tags: ['Gleichstellung', 'GdB', 'massnahme:equalization', 'status:vorbereitung'],
      body: `Sehr geehrte*r {{fall.name}},

die Schwerbehindertenvertretung unterstützt Sie bei der Vorbereitung eines Gleichstellungsantrags.

Eine Gleichstellung kommt in Betracht, wenn ein Grad der Behinderung von weniger als 50, aber mindestens 30 vorliegt und die Gleichstellung erforderlich ist, um einen geeigneten Arbeitsplatz zu erlangen oder zu behalten.

Für die betriebliche Begründung sollten insbesondere folgende Punkte geprüft werden:
- konkrete Gefährdung oder Erschwerung des Arbeitsplatzes,
- behinderungsbedingte Nachteile im Arbeitsverhältnis,
- erforderliche Unterstützung oder Schutzinstrumente,
- mögliche Bedeutung des besonderen Kündigungsschutzes.

Nächste Schritte:
{{gleichstellung.notizen}}

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'gleichstellung-unterlagen-nachfordern',
      title: 'Gleichstellung – Unterlagen nachfordern',
      category: 'gleichstellung',
      description: 'Fehlende Informationen für Antrag, Sachstand oder Widerspruch freundlich nachfordern.',
      subject: 'Gleichstellungsverfahren – Unterlagen / Sachstand – {{fall.aktenzeichen}}',
      legalBasis: ['§ 2 Abs. 3 SGB IX'],
      tags: ['Gleichstellung', 'Unterlagen', 'massnahme:equalization', 'status:nachfrage'],
      body: `Sehr geehrte Damen und Herren,

im Gleichstellungs-/GdB-bezogenen Vorgang {{fall.aktenzeichen}} bitte ich um Übersendung beziehungsweise Mitteilung der noch fehlenden Informationen.

Geschäftszeichen / Aktenzeichen:
{{gleichstellung.aktenzeichen}}

Aus Sicht der Schwerbehindertenvertretung sind insbesondere der aktuelle Verfahrensstand, vorliegende Nachfragen und etwaige Fristen relevant.

Bitte übersenden Sie die Informationen bis zum {{frist.datum}}.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'gleichstellung-widerspruch-frist',
      title: 'Gleichstellung – Widerspruchsfrist sichern',
      category: 'gleichstellung',
      description: 'Hinweis zur Sicherung der Widerspruchsfrist nach ablehnendem Bescheid.',
      subject: 'Gleichstellungsverfahren – Widerspruchsfrist – {{fall.aktenzeichen}}',
      legalBasis: ['§ 2 Abs. 3 SGB IX', 'SGB X'],
      tags: ['Gleichstellung', 'Widerspruch', 'Frist', 'massnahme:equalization', 'status:abgelehnt', 'status:widerspruch'],
      body: `Gleichstellungs-/GdB-Verfahren: {{fall.aktenzeichen}}

Bescheid erhalten am:
{{gleichstellung.bescheid_am}}

Widerspruchsfrist:
{{gleichstellung.widerspruchsfrist}}

Bewertung / nächste Schritte:
{{gleichstellung.notizen}}

Hinweis:
Die Schwerbehindertenvertretung kann unterstützen und auf Fristen hinweisen. Die rechtliche Vertretung im Widerspruchsverfahren sollte bei Bedarf anwaltlich oder durch eine geeignete Beratungsstelle erfolgen.`
    },
    {
      key: 'kuendigungsanhoerung-unterlagen-unvollstaendig',
      title: 'Kündigungsanhörung – Unterlagen unvollständig',
      category: 'kuendigung',
      description: 'Klarer Hinweis, wenn Unterrichtung oder Prüfgrundlage bei Kündigungsrisiko unzureichend ist.',
      subject: 'Kündigungsanhörung / SBV-Beteiligung – {{fall.aktenzeichen}}',
      legalBasis: ['§ 178 Abs. 2 Satz 1 SGB IX', '§ 168 SGB IX'],
      tags: ['Kündigung', 'Integrationsamt', 'Anhörung'],
      body: `Sehr geehrte Damen und Herren,

in der Angelegenheit {{fall.aktenzeichen}} ist eine belastbare Stellungnahme der Schwerbehindertenvertretung auf der derzeitigen Informationsgrundlage nicht möglich.

Bitte reichen Sie bis zum {{frist.datum}} die vollständigen entscheidungserheblichen Unterlagen nach. Dazu gehören insbesondere die beabsichtigte Maßnahme, die tragenden Gründe, der behinderungsbezogene Sachverhalt, bisher geprüfte mildere Mittel sowie der Stand einer etwa erforderlichen Beteiligung des Inklusionsamts.

Ich weise darauf hin, dass die Anhörung nach § 178 Abs. 2 Satz 1 SGB IX vor einer Entscheidung zu erfolgen hat. Eine nachträgliche Information ersetzt die gesetzlich vorgesehene Beteiligung nicht.

Mit freundlichen Grüßen
{{sbv.name}}`
    },
    {
      key: 'freundliche-fristerinnerung',
      title: 'Freundliche Fristerinnerung',
      category: 'frist',
      description: 'Kurze, sachliche Erinnerung ohne Eskalationsrhetorik.',
      subject: 'Erinnerung: Rückmeldung erbeten bis {{frist.datum}} – {{fall.aktenzeichen}}',
      legalBasis: [],
      tags: ['Frist', 'Nachhalten'],
      body: `Sehr geehrte Damen und Herren,

ich erinnere freundlich an meine Bitte um Rückmeldung im Vorgang {{fall.aktenzeichen}}.

Für die weitere Bearbeitung durch die Schwerbehindertenvertretung benötige ich den aktuellen Sachstand beziehungsweise die angeforderten Informationen bis zum {{frist.datum}}.

Sollte eine vollständige Rückmeldung bis dahin nicht möglich sein, bitte ich um eine kurze Mitteilung, wann mit einer belastbaren Antwort zu rechnen ist.

Mit freundlichen Grüßen
{{sbv.name}}`
    }
  ];
}

function likePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export class TemplateService {
  constructor(private readonly dbProvider: () => DatabaseAdapter) {}

  private get db(): DatabaseAdapter {
    const db = this.dbProvider();
    this.ensureSchema(db);
    return db;
  }

  ensureSchema(db: DatabaseAdapter): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id TEXT PRIMARY KEY,
        template_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        legal_basis_json TEXT NOT NULL DEFAULT '[]',
        tags_json TEXT NOT NULL DEFAULT '[]',
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_renders (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
        case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
      CREATE INDEX IF NOT EXISTS idx_template_renders_case ON template_renders(case_id, created_at);
    `);
    this.seedDefaults(db);
  }

  private seedDefaults(db: DatabaseAdapter): void {
    const timestamp = nowIso();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO document_templates (
        id, template_key, title, category, description, subject, body, legal_basis_json, tags_json, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    defaultTemplates().forEach((template) => {
      insert.run(
        randomUUID(),
        template.key ?? normalizeTemplateKey(template.title),
        template.title,
        template.category,
        optionalText(template.description),
        template.subject,
        template.body,
        jsonString(template.legalBasis),
        jsonString(template.tags),
        timestamp,
        timestamp
      );
    });
  }

  async listTemplates(filters: TemplateListFilters = {}): Promise<TemplateRecord[]> {
    const db = this.db;
    const query = filters.query?.trim();
    const category = filters.category ?? null;
    const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);

    if (query) {
      const pattern = likePattern(query);
      const rows = db.prepare<any>(`
        SELECT * FROM document_templates
        WHERE (? IS NULL OR category = ?)
          AND (? = 1 OR is_system = 0)
          AND (
            title LIKE ? ESCAPE '\\'
            OR COALESCE(description, '') LIKE ? ESCAPE '\\'
            OR subject LIKE ? ESCAPE '\\'
            OR body LIKE ? ESCAPE '\\'
            OR legal_basis_json LIKE ? ESCAPE '\\'
            OR tags_json LIKE ? ESCAPE '\\'
          )
        ORDER BY is_system DESC, category, title COLLATE NOCASE
        LIMIT ?
      `).all(category, category, filters.includeSystem === false ? 0 : 1, pattern, pattern, pattern, pattern, pattern, pattern, limit);
      return rows.map(mapTemplate);
    }

    const rows = db.prepare<any>(`
      SELECT * FROM document_templates
      WHERE (? IS NULL OR category = ?)
        AND (? = 1 OR is_system = 0)
      ORDER BY is_system DESC, category, title COLLATE NOCASE
      LIMIT ?
    `).all(category, category, filters.includeSystem === false ? 0 : 1, limit);
    return rows.map(mapTemplate);
  }

  async createTemplate(input: CreateTemplateInput): Promise<TemplateRecord> {
    const title = input.title.trim();
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!title) throw new Error('Bitte einen Titel erfassen.');
    if (!subject) throw new Error('Bitte einen Betreff erfassen.');
    if (!body) throw new Error('Bitte einen Vorlagentext erfassen.');

    const db = this.db;
    const id = randomUUID();
    const timestamp = nowIso();
    db.prepare(`
      INSERT INTO document_templates (
        id, template_key, title, category, description, subject, body, legal_basis_json, tags_json, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      input.key?.trim() || `${normalizeTemplateKey(title)}-${Date.now()}`,
      title,
      input.category,
      optionalText(input.description),
      subject,
      body,
      jsonString(input.legalBasis),
      jsonString(input.tags),
      timestamp,
      timestamp
    );
    return mapTemplate(db.prepare<any>('SELECT * FROM document_templates WHERE id = ?').get(id));
  }

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<TemplateRecord> {
    const db = this.db;
    const before = db.prepare<any>('SELECT * FROM document_templates WHERE id = ?').get(id);
    if (!before) throw new Error('Vorlage nicht gefunden.');
    if (before.is_system) throw new Error('Systemvorlagen können nicht überschrieben werden. Bitte eigene Vorlage anlegen.');

    db.prepare(`
      UPDATE document_templates SET
        title = ?, category = ?, description = ?, subject = ?, body = ?, legal_basis_json = ?, tags_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.title?.trim() || before.title,
      input.category ?? before.category,
      input.description === undefined ? before.description : optionalText(input.description),
      input.subject?.trim() || before.subject,
      input.body?.trim() || before.body,
      input.legalBasis === undefined ? before.legal_basis_json : jsonString(input.legalBasis),
      input.tags === undefined ? before.tags_json : jsonString(input.tags),
      nowIso(),
      id
    );
    return mapTemplate(db.prepare<any>('SELECT * FROM document_templates WHERE id = ?').get(id));
  }

  async deleteTemplate(id: string): Promise<{ deleted: boolean }> {
    const db = this.db;
    const before = db.prepare<any>('SELECT is_system FROM document_templates WHERE id = ?').get(id);
    if (!before) return { deleted: false };
    if (before.is_system) throw new Error('Systemvorlagen können nicht gelöscht werden.');
    const result = db.prepare<any>('DELETE FROM document_templates WHERE id = ?').run(id) as { changes?: number } | undefined;
    return { deleted: Boolean(result?.changes) };
  }

  async renderTemplate(input: RenderTemplateInput): Promise<RenderedTemplateResult> {
    const db = this.db;
    const templateRow = db.prepare<any>('SELECT * FROM document_templates WHERE id = ?').get(input.templateId);
    if (!templateRow) throw new Error('Vorlage nicht gefunden.');
    const template = mapTemplate(templateRow);
    const context = this.buildContext(db, input.caseId, input.values);
    const subjectResult = renderTemplateText(template.subject, context);
    const bodyResult = renderTemplateText(template.body, context);
    const renderedAt = nowIso();
    let archivedId: string | undefined;

    if (input.archive !== false) {
      archivedId = randomUUID();
      db.prepare(`
        INSERT INTO template_renders (id, template_id, case_id, subject, body, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(archivedId, template.id, input.caseId ?? null, subjectResult.text, bodyResult.text, renderedAt);
    }

    return {
      templateId: template.id,
      title: template.title,
      subject: subjectResult.text,
      body: bodyResult.text,
      caseId: input.caseId,
      archivedId,
      unresolvedPlaceholders: [...new Set([...subjectResult.unresolvedPlaceholders, ...bodyResult.unresolvedPlaceholders])].sort((a, b) => a.localeCompare(b)),
      renderedAt
    };
  }

  async renderContextTemplate(input: RenderContextTemplateInput): Promise<RenderedTemplateResult> {
    const db = this.db;
    const template = db.prepare<any>('SELECT * FROM document_templates WHERE template_key = ?').get(input.templateKey);
    if (!template) throw new Error(`Vorlage nicht gefunden: ${input.templateKey}`);
    const sourceValues = this.buildSourceContext(db, input);
    return this.renderTemplate({
      templateId: template.id,
      caseId: input.caseId,
      archive: input.archive,
      values: {
        ...sourceValues,
        ...(input.values ?? {})
      }
    });
  }

  private buildSourceContext(db: DatabaseAdapter, input: RenderContextTemplateInput): Record<string, string> {
    const values: Record<string, string> = {};
    if (input.sourceLabel) values['quelle.bezeichnung'] = input.sourceLabel;
    if (input.sourceType) values['quelle.typ'] = input.sourceType;

    if (input.sourceType === 'prevention' && input.sourceId && this.tableExists(db, 'prevention_processes')) {
      const row = db.prepare<any>('SELECT * FROM prevention_processes WHERE id = ?').get(input.sourceId);
      if (row) {
        values['praevention.status'] = row.status ?? '';
        values['praevention.gefaehrdung'] = row.risk_type ?? '';
        values['praevention.schwierigkeit'] = row.difficulty_type ?? '';
        values['praevention.erste_kenntnis'] = row.first_knowledge_at ? new Date(row.first_knowledge_at).toLocaleDateString('de-DE') : '';
        values['praevention.arbeitgeberfrist'] = row.employer_response_due_at ? new Date(row.employer_response_due_at).toLocaleDateString('de-DE') : '';
        values['frist.datum'] = values['frist.datum'] || values['praevention.arbeitgeberfrist'];
      }
    }

    return values;
  }

  private buildContext(db: DatabaseAdapter, caseId?: string, values: Record<string, string> = {}): TemplateContext {
    const context: TemplateContext = { ...buildFallbackTemplateContext(), ...values };
    if (caseId) {
      const caseRow = db.prepare<any>('SELECT * FROM cases WHERE id = ?').get(caseId);
      if (caseRow) {
        context['fall.id'] = caseRow.id;
        context['fall.aktenzeichen'] = caseRow.case_number;
        context['fall.name'] = caseRow.display_name;
        context['person.name'] = caseRow.display_name;
        context['fall.kategorie'] = caseRow.category;
        context['fall.status'] = caseRow.status;
        context['fall.kurzbeschreibung'] = caseRow.summary ?? '';
        context['fall.risiko'] = caseRow.risk_level ?? '';
      }

      if (this.tableExists(db, 'case_legal_references') && this.tableExists(db, 'legal_norms')) {
        const norms = db.prepare<any>(`
          SELECT n.paragraph, n.source
          FROM case_legal_references r
          JOIN legal_norms n ON n.id = r.legal_norm_id
          WHERE r.case_id = ?
          ORDER BY n.source, n.paragraph
        `).all(caseId);
        context.normen = norms.map((row) => `${row.paragraph} ${row.source}`).join(', ');
      }
    }
    return context;
  }

  private tableExists(db: DatabaseAdapter, table: string): boolean {
    return Boolean(db.prepare<{ found: number }>('SELECT 1 AS found FROM sqlite_master WHERE type IN (\'table\', \'view\') AND name = ?').get(table));
  }
}
