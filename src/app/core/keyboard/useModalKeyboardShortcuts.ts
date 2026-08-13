import { useEffect } from 'react';
import type { ViewId } from '../navigation/modules';

const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]';
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getOpenModals(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(MODAL_SELECTOR))
    .filter((modal) => modal.getClientRects().length > 0);
}

function getTopModal(): HTMLElement | null {
  return getOpenModals().at(-1) ?? null;
}

function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}

function getFocusable(modal: HTMLElement): HTMLElement[] {
  return Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable);
}

function accessibleButtonText(button: HTMLButtonElement): string {
  return `${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`.trim().toLowerCase();
}

function clickModalButton(modal: HTMLElement, matcher: (text: string) => boolean): boolean {
  const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
  const button = buttons.find((item) => matcher(accessibleButtonText(item)));
  if (!button) return false;
  button.click();
  return true;
}

function ensureInitialFocus(modal: HTMLElement): void {
  if (modal.dataset.focusManaged === 'true') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && modal.contains(active)) return;
  const target = modal.querySelector<HTMLElement>('[autofocus]') ?? getFocusable(modal)[0] ?? modal;
  if (target === modal && modal.tabIndex < 0) modal.tabIndex = -1;
  target.focus();
}

export function useModalKeyboardShortcuts({ setCurrentView }: { setCurrentView: (view: ViewId) => void }) {
  useEffect(() => {
    const returnFocus = new WeakMap<HTMLElement, HTMLElement>();
    let knownModals = new Set<HTMLElement>();
    let lastNonModalFocus: HTMLElement | null = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function synchronizeModalLifecycle() {
      const current = new Set(getOpenModals());
      for (const modal of current) {
        if (knownModals.has(modal)) continue;
        const active = document.activeElement;
        const candidate = active instanceof HTMLElement && !modal.contains(active) ? active : lastNonModalFocus;
        if (candidate?.isConnected && !modal.contains(candidate)) returnFocus.set(modal, candidate);
        window.setTimeout(() => ensureInitialFocus(modal), 0);
      }
      for (const modal of knownModals) {
        if (current.has(modal) || modal.dataset.focusManaged === 'true') continue;
        const target = returnFocus.get(modal);
        if (target?.isConnected) window.setTimeout(() => target.focus(), 0);
      }
      knownModals = current;
    }

    function handleFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(MODAL_SELECTOR)) lastNonModalFocus = target;
    }

    const observer = new MutationObserver(synchronizeModalLifecycle);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal', 'hidden'] });
    synchronizeModalLifecycle();

    function handleKeydown(event: KeyboardEvent) {
      const topModal = getTopModal();

      if (event.key === 'Escape' && topModal) {
        if (topModal.dataset.focusManaged === 'true') return;
        const closed = clickModalButton(topModal, (text) => text.includes('abbrechen') || text.includes('schließen') || text.includes('zurück'));
        if (closed) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (event.key === 'Tab' && topModal) {
        if (topModal.dataset.focusManaged === 'true') return;
        const focusable = getFocusable(topModal);
        if (!focusable.length) {
          event.preventDefault();
          if (topModal.tabIndex < 0) topModal.tabIndex = -1;
          topModal.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || !topModal.contains(active)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && topModal) {
        event.preventDefault();
        const primaryButtons = Array.from(topModal.querySelectorAll<HTMLButtonElement>('button.industrial-button:not([disabled])'));
        primaryButtons.at(-1)?.click();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setCurrentView('cases');
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('gremia-sbv:create-case')), 0);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        const target = document.querySelector<HTMLInputElement>('[data-global-search-target]');
        if (target) {
          target.focus();
          target.select();
          return;
        }
        window.dispatchEvent(new CustomEvent('gremia-sbv:focus-search'));
      }
    }

    document.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('keydown', handleKeydown, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', handleFocusIn, true);
      window.removeEventListener('keydown', handleKeydown, true);
    };
  }, [setCurrentView]);
}
