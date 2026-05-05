import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(file: string) {
  return readFileSync(path.join(root, file), 'utf8');
}

describe('0.8.5-d fallaktenzentrierte Maßnahmenarchitektur', () => {
  it('führt zentrale Tabellen für Fallmaßnahmen und Beteiligungsdetails ein', () => {
    const migration = read('database/migrations/0020_case_measures.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS case_measures');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS case_measure_participation');
    expect(read('database/schema.sql')).toContain('CREATE TABLE IF NOT EXISTS case_measures');
  });

  it('bindet Beteiligung als Maßnahme in die Fallakte statt als isolierte Anlage ein', () => {
    expect(read('src/app/features/cases/CaseWorkbenchFooter.tsx')).toContain("onProcess('participation')");
    expect(read('src/app/features/cases/CaseTreePanel.tsx')).toContain('participationProcesses.map');
    expect(read('src/app/features/participation/ParticipationView.tsx')).toContain('Anlage und Bearbeitung erfolgen in der jeweiligen Fallakte');
  });

  it('stellt einen fallaktenbezogenen Detail-Editor für Beteiligungen bereit', () => {
    const detail = read('src/app/features/participation/ParticipationProcessDetail.tsx');
    expect(detail).toContain('Fallaktenmaßnahme nach § 178 Abs. 2 SGB IX');
    expect(detail).toContain('Aussetzung nach § 178 Abs. 2 Satz 2 SGB IX');
  });
});
