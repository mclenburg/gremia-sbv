import type { CreateGremiaBrExternalReferenceInput, GremiaBrInlineSuggestion } from '../../core/models/gremia-br.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export async function suggestGremiaBrInlineReferences(query: string): Promise<GremiaBrInlineSuggestion[]> {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) return [];
  return bridge.gremiaBr.suggestInlineReferences(query);
}

export async function saveGremiaBrInlineReference(input: CreateGremiaBrExternalReferenceInput) {
  const bridge = await waitForBridge();
  if (!bridge?.gremiaBr) throw new Error('Gremia.BR-Lesebrücke ist nicht verfügbar.');
  return bridge.gremiaBr.saveExternalReference(input);
}

export function renderGremiaBrInlineReferenceToken(suggestion: GremiaBrInlineSuggestion): string {
  return `##br:${suggestion.sourceType}:${suggestion.sourceId}`;
}
