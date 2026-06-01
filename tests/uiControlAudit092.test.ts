import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

describe('UI-Control-Audit 0.9.2', () => {
  it('zieht die sichtbaren Suchfelder in den zentralen Industrial-Formularvertrag', () => {
    const industrialForm = readNormalizedSourceText('src/app/shared/components/IndustrialForm.tsx');
    const personsToolbar = readNormalizedSourceText('src/app/features/persons/PersonToolbar.tsx');
    const caseRegister = readNormalizedSourceText('src/app/features/cases/CaseRegister.tsx');
    const formsCss = readNormalizedSourceText('src/app/ui/forms.css');

    expect(industrialForm).toContain('export function SearchInput');
    expect(industrialForm).toContain('type="search"');
    expect(industrialForm).toContain('industrial-search-input');
    expect(formsCss).toContain('.industrial-text-input');

    expect(personsToolbar).toContain('<SearchInput');
    expect(personsToolbar).toContain('label="Person suchen"');
    expect(personsToolbar).not.toContain('<label className="person-search"');
    expect(personsToolbar).not.toContain('<input value={query}');

    expect(caseRegister).toContain('<SearchInput');
    expect(caseRegister).toContain('label="Fallakte suchen"');
    expect(caseRegister).toContain('data-global-search-target="cases"');
  });

  it('macht Fallwechsel im Fallbaum sofort sichtbar und vermeidet alte Baumdaten waehrend des Reloads', () => {
    const dataHook = readNormalizedSourceText('src/app/features/cases/useCaseWorkbenchData.ts');
    const tree = readNormalizedSourceText('src/app/features/cases/CaseTreePanel.tsx');
    const render = readNormalizedSourceText('src/app/features/cases/CasesViewRender.tsx');

    expect(dataHook).toContain('isCaseChildrenLoading');
    expect(dataHook).toMatch(/clearChildren\(\);\s+setIsCaseChildrenLoading\(true\);/);
    expect(dataHook).toContain("setSelection({ type: 'overview' });");
    expect(dataHook).toMatch(/finally\s*{\s*if \(active\) setIsCaseChildrenLoading\(false\);\s*}/);

    expect(render).toContain('isLoading={isCaseChildrenLoading}');
    expect(tree).toContain('Fallstruktur wird geladen …');
    expect(tree).toContain('role="status"');
    expect(tree).toContain('aria-busy={isLoading ? "true" : undefined}');
  });
});
