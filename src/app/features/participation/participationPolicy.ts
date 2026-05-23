import type {
  ParticipationDecisionStage,
  ParticipationMeasureType,
  ParticipationRecord,
} from '../../core/models/participation.model';

export type ParticipationEscalationLevel = 'normal' | 'warning' | 'critical';

export type ParticipationEscalationAdvice = {
  level: ParticipationEscalationLevel;
  title: string;
  reason: string;
  nextStep: string;
  templateAction: string;
};

export type ParticipationDocumentRequirement = {
  id: string;
  label: string;
  reason: string;
};

const decisionAlreadyMade: ParticipationDecisionStage[] = ['entscheidung_getroffen', 'umgesetzt'];

export function getParticipationEscalationAdvice(record: ParticipationRecord, now = new Date()): ParticipationEscalationAdvice {
  if (decisionAlreadyMade.includes(record.decisionStage) && !record.hearingBeforeDecision) {
    return {
      level: 'critical',
      title: 'Beteiligung vor Entscheidung nicht gesichert',
      reason: 'Die Arbeitgeberentscheidung ist als getroffen oder umgesetzt dokumentiert, ohne dass die vorherige Anhörung der SBV bestätigt ist.',
      nextStep: 'Pflichtverstoß dokumentieren, Nachholung/Aussetzung verlangen und rechtliche Bewertung der Maßnahme sichern.',
      templateAction: 'Pflichtverstoß rügen / Nachholung fordern'
    };
  }

  if (!record.informationComplete) {
    return {
      level: 'warning',
      title: 'Unterrichtung nicht entscheidungsreif',
      reason: 'Die Unterrichtung ist noch nicht als vollständig markiert. Eine belastbare Stellungnahme der SBV ist damit fachlich nicht abgesichert.',
      nextStep: 'Fehlende Unterlagen mit freundlicher Fristsetzung anfordern und den nicht entscheidungsreifen Stand dokumentieren.',
      templateAction: 'Unterlagen nachfordern'
    };
  }

  if (record.statementDueAt && new Date(record.statementDueAt) < now && !['stellungnahme_abgegeben', 'abgeschlossen', 'pflichtverstoss_dokumentiert'].includes(record.status)) {
    return {
      level: 'critical',
      title: 'Stellungnahmefrist überfällig',
      reason: 'Die Stellungnahmefrist ist überschritten, ohne dass eine abgegebene Stellungnahme oder ein Abschluss dokumentiert ist.',
      nextStep: 'Friststand prüfen, Arbeitgeberentscheidung abfragen und Akte sofort nachziehen.',
      templateAction: 'Friststand klären'
    };
  }

  if (record.suspensionDueAt && new Date(record.suspensionDueAt) < now && record.status === 'aussetzung_verlangt') {
    return {
      level: 'critical',
      title: 'Aussetzungsfrist abgelaufen',
      reason: 'Für das Aussetzungsverlangen ist eine abgelaufene Wiedervorlage dokumentiert.',
      nextStep: 'Reaktion des Arbeitgebers dokumentieren, nächste Eskalation prüfen und ggf. Inklusionsamt oder Rechtsberatung einbinden.',
      templateAction: 'Aussetzung nachfassen'
    };
  }

  if (record.decisionStage === 'entscheidung_angekuendigt' && record.hearingBeforeDecision && record.informationComplete) {
    return {
      level: 'normal',
      title: 'Beteiligung läuft vor Entscheidung',
      reason: 'Unterrichtung und vorherige Anhörung sind als vorhanden dokumentiert.',
      nextStep: 'SBV-Position fristgerecht ausformulieren und Entscheidung des Arbeitgebers nachhalten.',
      templateAction: 'Stellungnahme erstellen'
    };
  }

  return {
    level: 'normal',
    title: 'Beteiligung weiterführen',
    reason: 'Es ist kein akuter Pflichtverstoß aus den Pflichtfeldern ableitbar.',
    nextStep: 'Nächsten Schritt, Fristen und fehlende Unterlagen aktuell halten.',
    templateAction: 'Sachstand dokumentieren'
  };
}

const baseRequirements: ParticipationDocumentRequirement[] = [
  { id: 'maßnahme', label: 'konkrete Arbeitgebermaßnahme', reason: 'Ohne konkrete Maßnahme ist nicht prüfbar, wozu die SBV Stellung nehmen soll.' },
  { id: 'zeitplan', label: 'geplanter Entscheidungs- und Umsetzungstermin', reason: '§ 178 Abs. 2 Satz 1 SGB IX verlangt Beteiligung vor der Entscheidung.' },
  { id: 'betroffenheit', label: 'Betroffenheit schwerbehinderter, gleichgestellter oder möglicherweise betroffener Menschen', reason: 'Die SBV muss ihre Zuständigkeit und den Schutzbezug prüfen können.' }
];

