import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseAdapter } from './databaseService.js';
import { SbvOfficeWorkflowDocumentAdapter, type SbvOfficeDocumentRecord } from './sbvOfficeWorkflowDocumentAdapter.js';

export type DocumentPreviewStatus = 'requested' | 'unavailable';

export interface SbvOfficeDocumentGenerationResult {
  document: SbvOfficeDocumentRecord;
  previewStatus: DocumentPreviewStatus;
  previewMessage?: string;
}
import type { RetentionOwnerRef } from '../src/domain/models/retention-owner.model.js';
import type { SbvAssemblyRecord } from '../src/domain/models/sbv-office-workflow.model.js';
import {
  externalLetterDocument,
  externalReportDocument,
  legalRecordDocument,
  paragraph,
  section,
  type PdfDocumentDefinition,
} from './documents/pdfDocumentDefinition.js';
import { PdfDocumentGenerationService } from './documents/pdfDocumentGenerationService.js';
import type { GenerateReportInput } from '../src/domain/models/report.model.js';
import type { ReportBuildResult } from './reports/reportSupport.js';
import { ApplicationError } from '../src/domain/models/application-error.model.js';

export type AssemblyDocumentKind = 'invitation' | 'agenda' | 'activity_report_draft' | 'result_minutes';

interface AssemblyRow {
  id: string;
  year: number;
  scheduled_at: string | null;
  location_or_mode: string | null;
  agenda: string | null;
  minutes: string | null;
}

type ActivityReportBuilder = { build(input: GenerateReportInput): ReportBuildResult };

const labels: Record<AssemblyDocumentKind, string> = {
  invitation: 'Einladung',
  agenda: 'Tagesordnung',
  activity_report_draft: 'Tätigkeitsbericht – Entwurf',
  result_minutes: 'Ergebnisprotokoll',
};

export class SbvOfficeDocumentService {
  constructor(
    private readonly database: DatabaseAdapter,
    private readonly adapter: SbvOfficeWorkflowDocumentAdapter,
    private readonly reports?: ActivityReportBuilder,
    private readonly pdfDocuments = new PdfDocumentGenerationService(),
  ) {}

  async generateAssemblyDocument(assemblyId: string, kind: AssemblyDocumentKind): Promise<SbvOfficeDocumentRecord> {
    const assembly = this.database.prepare<AssemblyRow>(
      'SELECT id, year, scheduled_at, location_or_mode, agenda, minutes FROM sbv_assemblies WHERE id = ?',
    ).get(assemblyId);
    if (!assembly) throw new Error('Schwerbehindertenversammlung nicht gefunden.');

    const definition = this.buildAssemblyDocument(assembly, kind);
    const body = await this.pdfDocuments.generate({
      source: kind === 'activity_report_draft' ? 'report' : 'assembly',
      definition,
      privacyProfile: kind === 'activity_report_draft' ? 'anonymized' : 'confidential',
    });
    const filename = `schwerbehindertenversammlung-${assembly.year}-${kind.replaceAll('_', '-')}.pdf`;
    return this.adapter.store({
      owner: { type: 'assembly', id: assembly.id },
      title: `${labels[kind]} · Schwerbehindertenversammlung ${assembly.year}`,
      filename,
      mimeType: 'application/pdf',
      purpose: `Schwerbehindertenversammlung: ${labels[kind]}`,
      documentClass: 'generated_document',
      templateVersion: 'sbv-assembly-0.9.7',
      plain: body,
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

  readDocument(documentId: string): Promise<Buffer> {
    return this.adapter.read(documentId);
  }

  private buildAssemblyDocument(assembly: AssemblyRow, kind: AssemblyDocumentKind): PdfDocumentDefinition {
    if (kind === 'activity_report_draft') {
      if (!this.reports) throw new ApplicationError('EXPORT_FAILED', 'Der zentrale Tätigkeitsbericht ist nicht verfügbar.');
      return this.reports.build({
        type: 'activity',
        periodStart: `${assembly.year}-01-01`,
        periodEnd: `${assembly.year}-12-31`,
      }).document;
    }
    const scheduledAt = assembly.scheduled_at?.trim();
    const location = assembly.location_or_mode?.trim();
    const agenda = assembly.agenda?.trim();
    if (kind === 'invitation') {
      if (!scheduledAt || !location) {
        throw new ApplicationError('VALIDATION_FAILED', 'Die Einladung benötigt einen Termin und einen Ort bzw. ein Format.');
      }
      const scheduleLabel = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeStyle: 'short' })
        .format(new Date(scheduledAt));
      return externalLetterDocument({
        title: `Einladung zur Schwerbehindertenversammlung ${assembly.year}`,
        sender: ['Schwerbehindertenvertretung'],
        recipient: ['An die schwerbehinderten und gleichgestellten Beschäftigten des Betriebs'],
        date: new Intl.DateTimeFormat('de-DE').format(new Date()),
        subject: `Einladung zur Schwerbehindertenversammlung ${assembly.year}`,
        blocks: [
          paragraph('Sehr geehrte Kolleginnen und Kollegen,'),
          paragraph(`hiermit lädt die Schwerbehindertenvertretung Sie zur Schwerbehindertenversammlung ${assembly.year} ein.`),
          section('Termin und Ort', [paragraph(scheduleLabel), paragraph(location)]),
          section('Tagesordnung', [paragraph(agenda || 'Die Tagesordnung wird rechtzeitig bekannt gegeben.')]),
          paragraph('Bitte teilen Sie der Schwerbehindertenvertretung frühzeitig mit, wenn Sie für Ihre Teilnahme Unterstützung oder eine barrierefreie Anpassung benötigen.'),
          paragraph('Mit freundlichen Grüßen\nIhre Schwerbehindertenvertretung'),
        ],
      });
    }
    if (kind === 'agenda') {
      if (!agenda) throw new ApplicationError('VALIDATION_FAILED', 'Die Tagesordnung enthält noch keine Tagesordnungspunkte.');
      return externalReportDocument(
        `Tagesordnung der Schwerbehindertenversammlung ${assembly.year}`,
        [scheduledAt, location].filter(Boolean).join(' · '),
        [section('Tagesordnung', [paragraph(agenda)])],
      );
    }
    const minutes = assembly.minutes?.trim();
    if (!minutes) throw new ApplicationError('VALIDATION_FAILED', 'Das Ergebnisprotokoll enthält noch keine Ergebnisse oder Maßnahmen.');
    return legalRecordDocument(
      `Ergebnisprotokoll der Schwerbehindertenversammlung ${assembly.year}`,
      [scheduledAt, location].filter(Boolean).join(' · '),
      'Intern vertraulich',
      [section('Ergebnisse und Maßnahmen', [paragraph(minutes)])],
    );
  }
}

function mimeTypeFor(filename: string): string { const ext = path.extname(filename).toLowerCase(); if (ext === '.pdf') return 'application/pdf'; if (ext === '.txt') return 'text/plain'; if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; return 'application/octet-stream'; }
