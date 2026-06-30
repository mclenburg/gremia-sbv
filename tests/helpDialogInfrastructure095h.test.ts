import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  INSTRUCTIONAL_TEXT_TRIGGERS,
  VISIBLE_DESCRIPTION_MAX_CHARS,
  requiresHelpRegistryDecision,
  textPolicyDecision,
} from '../src/app/shared/help/helpTextPolicy';
import { HELP_REGISTRY } from '../src/app/shared/help/helpRegistry';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('0.9.5-h Help-Dialog-Infrastruktur', () => {
  it('nutzt eine zentrale helpRegistry und keine neue Popover- oder Floating-Dependency', () => {
    const help = source('src/app/shared/help/IndustrialHelp.tsx');
    const pkg = source('package.json');

    expect(Object.keys(HELP_REGISTRY)).toEqual(
      expect.arrayContaining([
        'activityJournal.textCommands',
        'recruiting.procedureData',
        'recruiting.interviewEvent',
        'participationViolations.sourceContext',
      ]),
    );

    expect(help).toContain('IndustrialModal');
    expect(help).toContain('aria-haspopup="dialog"');
    expect(help).toContain('dataE2e="industrial-help-dialog"');
    expect(help).not.toMatch(/Popover|floating-ui|useFloating|autoUpdate/);
    expect(pkg).not.toContain('@floating-ui/react');
  });

  it('macht Hilfe nur per explizitem helpId sichtbar und lässt description standardmäßig unverändert sichtbar', () => {
    const form = source('src/app/shared/components/IndustrialForm.tsx');
    const workbench = source('src/app/shared/components/WorkbenchLayout.tsx');

    expect(form).toContain('helpId?: HelpRegistryId');
    expect(form).toContain('industrial-field-label-row');
    expect(form).not.toContain('<label className="industrial-field-label" htmlFor={id}>\n        <span className="industrial-field-label-text">{label}</span>\n        {required ? (\n          <span className="industrial-field-required-marker" aria-hidden="true">\n            *\n          </span>\n        ) : null}\n        {helpRegistryId ? <IndustrialHelpButton');
    expect(form).toContain('{description ? <p>{description}</p> : null}');
    expect(form).not.toContain('showDescription = false');
    expect(workbench).toContain('helpId?: HelpRegistryId');
    expect(workbench).toContain('{description ? <p>{description}</p> : null}');
    expect(workbench).not.toContain('showDescription = false');
  });

  it('stellt Triggerwort- und Längenpolicy als testbare Konstante bereit', () => {
    expect(VISIBLE_DESCRIPTION_MAX_CHARS).toBe(120);
    expect(INSTRUCTIONAL_TEXT_TRIGGERS).toEqual(
      expect.arrayContaining([
        'bewusst',
        'nur',
        'keine',
        'bitte',
        'dokumentiere',
        'erfasse',
        'diagnosen',
        'automatisch',
      ]),
    );

    expect(requiresHelpRegistryDecision('Dokumentiere nur Verfahrensstände, keine Diagnosen.')).toBe(true);
    expect(textPolicyDecision('SBV-Beteiligung bei Stellenbesetzungen nachhalten.')).toEqual({
      shouldReview: false,
      reasons: [],
    });
    expect(textPolicyDecision('x'.repeat(121)).reasons).toContain('length');
  });

  it('liefert CSS für Hilfe-Button und Dialogkörper in Light und Dark Mode', () => {
    const css = source('src/app/ui/components.css');

    expect(css).toContain('.industrial-help-button');
    expect(css).toContain('.industrial-help-dialog-body');
    expect(css).toContain("html[data-theme='light'] .industrial-help-button");
  });
});
