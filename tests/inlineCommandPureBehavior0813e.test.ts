import { describe, expect, it } from 'vitest';
import {
  findFirstTextCommand,
  getTextCommandArgument,
  getTextCommandKind,
  isTextCommandAt,
  replaceCommandMarker,
} from '../services/textCommandPolicy';
import {
  buildEqualizationPrefill,
  buildParticipationPrefill,
  buildPreventionPrefill,
  buildTerminationPrefill,
  buildWorkplaceAccommodationPrefill,
  extractInlineCommandArgument,
  getInlineCommandRangeLength,
} from '../src/app/features/cases/measures/measurePrefill';
import type { CaseRecord } from '../src/app/core/models/case.model';

const criticalCase: CaseRecord = {
  id: 'case-1',
  caseNumber: 'SBV-2026-001',
  displayName: 'Testfall',
  category: 'praevention',
  status: 'offen',
  priority: 'kritisch',
  openedAt: '2026-05-07T08:00:00.000Z',
  isPseudonymized: true,
  isLocked: false,
};

describe('inline command pure behavior', () => {
  it('detects supported command tokens only at valid command boundaries', () => {
    expect(getTextCommandKind('/praev')).toBe('prevention_measure');
    expect(getTextCommandKind('/kuend')).toBe('termination_measure');
    expect(getTextCommandKind('/gleich')).toBe('equalization_measure');
    expect(getTextCommandKind('/anp')).toBe('workplace_accommodation');

    expect(isTextCommandAt('Bitte /bem vorbereiten', 6, '/bem')).toBe(true);
    expect(isTextCommandAt('Bitte abc/bem vorbereiten', 9, '/bem')).toBe(false);
    expect(findFirstTextCommand('Text ohne Befehl')).toBeNull();
  });

  it('extracts, ranges and replaces command arguments without touching following lines', () => {
    const text = 'Start /praev Überlastung und Kündigungsgefahr\nNächster Absatz';
    const index = text.indexOf('/praev');

    expect(getTextCommandArgument(text, index, '/praev')).toBe('Überlastung und Kündigungsgefahr');
    expect(extractInlineCommandArgument(text, index, '/praev')).toBe('Überlastung und Kündigungsgefahr');
    expect(getInlineCommandRangeLength('/praev', 'Überlastung und Kündigungsgefahr')).toBe('/praev Überlastung und Kündigungsgefahr'.length);

    const replaced = replaceCommandMarker(
      text,
      index,
      '/praev',
      'Prävention: Überlastung und Kündigungsgefahr',
      '/praev Überlastung und Kündigungsgefahr'.length,
    );
    expect(replaced).toBe('Start Prävention: Überlastung und Kündigungsgefahr\nNächster Absatz');
  });

  it('prefills prevention positively from risk keywords and uses safe defaults without command text', () => {
    const positive = buildPreventionPrefill({
      selectedCase: criticalCase,
      commandText: 'Konflikt mit Führung und Kündigung droht',
      createdFrom: 'inline_command',
    });
    expect(positive.title.value).toBe('Konflikt mit Führung und Kündigung droht');
    expect(positive.difficultyType.value).toBe('konflikt_fuehrung');
    expect(positive.riskType.value).toBe('kuendigung');
    expect(positive.requiresFollowUp).toBe(true);

    const negative = buildPreventionPrefill({ createdFrom: 'manual' });
    expect(negative.title.value).toBe('Präventionsverfahren prüfen');
    expect(negative.hazardDescription.state).toBe('manual');
    expect(negative.difficultyType.value).toBe('sonstiges');
    expect(negative.requiresFollowUp).toBe(false);
  });

  it('prefills termination as critical and classifies common termination types', () => {
    const extraordinary = buildTerminationPrefill({
      commandText: 'fristlos wegen angeblichem Verhalten',
      createdFrom: 'inline_command',
      now: new Date('2026-05-07T10:30:00.000Z'),
    });
    expect(extraordinary.terminationType.value).toBe('ausserordentlich');
    expect(extraordinary.riskLevel.value).toBe('kritisch');
    expect(extraordinary.employerReason.value).toBe('fristlos wegen angeblichem Verhalten');

    const empty = buildTerminationPrefill({ createdFrom: 'manual', now: new Date('2026-05-07T10:30:00.000Z') });
    expect(empty.title.value).toBe('Kündigungsanhörung prüfen');
    expect(empty.employerReason.state).toBe('manual');
    expect(empty.protectionStatus.value).toBe('unklar');
  });

  it('prefills equalization and workplace accommodation from defined inputs', () => {
    const equalization = buildEqualizationPrefill({
      selectedCase: criticalCase,
      commandText: 'Widerspruch gegen Ablehnung vorbereiten',
      createdFrom: 'inline_command',
    });
    expect(equalization.status.value).toBe('widerspruch');
    expect(equalization.riskLevel.value).toBe('kritisch');
    expect(equalization.note.value).toBe('Widerspruch gegen Ablehnung vorbereiten');

    const accommodation = buildWorkplaceAccommodationPrefill({
      selectedCase: criticalCase,
      commandText: 'fester Arbeitsplatz statt Desksharing',
      createdFrom: 'inline_command',
    });
    expect(accommodation.category.value).toBe('arbeitsplatz');
    expect(accommodation.riskLevel.value).toBe('kritisch');
    expect(accommodation.legalBasis.value).toBe('§ 164 Abs. 4 SGB IX');
  });

  it('prefills participation measure type and risk level from employer-measure text', () => {
    const terminationParticipation = buildParticipationPrefill({
      commandText: 'Kündigung ohne vorherige SBV-Beteiligung',
      createdFrom: 'inline_command',
      now: new Date('2026-05-07T08:00:00.000Z'),
    });
    expect(terminationParticipation.measureType.value).toBe('kuendigung');
    expect(terminationParticipation.riskLevel.value).toBe('kritisch');

    const workplaceParticipation = buildParticipationPrefill({
      commandText: 'Umsetzung an anderen Arbeitsplatz',
      createdFrom: 'manual',
      now: new Date('2026-05-07T08:00:00.000Z'),
    });
    expect(workplaceParticipation.measureType.value).toBe('versetzung');
    expect(workplaceParticipation.requiresFollowUp).toBe(false);
  });
});
