import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseLawRecord, CaseLegalReferenceRecord, LegalNormRecord, NormChecklistItemRecord, NormCommentRecord } from '../../core/models/knowledge.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

const SBV_ADVISOR_KNOWLEDGE_ENTRIES = [
  {
    id: 'advisor-sgb-ix-151',
    source: 'SGB IX',
    paragraph: '§ 151 SGB IX',
    title: 'Geltungsbereich Schwerbehindertenrecht',
    shortText: 'Regelt, für wen die besonderen Schutz- und Förderrechte schwerbehinderter Menschen gelten.',
    sbvMeaning: 'Prüfe zuerst, ob Schwerbehinderung, Gleichstellung oder ein laufender Antrag relevant ist. Davon hängt ab, welche Beteiligungs- und Schutzrechte greifen.',
    practiceNote: 'In der Fallakte den Status sauber dokumentieren: anerkannt, gleichgestellt, Antrag läuft oder unklar.',
    typicalCases: 'Neue Beratung, unklarer Status, Gleichstellungsantrag, Beteiligung bei personeller Maßnahme.',
    tags: ['Schwerbehinderung', 'Gleichstellung', 'Status', 'Anwendungsbereich']
  },
  {
    id: 'advisor-sgb-ix-152',
    source: 'SGB IX',
    paragraph: '§ 152 SGB IX',
    title: 'Feststellung der Behinderung',
    shortText: 'Grundlage für die Feststellung des Grades der Behinderung und der Merkzeichen.',
    sbvMeaning: 'Wichtig für Beratung zur Antragstellung und für die Einordnung, ob besonderer Schutz bereits sicher oder noch in Klärung ist.',
    practiceNote: 'SBV kann beim Antrag unterstützen, sollte aber keine medizinische Bewertung vornehmen. Fristen und Bescheide als Dokumente ablegen.',
    typicalCases: 'Erstantrag, Verschlimmerungsantrag, Merkzeichen, Widerspruch gegen GdB.',
    tags: ['GdB', 'Antrag', 'Merkzeichen', 'Versorgungsamt']
  },
  {
    id: 'advisor-sgb-ix-163',
    source: 'SGB IX',
    paragraph: '§ 163 SGB IX',
    title: 'Beschäftigungspflicht und Ausgleichsabgabe',
    shortText: 'Arbeitgeber müssen schwerbehinderte Menschen beschäftigen und Nichterfüllung ausgleichen.',
    sbvMeaning: 'Hilft bei strategischen Gesprächen über Beschäftigung, Personalplanung und Inklusion.',
    practiceNote: 'Nicht nur Quote betrachten: entscheidend ist, ob konkrete Beschäftigungsmöglichkeiten geprüft und genutzt werden.',
    typicalCases: 'Personalplanung, Stellenbesetzung, Inklusionsvereinbarung, Berichtspflichten.',
    tags: ['Beschäftigungspflicht', 'Quote', 'Ausgleichsabgabe', 'Personalplanung']
  },
  {
    id: 'advisor-sgb-ix-164',
    source: 'SGB IX',
    paragraph: '§ 164 SGB IX',
    title: 'Pflichten des Arbeitgebers und behinderungsgerechte Beschäftigung',
    shortText: 'Zentrale Anspruchsgrundlage für leidens- und behinderungsgerechte Beschäftigung, Ausstattung und Förderung.',
    sbvMeaning: 'Kernnorm für Arbeitsplatzanpassung, technische Hilfen, Arbeitsorganisation, Qualifizierung und Nachteilsausgleich.',
    practiceNote: 'Immer konkret fragen: Welche Tätigkeit, welche Einschränkung, welche Anpassung, welche Kostenstelle, welche Fördermöglichkeit?',
    typicalCases: 'Homeoffice, Teilzeit, Arbeitsplatzgestaltung, Hilfsmittel, Aufgabenänderung, Überlastung.',
    tags: ['Arbeitsplatzgestaltung', 'Nachteilsausgleich', 'Homeoffice', 'Hilfsmittel', 'Teilzeit']
  },
  {
    id: 'advisor-sgb-ix-165',
    source: 'SGB IX',
    paragraph: '§ 165 SGB IX',
    title: 'Pflichten öffentlicher Arbeitgeber bei Stellenbesetzung',
    shortText: 'Öffentliche Arbeitgeber haben besondere Prüf- und Einladungspflichten gegenüber schwerbehinderten Bewerbenden.',
    sbvMeaning: 'Für SBV relevant bei Auswahlverfahren, internen Bewerbungen und Verdacht auf Benachteiligung.',
    practiceNote: 'Frühzeitig Unterlagen, Bewerberfeld und Beteiligung der SBV sichern. Nicht erst nach Auswahlentscheidung reagieren.',
    typicalCases: 'Bewerbung, interne Stelle, Einladungspflicht, Auswahlentscheidung, AGG-Risiko.',
    tags: ['Bewerbung', 'Stellenbesetzung', 'Einladung', 'öffentlicher Arbeitgeber']
  },
  {
    id: 'advisor-sgb-ix-167-1',
    source: 'SGB IX',
    paragraph: '§ 167 Abs. 1 SGB IX',
    title: 'Präventionsverfahren',
    shortText: 'Bei Schwierigkeiten, die das Arbeitsverhältnis gefährden können, muss der Arbeitgeber frühzeitig Prävention betreiben.',
    sbvMeaning: 'Sehr starkes Werkzeug der SBV, wenn Belastung, Konflikt oder gesundheitliche Gefährdung eskaliert.',
    practiceNote: 'Schriftlich einfordern, Anlass konkret benennen, Beteiligte und Frist zur Arbeitgeberreaktion dokumentieren.',
    typicalCases: 'Überlastung, Konflikt mit Führungskraft, drohende Kündigung, Arbeitsplatzverlust, Chronifizierungsrisiko.',
    tags: ['Prävention', 'Gefährdung', 'Arbeitgeberpflicht', 'Inklusionsamt']
  },
  {
    id: 'advisor-sgb-ix-167-2',
    source: 'SGB IX',
    paragraph: '§ 167 Abs. 2 SGB IX',
    title: 'Betriebliches Eingliederungsmanagement',
    shortText: 'BEM ist anzubieten, wenn Beschäftigte länger als sechs Wochen arbeitsunfähig sind.',
    sbvMeaning: 'SBV achtet auf Freiwilligkeit, Datenschutz, sauberes Verfahren und konkrete Maßnahmen statt Symboltermin.',
    practiceNote: 'Einwilligung, Teilnehmende, Ziele, Maßnahmen und Ergebnis getrennt dokumentieren. Keine Gesundheitsdaten ohne Erforderlichkeit.',
    typicalCases: 'Langzeiterkrankung, Wiedereingliederung, Arbeitsplatzanpassung, krankheitsbedingte Kündigung.',
    tags: ['BEM', 'Arbeitsunfähigkeit', 'Wiedereingliederung', 'Datenschutz']
  },
  {
    id: 'advisor-sgb-ix-168',
    source: 'SGB IX',
    paragraph: '§ 168 SGB IX',
    title: 'Zustimmung des Integrationsamts bei Kündigung',
    shortText: 'Die Kündigung schwerbehinderter Menschen braucht grundsätzlich vorherige Zustimmung des Integrationsamts.',
    sbvMeaning: 'SBV muss sofort prüfen, ob Anhörung, Unterlagen, Prävention und BEM sauber erfolgt sind.',
    practiceNote: 'Fristen und Unterlagen eng führen. Bei fehlender SBV-Beteiligung Rechtsverletzung dokumentieren und anwaltlich prüfen lassen.',
    typicalCases: 'Kündigungsanhörung, Zustimmung Integrationsamt, krankheitsbedingte Kündigung, außerordentliche Kündigung.',
    tags: ['Kündigung', 'Integrationsamt', 'Sonderkündigungsschutz', 'Frist']
  },
  {
    id: 'advisor-sgb-ix-178-1',
    source: 'SGB IX',
    paragraph: '§ 178 Abs. 1 SGB IX',
    title: 'Aufgaben der SBV',
    shortText: 'Die SBV fördert die Eingliederung, vertritt Interessen und überwacht die Einhaltung der Schutzvorschriften.',
    sbvMeaning: 'Grundlage für aktives Handeln: beraten, überwachen, Anträge unterstützen, Maßnahmen anstoßen.',
    practiceNote: 'Nicht auf Beschwerden warten. Bei erkennbarer Betroffenheit Informationen anfordern und Beteiligung einfordern.',
    typicalCases: 'Beratung, GdB-Antrag, Arbeitgeberpflichten, Überwachung, Maßnahmenanstoß.',
    tags: ['SBV-Aufgaben', 'Überwachung', 'Beratung', 'Interessenvertretung']
  },
  {
    id: 'advisor-sgb-ix-178-2',
    source: 'SGB IX',
    paragraph: '§ 178 Abs. 2 SGB IX',
    title: 'Unterrichtung und Anhörung der SBV',
    shortText: 'Die SBV ist in allen Angelegenheiten schwerbehinderter Menschen unverzüglich und umfassend zu unterrichten und vor Entscheidungen anzuhören.',
    sbvMeaning: 'Zentraler Beteiligungsanspruch der SBV. Ohne vorherige Anhörung ist die Beteiligung nicht ordnungsgemäß.',
    practiceNote: 'Bei Verstößen schriftlich rügen, Unterlagen anfordern, Nachholung verlangen und Vorgang dokumentieren.',
    typicalCases: 'Versetzung, Kündigung, Stellenbesetzung, Arbeitszeit, Homeoffice, Organisationsänderung.',
    tags: ['Anhörung', 'Unterrichtung', 'Beteiligung', 'SBV-Rechte']
  },
  {
    id: 'advisor-sgb-ix-179',
    source: 'SGB IX',
    paragraph: '§ 179 SGB IX',
    title: 'Persönliche Rechte und Ressourcen der SBV',
    shortText: 'Regelt Schutz, Freistellung, Schulung, Kosten und Amtsausstattung der SBV.',
    sbvMeaning: 'Grundlage für Schulungen, Arbeitsmittel, Zeitaufwand und unabhängige Amtsführung.',
    practiceNote: 'Erforderlichkeit sachlich begründen. SBV-Zeit ist Amtszeit, keine normale Arbeitsaufgabe.',
    typicalCases: 'Schulung, Ausstattung, Freistellung, Zeitbuchung, Stellvertretung.',
    tags: ['Schulung', 'Kosten', 'Freistellung', 'Ausstattung']
  },
  {
    id: 'advisor-sgb-ix-182',
    source: 'SGB IX',
    paragraph: '§ 182 SGB IX',
    title: 'Zusammenarbeit',
    shortText: 'Arbeitgeber, Inklusionsbeauftragte, Betriebsrat und SBV sollen eng zusammenarbeiten.',
    sbvMeaning: 'Kooperation ja, Unterordnung nein. Die SBV bleibt eigenständige Interessenvertretung.',
    practiceNote: 'Zusammenarbeit strukturiert einfordern: feste Termine, klare Unterlagen, verbindliche Rückmeldungen.',
    typicalCases: 'Regeltermine, Arbeitgebergespräche, Inklusionsvereinbarung, Konflikte mit HR.',
    tags: ['Zusammenarbeit', 'Inklusionsbeauftragter', 'Betriebsrat', 'Arbeitgeber']
  },
  {
    id: 'advisor-sgb-ix-185',
    source: 'SGB IX',
    paragraph: '§ 185 SGB IX',
    title: 'Aufgaben des Integrationsamts',
    shortText: 'Das Integrationsamt unterstützt Teilhabe im Arbeitsleben, Prävention und Kündigungsschutz.',
    sbvMeaning: 'Wichtiger externer Hebel bei Arbeitsplatzanpassung, Konflikten und Präventionsverfahren.',
    practiceNote: 'Frühzeitig einschalten, wenn interne Klärung stockt oder Arbeitgebermaßnahmen ausbleiben.',
    typicalCases: 'Technische Hilfen, Prävention, Kündigung, Beratung, begleitende Hilfe.',
    tags: ['Integrationsamt', 'Förderung', 'Prävention', 'Kündigungsschutz']
  },
  {
    id: 'advisor-betrvg-80',
    source: 'BetrVG',
    paragraph: '§ 80 BetrVG',
    title: 'Allgemeine Aufgaben des Betriebsrats',
    shortText: 'Der Betriebsrat überwacht Gesetze und fördert u. a. Eingliederung schwerbehinderter Menschen.',
    sbvMeaning: 'Schnittstelle zur SBV, aber kein Ersatz für SBV-Beteiligung.',
    practiceNote: 'Bei Doppelrelevanz parallel denken: BR-Mitbestimmung und SBV-Anhörung sind getrennte Rechte.',
    typicalCases: 'Betriebsvereinbarung, Überwachung, Beschwerden, Gleichbehandlung.',
    tags: ['Betriebsrat', 'Überwachung', 'Schnittstelle', 'Mitbestimmung']
  },
  {
    id: 'advisor-betrvg-87',
    source: 'BetrVG',
    paragraph: '§ 87 BetrVG',
    title: 'Mitbestimmung in sozialen Angelegenheiten',
    shortText: 'Mitbestimmung u. a. bei Arbeitszeit, Ordnung, technischen Einrichtungen und Gesundheitsschutz.',
    sbvMeaning: 'SBV prüft zusätzlich, ob schwerbehinderte Menschen besonders betroffen sind.',
    practiceNote: 'Bei BV-Themen SBV-Perspektive früh einbringen: Barrierefreiheit, Ausnahmen, Nachteilsausgleich.',
    typicalCases: 'Arbeitszeit, Zeiterfassung, mobiles Arbeiten, Gesundheitsschutz, IT-Systeme.',
    tags: ['Mitbestimmung', 'Arbeitszeit', 'IT-Systeme', 'Gesundheitsschutz']
  },
  {
    id: 'advisor-betrvg-99',
    source: 'BetrVG',
    paragraph: '§ 99 BetrVG',
    title: 'Personelle Einzelmaßnahmen',
    shortText: 'Betriebsrat ist bei Einstellung, Eingruppierung, Umgruppierung und Versetzung zu beteiligen.',
    sbvMeaning: 'SBV-Beteiligung nach § 178 Abs. 2 SGB IX läuft daneben, wenn schwerbehinderte Menschen betroffen sind.',
    practiceNote: 'Nicht auf BR-Unterlagen verlassen. SBV hat eigenen Unterrichtungs- und Anhörungsanspruch.',
    typicalCases: 'Einstellung, Versetzung, Eingruppierung, Umorganisation.',
    tags: ['Versetzung', 'Einstellung', 'Eingruppierung', 'BR']
  },
  {
    id: 'advisor-betrvg-102',
    source: 'BetrVG',
    paragraph: '§ 102 BetrVG',
    title: 'Anhörung des Betriebsrats bei Kündigung',
    shortText: 'Der Betriebsrat ist vor jeder Kündigung anzuhören.',
    sbvMeaning: 'Bei schwerbehinderten Menschen zusätzlich SBV-Anhörung und Integrationsamtsverfahren prüfen.',
    practiceNote: 'SBV sollte Kündigungsgründe, BEM, Prävention, Alternativen und leidensgerechte Beschäftigung prüfen.',
    typicalCases: 'Kündigung, Änderungskündigung, Anhörung, Frist.',
    tags: ['Kündigung', 'BR-Anhörung', 'SBV-Anhörung', 'Frist']
  },
  {
    id: 'advisor-agg-7',
    source: 'AGG',
    paragraph: '§ 7 AGG',
    title: 'Benachteiligungsverbot',
    shortText: 'Beschäftigte dürfen wegen geschützter Merkmale, u. a. Behinderung, nicht benachteiligt werden.',
    sbvMeaning: 'Wichtig bei Auswahlentscheidungen, Umgang mit Einschränkungen und fehlenden angemessenen Vorkehrungen.',
    practiceNote: 'Indizien zeitnah dokumentieren: Vergleichsfälle, Aussagen, Abläufe, fehlende Prüfung von Alternativen.',
    typicalCases: 'Bewerbung, Mobbing, Beförderung, Arbeitsplatzanpassung, Ausschluss von Leistungen.',
    tags: ['Diskriminierung', 'Behinderung', 'Benachteiligung', 'AGG']
  },
  {
    id: 'advisor-agg-15',
    source: 'AGG',
    paragraph: '§ 15 AGG',
    title: 'Entschädigung und Schadensersatz',
    shortText: 'Bei Benachteiligung können Entschädigungs- und Schadensersatzansprüche entstehen.',
    sbvMeaning: 'Relevanz für taktische Einschätzung und Hinweis auf anwaltliche Beratung.',
    practiceNote: 'Fristen sind kritisch. SBV sollte nicht selbst Rechtsvertretung übernehmen, sondern sauber dokumentieren.',
    typicalCases: 'Diskriminierung, Bewerbungsverfahren, Entschädigungsfrist, Vergleich.',
    tags: ['Entschädigung', 'Schadensersatz', 'Frist', 'AGG']
  },
  {
    id: 'advisor-agg-22',
    source: 'AGG',
    paragraph: '§ 22 AGG',
    title: 'Beweislast',
    shortText: 'Indizien für Benachteiligung können die Beweislast zulasten des Arbeitgebers verschieben.',
    sbvMeaning: 'Dokumentation ist entscheidend. Einzelne Aussagen oder Verfahrensfehler können wichtig werden.',
    practiceNote: 'Sachverhalt chronologisch sichern und Vermutungsindizien getrennt von Bewertungen erfassen.',
    typicalCases: 'Bewerbung, Benachteiligung wegen Behinderung, fehlende Beteiligung, ungünstige Behandlung.',
    tags: ['Beweislast', 'Indizien', 'Dokumentation', 'AGG']
  },
  {
    id: 'advisor-kschg-1',
    source: 'KSchG',
    paragraph: '§ 1 KSchG',
    title: 'Soziale Rechtfertigung der Kündigung',
    shortText: 'Kündigungen müssen sozial gerechtfertigt sein, wenn Kündigungsschutz greift.',
    sbvMeaning: 'Bei schwerbehinderten Menschen immer Alternativen, Anpassungen, BEM und Prävention prüfen.',
    practiceNote: 'SBV sollte auf mildere Mittel, leidensgerechte Beschäftigung und fehlende Prävention hinweisen.',
    typicalCases: 'Krankheitsbedingte Kündigung, personenbedingte Kündigung, Änderungskündigung.',
    tags: ['Kündigung', 'KSchG', 'mildere Mittel', 'BEM']
  },
  {
    id: 'advisor-arbschg-3',
    source: 'ArbSchG',
    paragraph: '§ 3 ArbSchG',
    title: 'Grundpflichten des Arbeitgebers',
    shortText: 'Arbeitgeber müssen erforderliche Arbeitsschutzmaßnahmen treffen und auf Wirksamkeit prüfen.',
    sbvMeaning: 'Nützlich bei Überlastung, psychischer Gefährdung und fehlender Anpassung der Arbeitsbedingungen.',
    practiceNote: 'Nicht nur Einzelfall beschreiben, sondern konkrete Maßnahme und Wirksamkeitsprüfung verlangen.',
    typicalCases: 'Überlastung, psychische Belastung, Organisation, Arbeitsmittel, Gesundheitsschutz.',
    tags: ['Arbeitsschutz', 'Überlastung', 'Wirksamkeitsprüfung', 'Gesundheit']
  },
  {
    id: 'advisor-arbschg-5',
    source: 'ArbSchG',
    paragraph: '§ 5 ArbSchG',
    title: 'Gefährdungsbeurteilung',
    shortText: 'Arbeitgeber müssen Gefährdungen beurteilen, einschließlich psychischer Belastungen.',
    sbvMeaning: 'Starker Bezug zu Prävention, Arbeitsplatzgestaltung und Belastungsfällen.',
    practiceNote: 'Bei Einzelfällen prüfen, ob die Gefährdungsbeurteilung aktuell, konkret und wirksam ist.',
    typicalCases: 'Psychische Belastung, Arbeitsverdichtung, Arbeitsplatzgestaltung, Homeoffice, Teamkonflikt.',
    tags: ['Gefährdungsbeurteilung', 'psychische Belastung', 'Arbeitsplatz', 'Prävention']
  },
  {
    id: 'advisor-arbschg-6',
    source: 'ArbSchG',
    paragraph: '§ 6 ArbSchG',
    title: 'Dokumentation des Arbeitsschutzes',
    shortText: 'Arbeitgeber müssen Gefährdungsbeurteilung, Maßnahmen und Überprüfung dokumentieren.',
    sbvMeaning: 'Hilft, wenn Arbeitgeber nur mündlich behauptet, alles sei geprüft.',
    practiceNote: 'Dokumente anfordern: Ergebnis, Maßnahme, Verantwortliche, Frist, Wirksamkeitskontrolle.',
    typicalCases: 'Gefährdungsbeurteilung, Prävention, Überlastung, Arbeitsplatzanpassung.',
    tags: ['Dokumentation', 'Arbeitsschutz', 'Nachweis', 'Gefährdung']
  }
] as LegalNormRecord[];

