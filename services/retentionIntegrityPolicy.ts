import type { RetentionCandidate } from '../src/domain/models/retention.model.js';
import type { RetentionDocumentSnapshot } from './retentionPolicy.js';

export function buildRetentionIntegrityCandidates(
  documents: readonly RetentionDocumentSnapshot[],
): RetentionCandidate[] {
  const candidates: RetentionCandidate[] = [];
  for (const document of documents) {
    if (document.hasMetadata && document.fileExists) continue;
    candidates.push({
      id: `document-integrity-${document.id}`,
      type: 'orphan_document_review',
      riskLevel: 'critical',
      title: 'Dokumentenspeicher prüfen',
      reference: document.caseNumber ? `${document.caseNumber} · ${document.displayTitle}` : document.displayTitle,
      description: document.fileExists
        ? 'Dokumentcontainer vorhanden, aber Metadaten/Verschlüsselungsdaten sind unvollständig.'
        : 'Dokument-Metadaten vorhanden, aber verschlüsselter Container fehlt im Dateisystem.',
      recommendedAction: 'pruefen',
      createdAt: document.createdAt ?? undefined,
      entityType: 'document',
      entityId: document.id,
    });
  }
  return candidates;
}
