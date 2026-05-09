import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { readNormalizedSourceText } from './helpers/sourceText';

const forbiddenTmpLiteral = '/t' + 'mp/';
const forbiddenWindowsRoot = 'C:' + '\\\\';

describe('0.9.1 Dokumentation und Test-Synchronität', () => {
  it('synchronisiert Version und Release Notes dynamisch', () => {
    const appVersion = readNormalizedSourceText('src/app/generated/appVersion.ts');
    const metadata = readNormalizedSourceText('services/generated/appMetadata.ts');
    const releaseNotes = readNormalizedSourceText(`docs/RELEASE_NOTES_${packageJson.version}.md`);

    expect(appVersion).toContain(packageJson.version);
    expect(metadata).toContain(packageJson.version);
    expect(releaseNotes).toContain('Personenverzeichnis');
  });

  it('dokumentiert DSFA/TOM/VVT-relevante Entscheidungen', () => {
    const compliance = readNormalizedSourceText('services/complianceCenterService.ts');
    const readme = readNormalizedSourceText('README.md');

    for (const token of ['Art. 9 Abs. 2 lit. b DSGVO', '§ 26 Abs. 3 BDSG', '§ 163 SGB IX', '§ 178 Abs. 1', 'Art. 13/14']) {
      expect(compliance).toContain(token);
    }
    expect(compliance).toContain('SQLCipher');
    expect(compliance).toContain('keine zusätzliche Feldverschlüsselung');
    expect(readme).toContain('Personalnummer ist optional');
    expect(readme).toContain('Nachname, Vorname');
  });

  it('hält die Testquellen plattformunabhängig', () => {
    const tests = [
      'tests/personImport091.test.ts',
      'tests/personImportWizard091.test.ts',
      'tests/protectedPersons091.test.ts',
      'tests/personExpiryIcal091.test.ts',
      'tests/rc091DocsAndArchitecture.test.ts'
    ].map(readNormalizedSourceText).join('\n');

    expect(tests).toContain('readNormalizedSourceText');
    expect(tests).not.toContain(forbiddenTmpLiteral);
    expect(tests).not.toContain(forbiddenWindowsRoot);
  });
});
