import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const requiredTargets = [
  'bem',
  'prevention',
  'participation',
  'termination_hearing',
  'equalization',
  'workplace_accommodation',
  'deadline',
];

describe('RC complete living case note links', () => {
  it('models every RC-relevant inline command target type', () => {
    const model = readFileSync('src/app/core/models/case-note-link.model.ts', 'utf8');
    for (const target of requiredTargets) {
      expect(model).toContain(`'${target}'`);
    }
  });

  it('creates entity links for all RC-critical structured inline commands', () => {
    const source = readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8');
    for (const target of requiredTargets) {
      expect(source).toContain(`targetType: "${target}"`);
    }
    for (const label of [
      'formatPreventionMarkerText',
      'formatTerminationMarkerText',
      'formatEqualizationMarkerText',
      'formatWorkplaceAccommodationMarkerText',
    ]) {
      expect(source).toContain(label);
    }
  });

  it('navigates and labels every process link type without exposing UUIDs as labels', () => {
    const component = readFileSync('src/app/features/cases/CaseNoteEntityLinks.tsx', 'utf8');
    for (const processType of [
      'bem',
      'prevention',
      'participation',
      'termination_hearing',
      'equalization',
      'workplace_accommodation',
    ]) {
      expect(component).toContain(`processType: '${processType}'`);
    }
    expect(component).toContain('aria-label={link.accessibleLabel}');
    expect(component).toContain('<strong>{link.label}</strong>');
    expect(component).not.toContain('<strong>{link.targetId}</strong>');
  });

  it('marks missing targets for every persisted link type', () => {
    const service = readFileSync('services/caseService.ts', 'utf8');
    for (const target of requiredTargets) {
      expect(service).toContain(`l.target_type = '${target}'`);
    }
    expect(service).toContain('FROM prevention_processes');
    expect(service).toContain('FROM termination_hearings');
    expect(service).toContain('FROM equalization_processes');
    expect(service).toContain('FROM case_measures');
  });

  it('documents the full linked command set in help and roadmap', () => {
    const help = readFileSync('src/app/shared/textCommands/TextCommandHelpModal.tsx', 'utf8');
    const roadmap = readFileSync('docs/ROADMAP.md', 'utf8');
    for (const command of ['/bem', '/praev', '/bet', '/kuend', '/gleich', '/anp', '/fr']) {
      expect(help).toContain(command);
      expect(roadmap).toContain(command);
    }
    expect(help).not.toContain('Post-RC');
    expect(roadmap).not.toContain('Post-RC-Ausbau');
  });
});
