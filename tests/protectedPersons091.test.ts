import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

describe('0.9.1 Personenverzeichnis Architektur', () => {
  it('enthält Beschäftigungsende und Schutzstatus-Lifecycle als eigene Konzepte', () => {
    const model = readNormalizedSourceText('src/app/core/models/protected-person.model.ts');
    const migration = readNormalizedSourceText('database/migrations/0025_protected_persons.sql');

    expect(model).toContain("export type EmploymentState = 'active_employee' | 'left_company' | 'unknown'");
    expect(model).toContain('leftCompanyAt?: string');
    expect(migration).toContain('employment_state TEXT NOT NULL DEFAULT');
    expect(migration).toContain('left_company_at TEXT');
    expect(migration).toContain('lifecycle_state TEXT NOT NULL DEFAULT');
  });

  it('integriert das Modul in Navigation, Bridge und IPC statt daneben zu stehen', () => {
    const modules = readNormalizedSourceText('src/app/core/navigation/modules.ts');
    const app = readNormalizedSourceText('src/app/App.tsx');
    const preload = readNormalizedSourceText('electron/preload.ts');
    const main = readNormalizedSourceText('electron/main.ts');

    expect(modules).toContain("id: 'persons'");
    expect(app).toContain('<PersonsView');
    expect(preload).toContain('persons: {');
    expect(main).toContain('registerProtectedPersonIpc');
  });
});
