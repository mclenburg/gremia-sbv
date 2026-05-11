import type { ReactNode } from 'react';

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
        <div key={item.id ?? index} className={`industrial-message ${toneClass[item.tone ?? 'info']}`.trim()}>
          {item.message}
        </div>
      ))}
    </div>
  );
}
