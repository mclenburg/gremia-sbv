import type { LegalNormRecord } from '../../core/models/knowledge.model';

export const SBV_ADVISOR_KNOWLEDGE_ENTRIES = [
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
] as LegalNormRecord[];;