function normalizeKnowledgeText(value: string): string {
  return value.toLocaleLowerCase('de-DE');
}

function knowledgeSearchText(norm: LegalNormRecord): string {
  return normalizeKnowledgeText([
    norm.source,
    norm.paragraph,
    norm.title,
    norm.shortText,
    norm.sbvMeaning,
    norm.practiceNote,
    norm.typicalCases,
    ...(norm.tags ?? [])
  ].filter(Boolean).join(' '));
}

function mergeKnowledgeNorms(remoteRows: LegalNormRecord[]): LegalNormRecord[] {
  const byKey = new Map<string, LegalNormRecord>();
  for (const norm of [...SBV_ADVISOR_KNOWLEDGE_ENTRIES, ...remoteRows]) {
    const key = `${norm.source}::${norm.paragraph}`.toLocaleLowerCase('de-DE');
    byKey.set(key, { ...byKey.get(key), ...norm });
  }
  return [...byKey.values()].sort((a, b) => `${a.source} ${a.paragraph}`.localeCompare(`${b.source} ${b.paragraph}`, 'de-DE', { numeric: true }));
}

function filterKnowledgeNorms(rows: LegalNormRecord[], query: string, source: string): LegalNormRecord[] {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalizeKnowledgeText);
  return rows.filter((norm) => {
    if (source && norm.source !== source) return false;
    const haystack = knowledgeSearchText(norm);
    return terms.every((term) => haystack.includes(term));
  });
}

