import { useEffect, useRef } from 'react';
import type { ChangeEvent, TextareaHTMLAttributes } from 'react';
import { findFirstTextCommand, type TextCommandToken } from '@services/textCommandPolicy';

export type TextCommandTextareaChange = {
  token: TextCommandToken;
  index: number;
  value: string;
  fieldId?: string;
};

export type TextCommandTextareaReplacement = {
  fieldId: string;
  markerIndex: number;
  token: TextCommandToken;
  replacement: string;
};

type TextCommandTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  fieldId?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextCommand?: (command: TextCommandTextareaChange) => void;
  showCommandHint?: boolean;
  globalCommandsEnabled?: boolean;
};

const TEXT_COMMAND_HINT = '// Frist · @@ Kontakt · ## Fall · §§ Norm · !! Risiko · >> Aufgabe · ^^ Vertraulichkeit · ~~ Anonymisierung';

export function TextCommandTextarea({
  fieldId,
  onChange,
  onTextCommand,
  showCommandHint = true,
  globalCommandsEnabled = true,
  placeholder,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextCommandTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hintId = showCommandHint && fieldId ? `${fieldId}-text-command-hint` : undefined;

  useEffect(() => {
    if (!fieldId) return undefined;

    function handleReplacement(event: Event) {
      const detail = (event as CustomEvent<TextCommandTextareaReplacement>).detail;
      if (!detail || detail.fieldId !== fieldId || !textareaRef.current) return;

      const textarea = textareaRef.current;
      const index = textarea.value.slice(detail.markerIndex).startsWith(detail.token)
        ? detail.markerIndex
        : textarea.value.indexOf(detail.token);
      if (index < 0) return;

      textarea.value = `${textarea.value.slice(0, index)}${detail.replacement}${textarea.value.slice(index + detail.token.length)}`.replace(/ {2,}/g, ' ');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
      const cursor = index + detail.replacement.length;
      textarea.setSelectionRange(cursor, cursor);
    }

    window.addEventListener('gremia-sbv:text-command-replace', handleReplacement);
    return () => window.removeEventListener('gremia-sbv:text-command-replace', handleReplacement);
  }, [fieldId]);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange?.(event);
    const command = findFirstTextCommand(event.target.value);
    if (!command) return;

    const payload: TextCommandTextareaChange = {
      token: command.token,
      index: command.index,
      value: event.target.value,
      fieldId
    };

    onTextCommand?.(payload);
    if (globalCommandsEnabled) window.dispatchEvent(new CustomEvent<TextCommandTextareaChange>('gremia-sbv:text-command-detected', { detail: payload }));
  }

  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(' ') || undefined;
  const commandPlaceholder = showCommandHint ? (placeholder ? `${placeholder} · ${TEXT_COMMAND_HINT}` : TEXT_COMMAND_HINT) : placeholder;

  return (
    <>
      <textarea
        ref={textareaRef}
        {...props}
        data-text-command-enabled="true"
        data-text-command-field={fieldId}
        aria-describedby={describedBy}
        placeholder={commandPlaceholder}
        onChange={handleChange}
      />
      {hintId && <small id={hintId} className="text-command-hint">{TEXT_COMMAND_HINT}</small>}
    </>
  );
}
