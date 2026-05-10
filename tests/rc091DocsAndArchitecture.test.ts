import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { readNormalizedSourceText } from './helpers/sourceText';

const forbiddenTmpLiteral = '/t' + 'mp/';
const forbiddenWindowsRoot = 'C:' + '\\\\';

function lineCount(path: string): number {
  return readNormalizedSourceText(path).split('\n').length;
}

describe('0.9.1 Dokumentation und Architektur-Synchronität', () => {
  it('synchronisiert Version und Release Notes dynamisch', () => {
    const appVersion = readNormalizedSourceText('src/app/generated/appVersion.ts');
    const metadata = readNormalizedSourceText('services/generated/appMetadata.ts');
    const releaseNotes = readNormalizedSourceText(`docs/RELEASE_NOTES_${packageJson.version}.md`);

    expect(appVersion).toContain(packageJson.version);
    expect(metadata).toContain(packageJson.version);
    expect(releaseNotes).toContain('Personenverzeichnis');
  });

  it('hält das Personenmodul modular und screenreaderfähig', () => {
    const expectedFiles = [
      'src/app/features/persons/PersonsView.tsx',
      'src/app/features/persons/PersonList.tsx',
      'src/app/features/persons/PersonDetail.tsx',
      'src/app/features/persons/PersonForm.tsx',
      'src/app/features/persons/PersonImportWizard.tsx',
      'src/app/features/persons/PersonExpiryDashboardCard.tsx',
      'src/app/features/persons/PersonLifecycleReviewDialog.tsx',
      'src/app/features/persons/usePersonsHandlers.ts'
    ];
    expectedFiles.forEach((file) => expect(existsSync(file), file).toBe(true));
    expect(lineCount('src/app/features/persons/PersonsView.tsx')).toBeLessThan(180);
    expect(lineCount('src/app/App.tsx')).toBeLessThan(560);
    const personsView = readNormalizedSourceText('src/app/features/persons/PersonsView.tsx');
    expect(personsView).toContain('useAnnouncer');
    expect(personsView.match(/announce\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('trennt Personenlogik in Services und Policies statt Import-/Lifecycle-Monolithen', () => {
    for (const file of [
      'services/personImportService.ts',
      'services/personMatchingService.ts',
      'services/personLifecyclePolicy.ts',
      'services/personCaseLinkService.ts',
      'services/personStatusExpiryService.ts',
      'services/personAnonymizationService.ts'
    ]) {
      expect(existsSync(file), file).toBe(true);
    }
    expect(readNormalizedSourceText('services/personImportService.ts')).toContain('resolvePersonImportMatch');
    expect(readNormalizedSourceText('services/personStatusExpiryService.ts')).toContain('decidePersonLifecycleTransition');
    expect(readNormalizedSourceText('services/protectedPersonService.ts')).toContain('PersonCaseLinkService');
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


  it('hält die neuen Testquellen plattformunabhängig', () => {
    const tests = [
      'tests/personImport091.test.ts',
      'tests/personImportWizard091.test.ts',
      'tests/protectedPersons091.test.ts',
      'tests/personExpiryIcal091.test.ts',
      'tests/rc091DocsAndArchitecture.test.ts'
    ].map(readNormalizedSourceText).join('\n');

    expect(tests).not.toContain(forbiddenTmpLiteral);
    expect(tests).not.toContain(forbiddenWindowsRoot);
  });
});
