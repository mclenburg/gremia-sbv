import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

describe('0.9.1 Import-Assistent Personenverzeichnis', () => {
  it('ersetzt das große Importpanel durch einen kompakten Wizard', () => {
    const view = readNormalizedSourceText('src/app/features/persons/PersonsView.tsx');
    const css = readNormalizedSourceText('src/app/features/persons/personsWorkbench.css');

    expect(view).toContain('data-e2e="open-person-import-wizard"');
    expect(view).toContain('data-e2e="person-import-wizard"');
    expect(view).toContain('role="dialog"');
    expect(view).toContain('aria-modal="true"');
    expect(view).toContain('Wie funktioniert der Import?');
    expect(view).toContain('Weiter zum Spaltenmapping');
    expect(view).toContain('Mapping prüfen');
    expect(view).toContain('Import ausführen');
    expect(css).toContain('.person-import-dialog');
    expect(css).toContain('@media (max-width: 720px)');
  });

  it('ordnet echte Dateispalten erst im Mapping-Schritt zu', () => {
    const view = readNormalizedSourceText('src/app/features/persons/PersonsView.tsx');

    expect(view).toContain('buildDefaultMapping(nextPreview.columns)');
    expect(view).toContain("{ key: 'fullName', label: 'Vollname' }");
    expect(view).toContain("{ key: 'personnelNumber', label: 'Personalnummer' }");
    expect(view).toContain('Personalnummer ist optional');
    expect(view).toContain('Nicht importieren');
    expect(view).toContain('Nachname, Vorname');
    expect(view).not.toContain('<section className="industrial-panel" aria-labelledby="person-import-heading">');
  });
});
