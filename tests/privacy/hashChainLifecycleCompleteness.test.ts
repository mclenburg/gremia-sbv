import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata } from '../../services/auditHashChain.js';
import { lifecycleEventForStatusChange } from '../../services/measureLifecycleAuditService.js';

describe('Hash-Chain-Lifecycle-Vollständigkeit', () => {
  it('bewahrt die versionierten, datensparsamen Lifecycle-Metadaten vollständig', () => {
    const metadata = JSON.parse(normalizeAuditMetadata({
      schemaVersion: '1',
      eventName: 'created',
      measureType: 'bem',
      nextStatus: 'zu_pruefen',
      creationSource: 'manual',
      personName: 'Darf nicht protokolliert werden',
    }, 'measure_lifecycle'));

    expect(metadata).toEqual({
      creationSource: 'manual',
      eventName: 'created',
      measureType: 'bem',
      nextStatus: 'zu_pruefen',
      schemaVersion: '1',
    });
  });

  it('klassifiziert Abschluss, Wiedereröffnung und Abbruch ohne Zwecktextauswertung', () => {
    expect(lifecycleEventForStatusChange('in_progress', 'completed')).toBe('completed');
    expect(lifecycleEventForStatusChange('completed', 'in_progress')).toBe('reopened');
    expect(lifecycleEventForStatusChange('in_progress', 'cancelled')).toBe('cancelled');
  });
});
