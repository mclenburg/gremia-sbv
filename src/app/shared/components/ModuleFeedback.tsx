import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IndustrialButton';

export type ModuleFeedbackItem = {
  id?: string;
  tone?: 'info' | 'success' | 'warning';
  message: ReactNode;
};

const toneClass: Record<NonNullable<ModuleFeedbackItem['tone']>, string> = {
  info: '',
  success: 'industrial-message-ok',
  warning: 'industrial-message-warning'
};

export function ModuleFeedback({ items }: { items: Array<ModuleFeedbackItem | null | undefined | false> }) {
  const visibleItems = items.filter(Boolean) as ModuleFeedbackItem[];
  if (!visibleItems.length) return null;

  const hasWarning = visibleItems.some((item) => item.tone === 'warning');

  return (
    <div className="module-feedback" role={hasWarning ? 'alert' : 'status'} aria-live={hasWarning ? 'assertive' : 'polite'} aria-atomic="true">
      {visibleItems.map((item, index) => (
        <FeedbackToast key={`${item.id ?? index}:${typeof item.message === 'string' ? item.message : ''}`} item={item} />
      ))}
    </div>
  );
}

function FeedbackToast({ item }: { item: ModuleFeedbackItem }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  function dismiss(event: React.MouseEvent<HTMLButtonElement>) {
    const focusTarget = event.currentTarget.closest<HTMLElement>('[role="dialog"], [role="alertdialog"]')
      ?? document.getElementById('main-content');
    focusTarget?.focus({ preventScroll: true });
    setDismissed(true);
  }

  return (
    <div className={`industrial-message ${toneClass[item.tone ?? 'info']}`.trim()}>
      <div className="module-feedback-text">{item.message}</div>
      <IconButton className="module-feedback-dismiss" aria-label="Meldung schließen" title="Meldung schließen" onClick={dismiss}>
        <X aria-hidden="true" size={18} />
      </IconButton>
    </div>
  );
}
