import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type LivePoliteness = 'polite' | 'assertive';

type LiveRegionContextValue = (message: string, politeness?: LivePoliteness) => void;

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, politeness: LivePoliteness = 'polite') => {
    const setter = politeness === 'assertive' ? setAssertiveMessage : setPoliteMessage;
    setter('');
    window.setTimeout(() => setter(message), 25);
  }, []);

  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div className="industrial-live-region" role="status" aria-live="polite" aria-atomic="true">{politeMessage}</div>
      <div className="industrial-live-region" role="alert" aria-live="assertive" aria-atomic="true">{assertiveMessage}</div>
    </LiveRegionContext.Provider>
  );
}

export function useOptionalAnnouncer() {
  return useContext(LiveRegionContext);
}

export function useAnnouncer() {
  const announce = useOptionalAnnouncer();
  if (!announce) {
    throw new Error('useAnnouncer must be used within LiveRegionProvider.');
  }
  return announce;
}
