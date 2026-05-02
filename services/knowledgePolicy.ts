export interface SeedLegalNorm {
  id: string;
  source: string;
  paragraph: string;
  title: string;
  shortText: string;
  sbvMeaning: string;
  practiceNote: string;
  typicalCases: string;
  tags: string[];
  checklist: string[];
}

export const KNOWLEDGE_SCHEMA_VERSION = '0013';

export const DEFAULT_LEGAL_NORMS: SeedLegalNorm[] = [
  {
    id: 'sgb-ix-167-1',
    source: 'SGB IX',
    paragraph: '§ 167 Abs. 1 SGB IX',
    title: 'Prävention',
    shortText: 'Arbeitgeber muss bei Schwierigkeiten im Arbeitsverhältnis frühzeitig SBV, Interessenvertretung und Inklusionsamt einschalten.',
    sbvMeaning: 'Zentraler SBV-Hebel, bevor es zu Kündigung, Versetzung, Eskalation oder dauerhafter Gesundheitsgefährdung kommt.',
    practiceNote: 'Nicht auf die BEM-Schwelle warten. Sobald eine Gefährdung erkennbar ist, Beteiligung und konkrete Präventionsschritte schriftlich einfordern.',
    typicalCases: 'Überlastung, Konflikt mit Führungskraft, drohende Kündigung, behinderungsbedingte Leistungsprobleme, verweigerte Arbeitsplatzanpassung.',
    tags: ['Prävention', 'Inklusionsamt', 'Gefährdung', 'SBV-Beteiligung'],
    checklist: [
      'Ist die Person schwerbehindert oder gleichgestellt?',
      'Liegt eine erkennbare Schwierigkeit im Arbeitsverhältnis vor?',
      'Kann die Schwierigkeit das Arbeitsverhältnis gefährden?',
      'Wurde die SBV unverzüglich beteiligt?',
      'Wurde das Inklusionsamt eingeschaltet?',
      'Sind konkrete Präventionsmaßnahmen dokumentiert?'
    ]
  },
  {
    id: 'sgb-ix-167-2',
    source: 'SGB IX',
    paragraph: '§ 167 Abs. 2 SGB IX',
    title: 'Betriebliches Eingliederungsmanagement',
    shortText: 'BEM ist anzubieten, wenn Beschäftigte innerhalb von zwölf Monaten länger als sechs Wochen arbeitsunfähig waren.',
    sbvMeaning: 'Wichtiges Verfahren zur Sicherung von Gesundheit und Beschäftigung; bei schwerbehinderten Menschen mit besonderer SBV-Relevanz.',
    practiceNote: 'Freiwilligkeit, Datenschutz, Beteiligtenwahl und echte Maßnahmenklärung dokumentieren. Keine Diagnosen abfragen.',
    typicalCases: 'Langzeiterkrankung, wiederholte Kurzerkrankungen, Wiedereingliederung, Arbeitsplatzanpassung.',
    tags: ['BEM', 'Gesundheit', 'Arbeitsunfähigkeit', 'Datenschutz'],
    checklist: ['BEM-Auslöser geprüft?', 'Einladung dokumentiert?', 'Freiwilligkeit erläutert?', 'Datenschutz geklärt?', 'Maßnahmen geplant?', 'Evaluation terminiert?']
  },
  {
    id: 'sgb-ix-178-1',
    source: 'SGB IX',
    paragraph: '§ 178 Abs. 1 SGB IX',
    title: 'Aufgaben der Schwerbehindertenvertretung',
    shortText: 'SBV fördert die Eingliederung und wacht über zugunsten schwerbehinderter Menschen geltende Vorschriften.',
    sbvMeaning: 'Grundnorm des SBV-Amts: Fördern, Überwachen, Unterstützen und Anträge begleiten.',
    practiceNote: 'Bei jeder Arbeitgebermaßnahme prüfen, ob schwerbehinderte Menschen einzeln oder als Gruppe berührt sind.',
    typicalCases: 'Arbeitsplatzgestaltung, Nachteilsausgleich, BEM, Prävention, Kündigung, Gleichstellung.',
    tags: ['SBV', 'Aufgaben', 'Überwachung'],
    checklist: ['Ist ein schwerbehinderter oder gleichgestellter Mensch betroffen?', 'Gibt es eine Pflicht des Arbeitgebers?', 'Muss die SBV aktiv werden?', 'Ist der Vorgang dokumentiert?']
  },
  {
    id: 'sgb-ix-178-2',
    source: 'SGB IX',
    paragraph: '§ 178 Abs. 2 SGB IX',
    title: 'Unterrichtung und Anhörung der SBV',
    shortText: 'SBV ist in allen Angelegenheiten unverzüglich und umfassend zu unterrichten und vor Entscheidungen anzuhören.',
    sbvMeaning: 'Kernbeteiligungsrecht der SBV. Ohne rechtzeitige und vollständige Beteiligung fehlt der SBV die Möglichkeit zur Einflussnahme.',
    practiceNote: 'Unvollständige Unterlagen ausdrücklich rügen und Nachreichung mit Frist verlangen. Entscheidung des Arbeitgebers dokumentieren.',
    typicalCases: 'Kündigung, Versetzung, Arbeitsplatzgestaltung, BEM, Prävention, Regeländerungen mit Schwerbehindertenbezug.',
    tags: ['Anhörung', 'Unterrichtung', 'Beteiligung', 'SBV'],
    checklist: ['Wurde unverzüglich unterrichtet?', 'Sind die Unterlagen vollständig?', 'Wurde vor der Entscheidung angehört?', 'Wurde Stellung genommen?', 'Wurde ein Verstoß dokumentiert?']
  },
  {
    id: 'sgb-ix-164-4',
    source: 'SGB IX',
    paragraph: '§ 164 Abs. 4 SGB IX',
    title: 'Behinderungsgerechte Beschäftigung',
    shortText: 'Schwerbehinderte Menschen haben Anspruch auf behinderungsgerechte Beschäftigung und Arbeitsplatzgestaltung.',
    sbvMeaning: 'Materieller Anspruch für konkrete Arbeitsplatzanpassungen, Hilfsmittel, Arbeitsorganisation und Qualifizierung.',
    practiceNote: 'Bedarf arbeitsplatzbezogen formulieren: Welche Barriere besteht, welche Maßnahme beseitigt sie, welche Stelle kann fördern?',
    typicalCases: 'fester Arbeitsplatz, technische Hilfen, Arbeitszeit, Aufgabenanpassung, Homeoffice, Qualifizierung.',
    tags: ['Arbeitsplatzgestaltung', 'Nachteilsausgleich', 'Hilfsmittel'],
    checklist: ['Welche Einschränkung wirkt am Arbeitsplatz?', 'Welche Anpassung ist erforderlich?', 'Sind Fördermöglichkeiten geprüft?', 'Ist der Arbeitgeber schriftlich befasst?']
  },
  {
    id: 'sgb-ix-168',
    source: 'SGB IX',
    paragraph: '§ 168 SGB IX',
    title: 'Zustimmung Integrationsamt bei Kündigung',
    shortText: 'Die Kündigung eines schwerbehinderten Menschen bedarf grundsätzlich der vorherigen Zustimmung des Integrationsamts.',
    sbvMeaning: 'Zentraler Schutzmechanismus bei Kündigungen schwerbehinderter und gleichgestellter Beschäftigter.',
    practiceNote: 'Bei jeder Kündigungsanhörung sofort prüfen: Status, Kenntnis Arbeitgeber, Antrag/Gleichstellung, Integrationsamt, SBV-Beteiligung.',
    typicalCases: 'ordentliche Kündigung, Änderungskündigung, außerordentliche Kündigung, krankheitsbedingte Kündigung.',
    tags: ['Kündigung', 'Integrationsamt', 'Sonderkündigungsschutz'],
    checklist: ['Ist die Person schwerbehindert/gleichgestellt?', 'Liegt Zustimmung des Integrationsamts vor?', 'Wurde die SBV vorher beteiligt?', 'Ist die Unterrichtung vollständig?']
  },
  {
    id: 'betrvg-102',
    source: 'BetrVG',
    paragraph: '§ 102 BetrVG',
    title: 'Anhörung des Betriebsrats bei Kündigungen',
    shortText: 'Der Betriebsrat ist vor jeder Kündigung anzuhören.',
    sbvMeaning: 'Wichtige Schnittstelle zwischen BR-Anhörung und SBV-Anhörung in Kündigungsfällen.',
    practiceNote: 'SBV-Anhörung und BR-Anhörung getrennt prüfen. BR-Beteiligung ersetzt die SBV-Beteiligung nicht.',
    typicalCases: 'Kündigungsanhörung, Fristenprüfung, Stellungnahme, Widerspruch BR.',
    tags: ['Betriebsrat', 'Kündigung', 'Anhörung'],
    checklist: ['BR-Anhörung bekannt?', 'SBV getrennt beteiligt?', 'Fristen dokumentiert?', 'Unterlagen deckungsgleich?']
  },
  {
    id: 'agg-7',
    source: 'AGG',
    paragraph: '§ 7 AGG',
    title: 'Benachteiligungsverbot',
    shortText: 'Beschäftigte dürfen wegen eines geschützten Merkmals nicht benachteiligt werden.',
    sbvMeaning: 'Relevant bei Diskriminierung wegen Behinderung, fehlender angemessener Vorkehrungen oder stigmatisierender Behandlung.',
    practiceNote: 'Sachverhalt zeitnah dokumentieren. Indizien, Vergleichsgruppen und Reaktionen des Arbeitgebers festhalten.',
    typicalCases: 'Diskriminierung, Bewerbungsverfahren, Benachteiligung, Mobbing, fehlende Anpassung.',
    tags: ['AGG', 'Diskriminierung', 'Benachteiligung'],
    checklist: ['Gibt es ein geschütztes Merkmal?', 'Welche Benachteiligung liegt vor?', 'Welche Indizien sind dokumentiert?', 'Wurde Abhilfe verlangt?']
  },
  {
    id: 'kschg-4',
    source: 'KSchG',
    paragraph: '§ 4 KSchG',
    title: 'Klagefrist',
    shortText: 'Gegen eine Kündigung muss grundsätzlich innerhalb von drei Wochen Kündigungsschutzklage erhoben werden.',
    sbvMeaning: 'Die SBV ersetzt keine anwaltliche Beratung, sollte aber in Kündigungsfällen auf die Dringlichkeit der Klagefrist hinweisen.',
    practiceNote: 'Keine Rechtsvertretung übernehmen. Betroffene Person auf unverzügliche anwaltliche/gewerkschaftliche Beratung hinweisen und Hinweis dokumentieren.',
    typicalCases: 'Kündigungszugang, Klagefrist, anwaltliche Weitergabe, Fristenhinweis.',
    tags: ['Kündigung', 'Klagefrist', 'KSchG'],
    checklist: ['Zugang der Kündigung bekannt?', 'Hinweis auf anwaltliche Beratung dokumentiert?', 'Gewerkschaft/Rechtsschutz bekannt?', 'Frist als Wiedervorlage gesetzt?']
  },
  {
    id: 'dsgvo-art-9',
    source: 'DSGVO',
    paragraph: 'Art. 9 DSGVO',
    title: 'Besondere Kategorien personenbezogener Daten',
    shortText: 'Gesundheitsdaten und Behinderungsdaten sind besonders schutzbedürftig.',
    sbvMeaning: 'Grundlage für die besonders strenge Schutzlogik von Gremia.SBV und der SBV-Fallarbeit.',
    practiceNote: 'So wenig Gesundheitsdaten wie möglich erfassen. Wenn nötig, besonders kennzeichnen, verschlüsseln und Löschprüfung beachten.',
    typicalCases: 'Atteste, BEM, GdB, Diagnosen, Gesundheitsnotizen, Arbeitsplatzanpassung.',
    tags: ['Datenschutz', 'Gesundheitsdaten', 'DSGVO'],
    checklist: ['Sind Gesundheitsdaten wirklich erforderlich?', 'Ist die Vertraulichkeitsstufe passend?', 'Ist ein Lösch-/Prüfdatum vorgesehen?', 'Sind Exporte geschützt?']
  }
];

export function normalizeNormQuery(value: string): string {
  return value.trim().toLowerCase().replace(/§+/g, '').replace(/\s+/g, ' ');
}

export function normMatchesQuery(norm: Pick<SeedLegalNorm, 'source' | 'paragraph' | 'title' | 'shortText' | 'tags'>, query: string): boolean {
  const normalized = normalizeNormQuery(query);
  if (!normalized) return true;
  const haystack = normalizeNormQuery(`${norm.source} ${norm.paragraph} ${norm.title} ${norm.shortText} ${norm.tags.join(' ')}`);
  return normalized.split(' ').every((part) => haystack.includes(part));
}

export function buildNormInsertText(norm: Pick<SeedLegalNorm, 'paragraph' | 'title' | 'shortText'>): string {
  return `${norm.paragraph} – ${norm.title}: ${norm.shortText}`;
}

export function knowledgeExportPreview(normCount: number) {
  return {
    title: 'Wissensdatenbank-Export',
    normCount,
    includesCaseReferences: false as const,
    warning: 'Wissensexporte enthalten standardmäßig keine Fallbezüge.'
  };
}
