import { describe, expect, it } from 'vitest';
import { PersonImportResultStep } from '../../src/app/features/persons/PersonImportResultStep';
import type { PersonImportExecuteResult, PersonImportRunItemRecord } from '../../src/domain/models/protected-person.model';
import { renderComponent, visibleText } from '../helpers/renderedMarkup';

function conflictItem(rowNumber: number): PersonImportRunItemRecord {
  return {
    id: `item-${rowNumber}`,
    runId: 'run-1',
    rowNumber,
    action: 'conflict',
    protectedPersonId: `person-${rowNumber}`,
    matchStrategy: 'name_only_conflict',
    conflictReason: `Namensabgleich für Zeile ${rowNumber} prüfen`,
    changedFields: [],
    createdAt: '2026-08-27T10:00:00.000Z',
  };
}

function importResult(items: PersonImportRunItemRecord[]): PersonImportExecuteResult {
  return {
    imported: [],
    run: {
      id: 'run-1',
      sourceFileName: 'arbeitgeberliste.xlsx',
      sourceFileHash: 'hash',
      importedAt: '2026-08-27T10:00:00.000Z',
      totalRows: items.length,
      createdCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      conflictCount: items.length,
      skippedCount: 0,
      missingCount: 0,
      items,
    },
  };
}

describe('Personenimport-Ergebnis', () => {
  it('zeigt große Prüflisten filterbar und ohne Abschneiden an', () => {
    const items = Array.from({ length: 21 }, (_, index) => conflictItem(index + 2));
    const { markup } = renderComponent(PersonImportResultStep, {
      result: importResult(items),
      onClose: () => undefined,
      onOpenPerson: () => undefined,
    });
    const text = visibleText(markup);

    expect(text).toContain('21 Prüfeinträge');
    expect(text).toContain('Prüfeinträge filtern');
    expect(text).toContain('Zeile 22');
    expect(text).toContain('Person öffnen');
    expect(text).not.toContain('ersten 20');
  });
});