export function getParticipationDocumentRequirements(measureType: ParticipationMeasureType): ParticipationDocumentRequirement[] {
  const specific: Record<ParticipationMeasureType, ParticipationDocumentRequirement[]> = {
    einstellung: [
      { id: 'anforderungsprofil', label: 'Ausschreibung und Anforderungsprofil', reason: 'Erforderlich für die Prüfung der Auswahl- und Eignungskriterien.' },
      { id: 'bewerberfeld', label: 'Bewerberfeld und Auswahlvermerk', reason: 'Die SBV muss nachvollziehen können, ob schwerbehinderte Bewerbende berücksichtigt wurden.' },
      { id: 'einladung', label: 'Einladung / Nicht-Einladung schwerbehinderter Bewerbender', reason: 'Besonders relevant bei öffentlichem Arbeitgeber und Auswahlverfahren.' }
    ],
    versetzung: [
      { id: 'alt-neu', label: 'bisheriger und neuer Arbeitsplatz', reason: 'Nur so lassen sich Belastungsänderungen und Teilhaberisiken erkennen.' },
      { id: 'arbeitsorganisation', label: 'Änderungen von Team, Arbeitszeit, Wegen und Arbeitsorganisation', reason: 'Versetzungen können behinderungsbedingte Barrieren verschärfen.' },
      { id: 'arbeitsplatzpruefung', label: 'Prüfung behinderungsgerechter Arbeitsplatzgestaltung', reason: '§ 164 Abs. 4 Satz 1 SGB IX ist mitzudenken.' }
    ],
    arbeitszeit: [
      { id: 'arbeitszeitmodell', label: 'geplantes Arbeitszeitmodell', reason: 'Arbeitszeit kann Nachteilsausgleiche, Belastbarkeit und Teilhabe unmittelbar berühren.' },
      { id: 'abweichung', label: 'Auswirkung auf bestehende Nachteilsausgleiche', reason: 'Bestehende Schutz- oder Entlastungsregelungen dürfen nicht verdeckt entwertet werden.' }
    ],
    arbeitsplatzgestaltung: [
      { id: 'barrieren', label: 'beschriebene Barrieren und Arbeitsplatzanforderungen', reason: 'Der Bedarf muss arbeitsplatzbezogen, nicht diagnosebezogen geprüft werden.' },
      { id: 'hilfen', label: 'technische, organisatorische und personelle Hilfen', reason: 'Erforderlich zur Prüfung angemessener Gestaltung nach § 164 Abs. 4 Satz 1 SGB IX.' },
      { id: 'traeger', label: 'Einbindung Inklusionsamt/Rehabilitationsträger', reason: 'Externe Leistungen können Umsetzung und Finanzierung sichern.' }
    ],
    abmahnung: [
      { id: 'vorwurf', label: 'konkreter Vorwurf und zugrunde liegende Tatsachen', reason: 'Die SBV muss prüfen können, ob ein behinderungsbezogener Zusammenhang naheliegt.' },
      { id: 'milderemittel', label: 'mildere Mittel / Unterstützungsmöglichkeiten', reason: 'Prävention und behinderungsgerechte Unterstützung sind vor Eskalation zu prüfen.' }
    ],
    kuendigung: [
      { id: 'kuendigungsgrund', label: 'Kündigungsgrund und Interessenabwägung', reason: 'Kündigungen sind SBV-Hochrisikovorgänge.' },
      { id: 'bem', label: 'BEM-Stand und Präventionsversuch', reason: 'Unterlassenes oder schwaches BEM/Prävention erhöht das Risiko rechtswidriger Arbeitgeberentscheidung.' },
      { id: 'integrationsamt', label: 'Antrag/Stand Integrationsamt', reason: 'Bei schwerbehinderten Menschen ist die Zustimmung des Integrationsamtes zentral.' }
    ],
    bem_praevention: [
      { id: 'ausloeser', label: 'Auslöser und Ziel des BEM-/Präventionsvorgangs', reason: 'BEM und Prävention dürfen nicht als Alibi-Gespräch verkürzt werden.' },
      { id: 'maßnahmen', label: 'geprüfte und verworfene Maßnahmen', reason: 'Die SBV muss echte Lösungsprüfung nachvollziehen können.' },
      { id: 'externe', label: 'Einbindung Inklusionsamt/Reha-Träger/Betriebsarzt', reason: 'Externe Fachstellen können entscheidende Unterstützung liefern.' }
    ],
    regelung_praxis: [
      { id: 'regeltext', label: 'Regeltext oder geänderte Praxis', reason: 'Auch Praxisänderungen können schwerbehinderte Menschen besonders betreffen.' },
      { id: 'ausnahmen', label: 'Ausnahmen/Nachteilsausgleiche/Einzelfallspielräume', reason: 'SBV-Relevanz entsteht oft durch fehlende behinderungsgerechte Ausnahmen.' }
    ],
    sonstiges: [
      { id: 'sachverhalt', label: 'vollständiger Sachverhalt', reason: 'Für sonstige Maßnahmen muss der SBV-Bezug besonders klar dokumentiert werden.' }
    ]
  };

  return [...baseRequirements, ...specific[measureType]];
}

export function getParticipationActionLabels(record: ParticipationRecord): string[] {
  const advice = getParticipationEscalationAdvice(record);
  const actions = [advice.templateAction];
  if (!record.informationComplete) actions.push('fehlende Unterlagen mit Frist anfordern');
  if (decisionAlreadyMade.includes(record.decisionStage) && !record.hearingBeforeDecision) actions.push('Aussetzung/Nachholung prüfen');
  if (record.measureType === 'kuendigung') actions.push('Kündigungs- und Integrationsamtsfristen prüfen');
  return Array.from(new Set(actions));
}