export function KnowledgeView({ cases }: { cases: CaseRecord[] }) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [norms, setNorms] = useState<LegalNormRecord[]>([]);
  const [allKnowledgeNorms, setAllKnowledgeNorms] = useState<LegalNormRecord[]>([]);
  const [selectedNormId, setSelectedNormId] = useState('');
  const [caseReferences, setCaseReferences] = useState<CaseLegalReferenceRecord[]>([]);
  const [comments, setComments] = useState<NormCommentRecord[]>([]);
  const [caseLaw, setCaseLaw] = useState<CaseLawRecord[]>([]);
  const [checklist, setChecklist] = useState<NormChecklistItemRecord[]>([]);
  const [linkCaseId, setLinkCaseId] = useState('');
  const [commentTitle, setCommentTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [caseLawCourt, setCaseLawCourt] = useState('');
  const [caseLawFileNumber, setCaseLawFileNumber] = useState('');
  const [caseLawHolding, setCaseLawHolding] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const announce = useAnnouncer();

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useEffect(() => {
    if (message) announce(message, 'polite');
  }, [message, announce]);

  const selectedNorm = useMemo(() => norms.find((norm) => norm.id === selectedNormId), [norms, selectedNormId]);
  const sources = useMemo(() => [...new Set(allKnowledgeNorms.map((norm) => norm.source))].sort((a, b) => a.localeCompare(b)), [allKnowledgeNorms]);

  async function loadNorms(nextQuery = query, nextSource = source) {
    setError('');
    try {
      const bridge = await waitForBridge();
      let remoteRows: LegalNormRecord[] = [];
      if (bridge?.knowledge) {
        remoteRows = await bridge.knowledge.listNorms({ limit: 800 });
      }
      const mergedRows = mergeKnowledgeNorms(remoteRows);
      const filteredRows = filterKnowledgeNorms(mergedRows, nextQuery, nextSource);
      setAllKnowledgeNorms(mergedRows);
      setNorms(filteredRows);
      if (!selectedNormId && filteredRows.length) setSelectedNormId(filteredRows[0].id);
      if (selectedNormId && !filteredRows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(filteredRows[0]?.id ?? '');
    } catch (error) {
      const fallbackRows = filterKnowledgeNorms(SBV_ADVISOR_KNOWLEDGE_ENTRIES, nextQuery, nextSource);
      setAllKnowledgeNorms(SBV_ADVISOR_KNOWLEDGE_ENTRIES);
      setNorms(fallbackRows);
      if (!selectedNormId && fallbackRows.length) setSelectedNormId(fallbackRows[0].id);
      if (selectedNormId && !fallbackRows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(fallbackRows[0]?.id ?? '');
      setError(error instanceof Error ? `${error.message} Lokaler SBV-Ratgeber wurde geladen.` : 'Wissensdienst nicht erreichbar. Lokaler SBV-Ratgeber wurde geladen.');
    }
  }

  async function loadDetails(normId: string) {
    if (!normId) {
      setCaseReferences([]);
      setComments([]);
      setCaseLaw([]);
      setChecklist([]);
      return;
    }
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      const allCaseReferences = await Promise.all(cases.map((record) => bridge.knowledge.listCaseReferences(record.id)));
      const [commentRows, caseLawRows, checklistRows] = await Promise.all([
        bridge.knowledge.listComments(normId),
        bridge.knowledge.listCaseLaw(normId),
        bridge.knowledge.listChecklist(normId)
      ]);
      setCaseReferences(allCaseReferences.flat().filter((reference) => reference.legalNormId === normId));
      setComments(commentRows);
      setCaseLaw(caseLawRows);
      setChecklist(checklistRows);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Details konnten nicht geladen werden.');
    }
  }

  useEffect(() => {
    void loadNorms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetails(selectedNormId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNormId, cases.length]);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadNorms(query, source);
  }

  async function linkSelectedNormToCase() {
    setMessage('');
    setError('');
    if (!selectedNorm || !linkCaseId) {
      setError('Bitte Norm und Fall auswählen.');
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.linkNormToCase({ caseId: linkCaseId, legalNormId: selectedNorm.id, note: 'Im Wissensmodul verknüpft.' });
      setMessage(`Rechtsbezug ${selectedNorm.paragraph} wurde mit der Fallakte verknüpft.`);
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rechtsbezug konnte nicht verknüpft werden.');
    }
  }

  async function createCommentForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createComment({ legalNormId: selectedNorm.id, title: commentTitle, content: commentText });
      setCommentTitle('');
      setCommentText('');
      setMessage('Kommentar gespeichert.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kommentar konnte nicht gespeichert werden.');
    }
  }

  async function createCaseLawForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createCaseLaw({ legalNormId: selectedNorm.id, court: caseLawCourt, fileNumber: caseLawFileNumber, shortHolding: caseLawHolding });
      setCaseLawCourt('');
      setCaseLawFileNumber('');
      setCaseLawHolding('');
      setMessage('Rechtsprechungsnotiz gespeichert.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rechtsprechungsnotiz konnte nicht gespeichert werden.');
    }
  }

  async function createChecklistItemForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createChecklistItem({ legalNormId: selectedNorm.id, text: checklistText, sortOrder: checklist.length + 1 });
      setChecklistText('');
      setMessage('Checklisteneintrag ergänzt.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Checklisteneintrag konnte nicht gespeichert werden.');
    }
  }

  return (
    <ModuleFrame title="Wissensdatenbank" kicker="SBV-Kompass" description="Kurze Ratgebertexte zu SBV-relevanten Normen, Pflichten und Handlungsoptionen. In Protokollen mit §§ einfügen.">
      <ModuleFeedback items={[message ? { id: 'knowledge-message', tone: 'success', message } : null, error ? { id: 'knowledge-error', tone: 'warning', message: error } : null]} />
      <section className="industrial-panel">
        <form onSubmit={runSearch} className="knowledge-search-bar">
          <Search className="h-4 w-4 text-yellow-300" />
          <input className="industrial-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Norm, Stichwort oder Praxisbegriff suchen …" />
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">alle Quellen</option>
            {sources.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="submit" className="industrial-button">Suchen</button>
        </form>
      </section>


      <section className="knowledge-layout">
        <aside className="industrial-panel">
          <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Normen</p><h2>Register</h2><p className="industrial-meta">{norms.length} Treffer</p></div></div>
          <div className="knowledge-register-list">
            {norms.map((norm) => (
              <button key={norm.id} type="button" className={`knowledge-register-row ${selectedNormId === norm.id ? 'active' : ''}`} onClick={() => setSelectedNormId(norm.id)}>
                <strong>{norm.paragraph}</strong>
                <span>{norm.title}</span>
                <small>{norm.source} · {norm.tags.slice(0, 3).join(', ')}</small>
              </button>
            ))}
            {!norms.length && <div className="industrial-empty compact">Keine Normen gefunden.</div>}
          </div>
        </aside>

        <section className="industrial-panel knowledge-detail-panel">
          {!selectedNorm && <div className="industrial-empty">Norm auswählen.</div>}
          {selectedNorm && (
            <>
              <div className="industrial-panel-header compact">
                <div>
                  <p className="industrial-kicker">{selectedNorm.source}</p>
                  <h2>{selectedNorm.paragraph} · {selectedNorm.title}</h2>
                  <p>{selectedNorm.shortText}</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="industrial-subpanel"><h4>SBV-Bedeutung</h4><p>{selectedNorm.sbvMeaning ?? 'Noch nicht ergänzt.'}</p></div>
                <div className="industrial-subpanel"><h4>Praxishinweis</h4><p>{selectedNorm.practiceNote ?? 'Noch nicht ergänzt.'}</p></div>
                <div className="industrial-subpanel"><h4>Typische Fälle</h4><p>{selectedNorm.typicalCases ?? 'Noch nicht ergänzt.'}</p></div>
                <div className="industrial-subpanel"><h4>Tags</h4><p>{selectedNorm.tags.join(', ') || '—'}</p></div>
              </div>

              <details className="industrial-subpanel mt-4 knowledge-case-link">
                <summary>Mit Fallakte verknüpfen</summary>
                <div className="industrial-form-grid compact">
                  <select value={linkCaseId} onChange={(event) => setLinkCaseId(event.target.value)}>
                    <option value="">Fall auswählen</option>
                    {cases.map((record) => <option key={record.id} value={record.id}>{record.caseNumber} · {record.displayName}</option>)}
                  </select>
                  <button type="button" className="industrial-button" onClick={() => void linkSelectedNormToCase()}>Rechtsbezug setzen</button>
                </div>
                <div className="mt-3">
                  {caseReferences.map((reference) => <p key={reference.id} className="industrial-meta"><strong>{reference.caseNumber}</strong> · {reference.createdAt.slice(0, 10)}</p>)}
                  {!caseReferences.length && <p className="industrial-meta">Noch keine Fallverknüpfung.</p>}
                </div>
              </details>

              <div className="grid gap-4 xl:grid-cols-3 mt-4">
                <section className="industrial-subpanel">
                  <h4>Checkliste</h4>
                  {checklist.map((item) => <p key={item.id} className="industrial-meta">□ {item.text}</p>)}
                  <form onSubmit={createChecklistItemForNorm} className="industrial-settings-form compact"><input value={checklistText} onChange={(event) => setChecklistText(event.target.value)} placeholder="Checklisteneintrag" /><button className="industrial-secondary-button" type="submit">Ergänzen</button></form>
                </section>
                <section className="industrial-subpanel">
                  <h4>Eigene Kommentare</h4>
                  {comments.map((comment) => <p key={comment.id} className="industrial-meta"><strong>{comment.title}</strong><br />{comment.content}</p>)}
                  <form onSubmit={createCommentForNorm} className="industrial-settings-form compact"><input value={commentTitle} onChange={(event) => setCommentTitle(event.target.value)} placeholder="Titel" /><TextCommandTextarea fieldId="knowledge-comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Kommentar" /><button className="industrial-secondary-button" type="submit">Speichern</button></form>
                </section>
                <section className="industrial-subpanel">
                  <h4>Rechtsprechung</h4>
                  {caseLaw.map((item) => <p key={item.id} className="industrial-meta"><strong>{item.court}, {item.fileNumber}</strong><br />{item.shortHolding}</p>)}
                  <form onSubmit={createCaseLawForNorm} className="industrial-settings-form compact"><input value={caseLawCourt} onChange={(event) => setCaseLawCourt(event.target.value)} placeholder="Gericht" /><input value={caseLawFileNumber} onChange={(event) => setCaseLawFileNumber(event.target.value)} placeholder="Aktenzeichen" /><TextCommandTextarea fieldId="knowledge-case-law-holding" value={caseLawHolding} onChange={(event) => setCaseLawHolding(event.target.value)} placeholder="Kurzleitsatz / Relevanz" /><button className="industrial-secondary-button" type="submit">Speichern</button></form>
                </section>
              </div>
            </>
          )}
        </section>
      </section>
    </ModuleFrame>
  );
}


