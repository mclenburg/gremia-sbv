import type { AuthMode } from '../auth/authTypes';
import type { ViewId } from '../navigation/modules';

export const INITIAL_SESSION_VIEW: ViewId = 'dashboard';

export type LockableSessionState = {
  unlocked: boolean;
  authMode: AuthMode;
};

/**
 * Session-Lock ist absichtlich kein Navigationsereignis.
 *
 * Manueller Lock und Auto-Lock schließen nur den Tresor. Arbeitskontext wie
 * aktuelles Modul, geöffnete Fallknoten, Fristdialoge oder Prefills bleiben im
 * Renderer-State erhalten und sind nach erfolgreichem Entsperren wieder da.
 * Ein echter App-Neustart beginnt weiterhin über INITIAL_SESSION_VIEW.
 */
export function toLockedSessionState<TSession extends LockableSessionState>(
  session: TSession,
): TSession {
  return {
    ...session,
    unlocked: false,
    authMode: 'login',
  };
}
