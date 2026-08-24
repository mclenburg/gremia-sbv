import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import type { PdfBlock, PdfDocumentDefinition } from './pdfDocumentDefinition.js';
import { createPdfDocument } from './pdfDocumentRenderer.js';
import { scanReportTextForPrivacyRisks } from '../reportPrivacyPolicy.js';

export type PdfDocumentSource = 'report' | 'assembly' | 'election' | 'measure' | 'template' | 'compliance';

export interface GeneratePdfDocumentInput {
  source: PdfDocumentSource;
  definition: PdfDocumentDefinition;
  privacyProfile?: 'anonymized' | 'confidential' | 'lawful_personal_data';
}

const UNRESOLVED_PLACEHOLDER = /\{\{\s*[^{}]+\s*\}\}/u;

function blockTexts(block: PdfBlock): string[] {
  switch (block.type) {
    case 'paragraph': return [block.text];
    case 'list': return block.items;
    case 'table': return [...block.headers, ...block.rows.flat().map(String), block.empty];
    case 'metrics': return block.entries.flat().map(String);
    case 'section': return [block.title, ...block.blocks.flatMap(blockTexts)];
    case 'page_break': return [];
    case 'spacer': return [];
  }
}

function documentTexts(definition: PdfDocumentDefinition): string[] {
  return [
    definition.title,
    definition.subtitle ?? '',
    definition.classification ?? '',
    ...(definition.warnings ?? []),
    definition.footer ?? '',
    ...(definition.letterhead?.sender ?? []),
    ...(definition.letterhead?.recipient ?? []),
    definition.letterhead?.date ?? '',
    definition.letterhead?.subject ?? '',
    ...definition.blocks.flatMap(blockTexts),
  ];
}

export class PdfDocumentGenerationService {
  async generate(input: GeneratePdfDocumentInput): Promise<Buffer> {
    const texts = documentTexts(input.definition);
    if (texts.some((text) => UNRESOLVED_PLACEHOLDER.test(text))) {
      throw new ApplicationError(
        'VALIDATION_FAILED',
        'PDF-Dokument enthält nicht aufgelöste Pflichtplatzhalter und darf nicht exportiert werden.',
      );
    }
    if (input.privacyProfile === 'anonymized') {
      const criticalFindings = scanReportTextForPrivacyRisks(texts.join('\n'))
        .filter((finding) => finding.riskLevel === 'critical');
      if (criticalFindings.length) {
        throw new ApplicationError(
          'VALIDATION_FAILED',
          `Anonymisiertes PDF enthält mögliche direkte Identifikatoren: ${criticalFindings.map((finding) => finding.type).join(', ')}.`,
        );
      }
    }
    return createPdfDocument(input.definition);
  }
}
