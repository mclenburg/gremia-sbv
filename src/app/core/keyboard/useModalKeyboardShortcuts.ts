import { useEffect } from 'react';
import type { ViewId } from '../navigation/modules';

function getTopModal(): HTMLElement | null {
  const modals = Array.from(document.querySelectorAll<HTMLElement>('.industrial-modal'));
  return modals.at(-1) ?? null;
}

function getFocusable(modal: HTMLElement): HTMLElement[] {
  return Array.from(modal.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
}

function clickModalButton(modal: HTMLElement, matcher: (text: string) => boolean): boolean {
  const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
  const button = buttons.find((item) => matcher(item.textContent?.trim().toLowerCase() ?? ''));
  if (!button) return false;
  button.click();
  return true;
}

export function useModalKeyboardShortcuts({ setCurrentView }: { setCurrentView: (view: ViewId) => void }) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const topModal = getTopModal();

      if (event.key === 'Escape' && topModal) {
        event.preventDefault();
        clickModalButton(topModal, (text) => text.includes('abbrechen') || text.includes('schließen'));
        return;
      }

      if (event.key === 'Tab' && topModal) {
        const focusable = getFocusable(topModal);
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

    window.addEventListener('keydown', handleKeydown, true);
    return () => window.removeEventListener('keydown', handleKeydown, true);
  }, [setCurrentView]);
}
