import { useEffect, useState } from 'react';
import type { UnifiedSearchDetail, UnifiedSearchHit } from '../../../domain/models/unified-search.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export function SearchResultDetail({ result }: { result: UnifiedSearchHit }) {
  const [detail, setDetail] = useState<UnifiedSearchDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setDetail(null);
    setError('');
    void (async () => {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
        const loaded = await bridge.cases.searchDetail(result.sourceType, result.sourceId);
        if (!active) return;
        if (loaded) setDetail(loaded);
        else setError('Der Datensatz ist nicht mehr vorhanden. Bitte die Suche aktualisieren.');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Der Datensatz konnte nicht geöffnet werden.');
      }
    })();
    return () => { active = false; };
  }, [result.sourceType, result.sourceId]);
  return <>
    <h2>{result.title}</h2>
    {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : detail ? <p className="case-note-content">{detail.content}</p>
      : <p className="industrial-field-help" role="status">Datensatz wird geladen …</p>}
  </>;
}
