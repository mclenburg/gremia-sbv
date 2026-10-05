import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { IndustrialHelpButton } from '../../../src/app/shared/help/IndustrialHelp';
import { FormSection } from '../../../src/app/shared/components/IndustrialForm';
import { IndustrialPanel } from '../../../src/app/shared/components/WorkbenchPanels';
import { VISIBLE_DESCRIPTION_MAX_CHARS, requiresHelpRegistryDecision, textPolicyDecision } from '../../../src/app/shared/help/helpTextPolicy';
import { descendants, renderComponent, renderElement, visibleText } from '../../helpers/renderedMarkup';

const helpIds = [
  'activityJournal.textCommands',
  'recruiting.procedureData',
  'recruiting.interviewEvent',
  'participationViolations.sourceContext',
] as const;

describe('Hilfe-Dialog-Infrastruktur', () => {
  it.each(helpIds)('bietet %s als benannte Dialogaktion ohne automatisch geöffneten Dialog an', (helpId) => {
    const { tree } = renderComponent(IndustrialHelpButton, { helpId });
    const nodes = descendants(tree);
    const button = nodes.find((node) => node.tag === 'button');
    expect(button?.attrs.type).toBe('button');
    expect(button?.attrs['aria-label']).toBe('Bereichshilfe öffnen');
    expect(button?.attrs['aria-haspopup']).toBe('dialog');
    expect(button?.attrs.title).toBeTruthy();
    expect(nodes.filter((node) => node.attrs.role === 'dialog')).toHaveLength(0);
  });

  it.each([
    { name: 'Formularabschnitt', component: FormSection },
    { name: 'Workbench-Panel', component: IndustrialPanel },
  ])('erhält Beschreibungen in $name und bietet Hilfe erst mit ausdrücklicher Kennung an', ({ component }) => {
    const props = { title: 'Synthetischer Abschnitt', description: 'Fachlicher Status', children: 'Vorgangsdaten' };
    const withoutHelp = renderElement(createElement(component, props));
    const withHelp = renderElement(createElement(component, { ...props, helpId: 'recruiting.procedureData' }));
    for (const result of [withoutHelp, withHelp]) {
      expect(visibleText(result.markup)).toContain('Fachlicher Status');
      expect(visibleText(result.markup)).toContain('Vorgangsdaten');
    }
    expect(descendants(withoutHelp.tree).filter((node) => node.attrs['aria-haspopup'] === 'dialog')).toHaveLength(0);
    const helpActions = descendants(withHelp.tree).filter((node) => node.attrs['aria-haspopup'] === 'dialog');
    expect(helpActions).toHaveLength(1);
    expect(helpActions[0].attrs['aria-label']).toBe('Abschnittshilfe öffnen');
  });

  it('fordert für Anweisungen eine Hilfeentscheidung, lässt kurze Statusbeschreibungen aber sichtbar', () => {
    expect(requiresHelpRegistryDecision('Dokumentiere nur Verfahrensstände, keine Diagnosen.')).toBe(true);
    expect(textPolicyDecision('SBV-Beteiligung bei Stellenbesetzungen nachhalten.')).toEqual({
      shouldReview: false,
      reasons: [],
    });
  });

  it('meldet eine Längenüberschreitung erst oberhalb der sichtbaren Beschreibungsgrenze', () => {
    expect(textPolicyDecision('x'.repeat(VISIBLE_DESCRIPTION_MAX_CHARS)).reasons).not.toContain('length');
    expect(textPolicyDecision('x'.repeat(VISIBLE_DESCRIPTION_MAX_CHARS + 1)).reasons).toContain('length');
  });
});
