export type PdfOpenResult = {
  opened: boolean;
  error?: string;
};

export type PdfExportFeedbackStatus =
  | "stored"
  | "preview_requested"
  | "preview_unavailable";

export interface PdfExportFeedback {
  status: PdfExportFeedbackStatus;
  message: string;
  announceMode: "polite" | "assertive";
}

function withFileName(message: string, fileName?: string): string {
  return fileName ? `${message}: ${fileName}` : `${message}.`;
}

export function buildPdfExportFeedback({
  title,
  fileName,
  openRequested,
  openResult,
}: {
  title: string;
  fileName?: string;
  openRequested: boolean;
  openResult?: PdfOpenResult;
}): PdfExportFeedback {
  if (!openRequested) {
    return {
      status: "stored",
      message: withFileName(`${title} wurde als verschlüsselter PDF-Report erzeugt`, fileName),
      announceMode: "polite",
    };
  }

  if (openResult?.opened) {
    return {
      status: "preview_requested",
      message: withFileName(`${title} wurde als verschlüsselter PDF-Report erzeugt und an die externe Vorschau übergeben`, fileName),
      announceMode: "polite",
    };
  }

  const reason = openResult?.error ? ` ${openResult.error}` : "";
  return {
    status: "preview_unavailable",
    message: withFileName(`${title} wurde als verschlüsselter PDF-Report erzeugt; die externe Vorschau konnte aber nicht angefordert werden.${reason}`, fileName),
    announceMode: "assertive",
  };
}
