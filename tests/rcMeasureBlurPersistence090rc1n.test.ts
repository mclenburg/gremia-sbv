import { describe, expect, it } from 'vitest';
import { indexOfPattern, readNormalizedSourceText } from './helpers/sourceText';

const bem = readNormalizedSourceText('src/app/features/bem/BemProcessDetail.tsx');
const prevention = readNormalizedSourceText('src/app/features/prevention/PreventionProcessDetail.tsx');
const termination = readNormalizedSourceText('src/app/features/termination/TerminationProcessDetail.tsx');
const participation = readNormalizedSourceText('src/app/features/participation/ParticipationProcessDetail.tsx');
const workplace = readNormalizedSourceText('src/app/features/workplace-accommodation/WorkplaceAccommodationProcessDetail.tsx');
const pkg = JSON.parse(readNormalizedSourceText('package.json')) as { scripts: Record<string, string> };

function openingTags(source: string, tagName: 'textarea' | 'TextCommandTextarea'): string[] {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'g');
  return source.match(pattern) ?? [];
}

function expectNoPerKeystrokePersistenceInTextInputs(source: string): void {
  const textInputTags = [...openingTags(source, 'textarea'), ...openingTags(source, 'TextCommandTextarea')];

  for (const tag of textInputTags) {
    expect(tag).not.toMatch(/onChange=\{\(event\) =>\s*(?:void )?onUpdate\(/);
    expect(tag).not.toMatch(/onChange=\{\(event\) =>\s*update\(/);
  }
}

describe('0.9.0-rc.1-n measure detail text persistence', () => {
  it('persists textual participation measure fields only on blur and keeps inline commands available', () => {
    expect(participation).toContain('TextCommandTextarea');

    for (const fieldId of [
      'participation-violation-summary',
      'participation-sbv-position',
      'participation-next-step',
    ]) {
      expect(participation).toContain(`fieldId="${fieldId}"`);
    }

    expect(participation).toContain('defaultValue={process.violationSummary ?? ""}');
    expect(indexOfPattern(participation, /onBlur=\{\(event\) =>\s+update\(\{ violationSummary: event\.currentTarget\.value \}\)/)).toBeGreaterThanOrEqual(0);
    expect(participation).toContain('defaultValue={process.sbvPosition ?? ""}');
    expect(participation).toContain('onBlur={(event) => update({ sbvPosition: event.currentTarget.value })}');
    expect(participation).toContain('defaultValue={process.nextStep ?? ""}');
    expect(participation).toContain('onBlur={(event) => update({ nextStep: event.currentTarget.value })}');

    expect(participation).not.toContain('value={process.violationSummary ?? ""}');
    expect(participation).not.toContain('update({ violationSummary: event.target.value })');
    expect(participation).not.toContain('update({ sbvPosition: event.target.value })');
    expect(participation).not.toContain('update({ nextStep: event.target.value })');
  });

  it('persists textual workplace accommodation fields only on blur and keeps inline commands available', () => {
    expect(workplace).toContain('TextCommandTextarea');

    for (const fieldId of [
      'workplace-requested-adjustment',
      'workplace-barrier-or-limitation',
      'workplace-context',
      'workplace-proposed-solution',
      'workplace-next-step',
      'workplace-outcome',
    ]) {
      expect(workplace).toContain(`fieldId="${fieldId}"`);
    }

    for (const forbidden of [
      'value={process.requestedAdjustment}',
      'value={process.barrierOrLimitation ?? ""}',
      'value={process.workplaceContext ?? ""}',
      'value={process.proposedSolution ?? ""}',
      'value={process.nextStep ?? ""}',
      'value={process.outcome ?? ""}',
      'update({ requestedAdjustment: event.target.value })',
      'update({ barrierOrLimitation: event.target.value })',
      'update({ workplaceContext: event.target.value })',
      'update({ proposedSolution: event.target.value })',
      'update({ nextStep: event.target.value })',
      'update({ outcome: event.target.value })',
    ]) {
      expect(workplace).not.toContain(forbidden);
    }

    expect(workplace).toContain('defaultValue={process.requestedAdjustment}');
    expect(indexOfPattern(workplace, /onBlur=\{\(event\) =>\s+update\(\{ requestedAdjustment: event\.currentTarget\.value \}\)/)).toBeGreaterThanOrEqual(0);
    expect(workplace).toContain('defaultValue={process.outcome ?? ""}');
    expect(workplace).toContain('onBlur={(event) => update({ outcome: event.currentTarget.value })}');
  });

  it('keeps all measure detail text areas off per-keystroke database updates', () => {
    const sources = [bem, prevention, termination, participation, workplace];
    for (const source of sources) {
      expectNoPerKeystrokePersistenceInTextInputs(source);
    }
  });

  it('keeps text-command scan policy untouched and exposes the regression test as an npm script', () => {
    const textCommandTextarea = readNormalizedSourceText('src/app/shared/textCommands/TextCommandTextarea.tsx');
    expect(textCommandTextarea).toContain('findFirstTextCommand(event.target.value)');
    expect(textCommandTextarea).not.toContain('findTextCommandNearCursor');
    expect(textCommandTextarea).not.toContain('wasCommandTokenJustEdited');
    expect(pkg.scripts['test:rc-measure-blur-persistence-090rc1n']).toBe('vitest run tests/rcMeasureBlurPersistence090rc1n.test.ts');
  });
});
