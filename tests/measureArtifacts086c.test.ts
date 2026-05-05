import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

describe('0.8.6-c measure artifact alignment', () => {
  it('adds measure references for deadlines and case documents in migration and schema', () => {
    const migration = read('database/migrations/0023_measure_artifact_links.sql');
    const schema = read('database/schema.sql');

    expect(migration).toContain('ALTER TABLE deadlines ADD COLUMN measure_id');
    expect(migration).toContain('ALTER TABLE case_documents ADD COLUMN measure_id');
    expect(schema).toContain('measure_id TEXT REFERENCES case_measures(id) ON DELETE SET NULL');
    expect(schema).toContain('idx_deadlines_case_measure');
    expect(schema).toContain('idx_case_documents_case_measure');
  });

  it('exposes measureId on deadline and document models', () => {
    const deadlineModel = read('src/app/core/models/deadline.model.ts');
    const documentModel = read('src/app/core/models/case-document.model.ts');

    expect(deadlineModel).toContain('measureId?: string;');
    expect(documentModel).toContain('measureId?: string;');
    expect(documentModel).toContain('measureTitle?: string;');
  });

  it('keeps document imports fall-bound and optionally measure-bound', () => {
    const caseIpc = read('electron/ipc/caseIpc.ts');
    const caseService = read('services/caseService.ts');

    expect(caseIpc).toContain('validatedMeasureId');
    expect(caseService).toContain('measureId?: string');
    expect(caseService).toContain('LEFT JOIN case_measures m ON m.id = d.measure_id');
  });

  it('supports contextual template filtering by measure type', () => {
    const model = read('src/app/core/models/template.model.ts');
    const service = read('services/templateService.ts');

    expect(model).toContain('measureType?: CaseMeasureType');
    expect(service).toContain('categoryForMeasureType');
    expect(service).toContain('contextualTag');
  });
});
