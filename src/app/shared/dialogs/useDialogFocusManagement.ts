import {
  useCallback,
  useEffect,
  type KeyboardEvent,
  type RefObject,
} from 'react';

type DialogFocusManagementOptions = {
  active?: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose?: () => void;
  closeOnEscape?: boolean;
};

function isFocusable(element: HTMLElement): boolean {
  return !element.hasAttribute('disabled')
    && !element.hasAttribute('hidden')
    && element.getAttribute('aria-hidden') !== 'true'
    && element.tabIndex !== -1;
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(isFocusable);
}

export function useDialogFocusManagement({
  active = true,
  dialogRef,
  initialFocusRef,
  onClose,
  closeOnEscape = true,
}: DialogFocusManagementOptions) {
  useEffect(() => {
    if (!active) return undefined;

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      const target = initialFocusRef?.current
        ?? (dialog ? focusableElements(dialog)[0] : null)
        ?? dialog;
      target?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (previousActiveElement?.isConnected) previousActiveElement.focus();
    };
  }, [active, dialogRef, initialFocusRef]);

  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && closeOnEscape && onClose) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = focusableElements(dialog);

    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (!dialog.contains(activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [closeOnEscape, dialogRef, onClose]);
}
