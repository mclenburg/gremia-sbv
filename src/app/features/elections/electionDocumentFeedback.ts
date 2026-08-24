export interface ElectionDocumentPreviewResult {
  document: { filename: string };
  previewStatus: 'requested' | 'unavailable';
  previewMessage?: string;
}

export interface ElectionFeedback {
  message: string;
  tone: 'success' | 'warning';
}

export function electionDocumentFeedback(result: ElectionDocumentPreviewResult): ElectionFeedback {
  if (result.previewStatus === 'unavailable') {
    return {
      tone: 'warning',
      message: result.previewMessage
        ?? `Das PDF „${result.document.filename}“ wurde verschlüsselt gespeichert, die externe Vorschau konnte aber nicht angefordert werden.`,
    };
  }
  return {
    tone: 'success',
    message: `Das PDF „${result.document.filename}“ wurde verschlüsselt gespeichert und an die externe Vorschau übergeben.`,
  };
}
