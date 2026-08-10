import { describe, expect, it } from 'vitest';
import { lifecycleEventForStatusChange } from '../../services/measureLifecycleAuditService.js';
import { normalizeAuditMetadata } from '../../services/auditHashChain.js';

function parsed(metadata: Record<string, unknown>): Record<string, string> {
  return JSON.parse(normalizeAuditMetadata(metadata, 'measure_lifecycle')) as Record<string, string>;
}

describe('Maßnahmen-Lifecycle', () => {
  it('klassifiziert fachliche Statusübergänge ohne Textauswertung', () => {
    expect(lifecycleEventForStatusChange('open', 'in_progress')).toBe('status_changed');
    expect(lifecycleEventForStatusChange('in_progress', 'completed')).toBe('completed');
    expect(lifecycleEventForStatusChange('completed', 'in_progress')).toBe('reopened');
    expect(lifecycleEventForStatusChange('open', 'cancelled')).toBe('cancelled');
    expect(lifecycleEventForStatusChange('open', 'open')).toBeUndefined();
  });

  it('übernimmt ausschließlich freigegebene datensparsame Metadaten', () => {
    const metadata = parsed({
      schemaVersion: '1',
      eventName: 'created',
      measureType: 'bem',
      nextStatus: 'zu_pruefen',
      creationSource: 'manual',
      title: 'BEM für Erika Mustermann',
      diagnosis: 'nicht zulässig',
    });

    expect(metadata).toEqual({
      creationSource: 'manual',
      eventName: 'created',
      measureType: 'bem',
      nextStatus: 'zu_pruefen',
      schemaVersion: '1',
    });
  });
});
