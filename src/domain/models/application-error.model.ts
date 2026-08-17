export type ApplicationErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DATABASE_INTEGRITY_FAILED'
  | 'AUDIT_WRITE_FAILED'
  | 'MIGRATION_FAILED'
  | 'EXPORT_FAILED'
  | 'FILE_OPERATION_FAILED'
  | 'SECURITY_OPERATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'UNEXPECTED_ERROR';

export interface ApplicationErrorPayload {
  code: ApplicationErrorCode;
  message: string;
  operation?: string;
}

export class ApplicationError extends Error {
  readonly name = 'ApplicationError';

  constructor(
    readonly code: ApplicationErrorCode,
    message: string,
    readonly operation?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }

  toPayload(): ApplicationErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.operation ? { operation: this.operation } : {}),
    };
  }
}

export class RendererApplicationError extends Error {
  readonly name = 'RendererApplicationError';

  constructor(
    readonly code: ApplicationErrorCode,
    message: string,
    readonly operation?: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
