import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { SbvOfficeWorkflowDocumentAdapter, type SbvOfficeDocumentRecord } from './sbvOfficeWorkflowDocumentAdapter.js';
import type { RetentionOwnerRef } from '../src/app/core/models/retention-owner.model.js';
import type { SbvAssemblyRecord } from '../src/app/core/models/sbv-office-workflow.model.js';

export type AssemblyDocumentKind = 'invitation' | 'agenda' | 'activity_report_draft' | 'result_minutes';

interface AssemblyRow {
  id: string;
  year: number;
  scheduled_at: string | null;
  location_or_mode: string | null;
  agenda: string | null;
  minutes: string | null;
}

const labels: Record<AssemblyDocumentKind, string> = {
  invitation: 'Einladung',
  agenda: 'Tagesordnung',
  activity_report_draft: 'Tätigkeitsbericht – Entwurf',
  result_minutes: 'Ergebnisprotokoll',
};

export class SbvOfficeDocumentService {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly adapter: SbvOfficeWorkflowDocumentAdapter,
  ) {}

  async generateAssemblyDocument(assemblyId: string, kind: AssemblyDocumentKind): Promise<SbvOfficeDocumentRecord> {
    const assembly = this.db.prepare<AssemblyRow>(
      'SELECT id, year, scheduled_at, location_or_mode, agenda, minutes FROM sbv_assemblies WHERE id = ?',
    ).get(assemblyId);
    if (!assembly) throw new Error('Schwerbehindertenversammlung nicht gefunden.');

    const body = this.renderAssemblyText(assembly, kind);
    const filename = `schwerbehindertenversammlung-${assembly.year}-${kind.replaceAll('_', '-')}.txt`;
    return this.adapter.store({
      owner: { type: 'assembly', id: assembly.id },
      title: `${labels[kind]} · Schwerbehindertenversammlung ${assembly.year}`,
      filename,
      mimeType: 'text/plain; charset=utf-8',
      purpose: `Schwerbehindertenversammlung: ${labels[kind]}`,
      documentClass: 'generated_document',
      templateVersion: 'sbv-assembly-0.9.7',
      plain: Buffer.from(body, 'utf8'),
    });
  }

  async attachExternalDocuments(owner: RetentionOwnerRef, filePaths: readonly string[], purpose: string): Promise<SbvOfficeDocumentRecord[]> {
    const result: SbvOfficeDocumentRecord[] = [];
    for (const filePath of filePaths) {
      const filename = path.basename(filePath);
      const plain = await fs.promises.readFile(filePath);
      result.push(await this.adapter.store({ owner, title: filename, filename, mimeType: mimeTypeFor(filename), purpose, documentClass: 'external_document', plain }));
    }
    return result;
  }

  private renderAssemblyText(assembly: AssemblyRow, kind: AssemblyDocumentKind): string {
    const heading = `${labels[kind]}\nSchwerbehindertenversammlung ${assembly.year}`;
    const schedule = assembly.scheduled_at ? `Termin: ${assembly.scheduled_at}` : 'Termin: noch offen';
    const location = assembly.location_or_mode ? `Ort / Format: ${assembly.location_or_mode}` : 'Ort / Format: noch offen';
    if (kind === 'agenda') return `${heading}\n\n${schedule}\n${location}\n\n${assembly.agenda?.trim() || 'Tagesordnung wird ergänzt.'}\n`;
    if (kind === 'result_minutes') return `${heading}\n\n${schedule}\n${location}\n\n${assembly.minutes?.trim() || 'Ergebnisprotokoll wird ergänzt.'}\n`;
    if (kind === 'activity_report_draft') return `${heading}\n\nBerichtsjahr: ${assembly.year}\n\nTätigkeiten und Schwerpunkte der Schwerbehindertenvertretung:\n\n`;
    return `${heading}\n\n${schedule}\n${location}\n\nTagesordnung:\n${assembly.agenda?.trim() || 'wird gesondert bekanntgegeben'}\n`;
  }
}

function mimeTypeFor(filename: string): string { const ext = path.extname(filename).toLowerCase(); if (ext === '.pdf') return 'application/pdf'; if (ext === '.txt') return 'text/plain'; if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; return 'application/octet-stream'; }
