import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const prefill = readFileSync('src/app/features/cases/measures/measurePrefill.ts', 'utf8');
const overlays = readFileSync('src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx', 'utf8');
const hook = readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8');
const participation = readFileSync('src/app/features/participation/ParticipationProcessDetail.tsx', 'utf8');
const workplace = readFileSync('src/app/features/workplace-accommodation/WorkplaceAccommodationProcessDetail.tsx', 'utf8');

describe('0.8.6-b measure architecture and prefill alignment', () => {
  it('provides central prefill builders for all core measure commands', () => {
    expect(prefill).toContain('buildBemPrefill');
    expect(prefill).toContain('buildPreventionPrefill');
    expect(prefill).toContain('buildParticipationPrefill');
    expect(prefill).toContain('buildTerminationPrefill');
    expect(prefill).toContain('buildEqualizationPrefill');
    expect(prefill).toContain('buildWorkplaceAccommodationPrefill');
  });

  it('removes inline command arguments when replacing measure commands', () => {
    expect(prefill).toContain('extractInlineCommandArgument');
    expect(prefill).toContain('getInlineCommandRangeLength');
    expect(hook).toContain('replaceInlineMeasureCommandWithToken');
  });

  it('marks prefilled fields without requiring a confirmation action', () => {
    expect(overlays).toContain('prefill-marker');
    expect(overlays).toContain('automatisch vorbelegt');
    expect(overlays).not.toContain('Vorschlag übernehmen');
  });

  it('uses the shared measure detail frame for new measure details', () => {
    expect(participation).toContain('MeasureDetailFrame');
    expect(workplace).toContain('MeasureDetailFrame');
  });
});
