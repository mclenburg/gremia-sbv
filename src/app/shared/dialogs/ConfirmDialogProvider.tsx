import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export type ConfirmDialogVariant = 'warning' | 'danger';

export type ConfirmDialogRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
};

type PendingConfirmDialog = ConfirmDialogRequest & {
  resolve: (confirmed: boolean) => void;
};

const ConfirmDialogContext = createContext<((request: ConfirmDialogRequest) => Promise<boolean>) | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmDialog | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((request: ConfirmDialogRequest) => new Promise<boolean>((resolve) => {
    setPending({
      variant: 'warning',
      cancelLabel: 'Abbrechen',
      confirmLabel: 'Fortfahren',
      ...request,
      resolve
    });
  }), []);

  const close = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[data-industrial-confirm-dialog="true"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      previousActiveElement?.focus();
    };
  }, [pending, close]);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="industrial-confirm-backdrop" role="presentation">
          <section
            className={`industrial-confirm-dialog industrial-confirm-${pending.variant ?? 'warning'}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="industrial-confirm-title"
            aria-describedby="industrial-confirm-description"
            data-industrial-confirm-dialog="true"
          >
            <div className="industrial-confirm-header">
              <div className="industrial-confirm-icon" aria-hidden="true">
                {pending.variant === 'danger' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <p className="industrial-kicker">{pending.variant === 'danger' ? 'Sicherheitsabfrage' : 'Export-Warnung'}</p>
                <h2 id="industrial-confirm-title">{pending.title}</h2>
              </div>
            </div>
            <div id="industrial-confirm-description" className="industrial-confirm-message">
              {pending.message.split('\n').map((line, index) => (
                <p key={`${line}-${index}`}>{line || '\u00a0'}</p>
              ))}
            </div>
            <div className="industrial-confirm-actions">
              <button type="button" className="industrial-secondary-button" ref={cancelButtonRef} onClick={() => close(false)}>
                {pending.cancelLabel ?? 'Abbrechen'}
              </button>
              <button type="button" className={pending.variant === 'danger' ? 'industrial-danger-button' : 'industrial-button'} onClick={() => close(true)}>
                {pending.confirmLabel ?? 'Fortfahren'}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider.');
  }
  return confirm;
}
