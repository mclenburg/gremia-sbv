import type { SecurityService } from '../../services/securityService.js';
import type { SbvOfficeDocumentGenerationResult } from '../../services/sbvOfficeDocumentService.js';
import type { SbvOfficeDocumentRecord } from '../../services/sbvOfficeWorkflowDocumentAdapter.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { requestExternalPreview, type ExternalPreviewOpener } from './externalPreviewRequest.js';

interface DocumentPreviewWorkflowInput {
  operation: string;
  generateFailureMessage: string;
  security: Pick<SecurityService, 'cleanupTemporaryFiles' | 'writeTemporaryFile'>;
  opener: ExternalPreviewOpener;
  generate: () => Promise<SbvOfficeDocumentRecord>;
  read: (documentId: string) => Promise<Buffer>;
}

interface DocumentPreviewRecordWorkflowInput<TRecord> {
  operation: string;
  generateFailureMessage: string;
  security: Pick<SecurityService, 'cleanupTemporaryFiles' | 'writeTemporaryFile'>;
  opener: ExternalPreviewOpener;
  generate: () => Promise<TRecord>;
  read: (documentId: string) => Promise<Buffer>;
  getDocumentId: (record: TRecord) => string;
  getFilename: (record: TRecord) => string;
}

export interface DocumentPreviewRecordWorkflowResult<TRecord> {
  record: TRecord;
  previewStatus: 'requested' | 'unavailable';
  previewMessage?: string;
}

async function documentStage<T>(
  operation: string,
  stage: string,
  code: 'EXPORT_FAILED' | 'DATABASE_INTEGRITY_FAILED' | 'FILE_OPERATION_FAILED',
  safeMessage: string,
  action: () => T | Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    const systemCode = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : undefined;
    console.error('Gremia.SBV document error', JSON.stringify({
      operation,
      stage,
      code,
      errorName: error instanceof Error ? error.name : typeof error,
      ...(systemCode ? { systemCode } : {}),
    }));
    throw new ApplicationError(code, safeMessage, operation, { cause: error });
  }
}

export async function generateAndRequestDocumentPreviewForRecord<TRecord>(
  input: DocumentPreviewRecordWorkflowInput<TRecord>,
): Promise<DocumentPreviewRecordWorkflowResult<TRecord>> {
  const record = await documentStage(
    input.operation,
    'generate-and-store',
    'EXPORT_FAILED',
    input.generateFailureMessage,
    input.generate,
  );
  let plain: Buffer | undefined;
  try {
    plain = await documentStage(
      input.operation,
      'decrypt-and-verify',
      'DATABASE_INTEGRITY_FAILED',
      'Das PDF wurde gespeichert, konnte für die Vorschau aber nicht entschlüsselt und geprüft werden.',
      () => input.read(input.getDocumentId(record)),
    );
    await documentStage(
      input.operation,
      'cleanup-temporary-files',
      'FILE_OPERATION_FAILED',
      'Das PDF wurde gespeichert, vorhandene temporäre Vorschauen konnten aber nicht sicher bereinigt werden.',
      () => input.security.cleanupTemporaryFiles(),
    );
    const previewPath = await documentStage(
      input.operation,
      'write-preview',
      'FILE_OPERATION_FAILED',
      'Das PDF wurde gespeichert, die temporäre Vorschau konnte aber nicht geschrieben werden.',
      () => input.security.writeTemporaryFile('document-preview', input.getFilename(record), plain!, 'preview'),
    );
    if (requestExternalPreview(previewPath, input.opener)) {
      return { record, previewStatus: 'requested' };
    }
    return {
      record,
      previewStatus: 'unavailable',
      previewMessage: 'Das PDF wurde verschlüsselt gespeichert, der Auftrag an die externe Vorschau-Anwendung konnte aber nicht erteilt werden.',
    };
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    return {
      record,
      previewStatus: 'unavailable',
      previewMessage: error.message,
    };
  } finally {
    plain?.fill(0);
  }
}

export async function generateAndRequestDocumentPreview(
  input: DocumentPreviewWorkflowInput,
): Promise<SbvOfficeDocumentGenerationResult> {
  const result = await generateAndRequestDocumentPreviewForRecord({
    ...input,
    getDocumentId: (record) => record.id,
    getFilename: (record) => record.filename,
  });
  return {
    document: result.record,
    previewStatus: result.previewStatus,
    ...(result.previewMessage ? { previewMessage: result.previewMessage } : {}),
  };
}
