import type { ChangeEvent, TextareaHTMLAttributes } from 'react';
import { findFirstTextCommand, type TextCommandToken } from '@services/textCommandPolicy';

export type TextCommandTextareaChange = {
  token: TextCommandToken;
  index: number;
  value: string;
  fieldId?: string;
};

type TextCommandTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  fieldId?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onTextCommand?: (command: TextCommandTextareaChange) => void;
};

const TEXT_COMMAND_HINT = '// Frist · @@ Kontakt · ## Fall · §§ Norm · !! Risiko · >> Aufgabe · ^^ Vertraulichkeit · ~~ Anonymisierung';

export function TextCommandTextarea({
  fieldId,
  onChange,
  onTextCommand,
  placeholder,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextCommandTextareaProps) {
  const hintId = fieldId ? `${fieldId}-text-command-hint` : undefined;

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
    window.dispatchEvent(new CustomEvent<TextCommandTextareaChange>('gremia-sbv:text-command-detected', { detail: payload }));
  }

  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(' ') || undefined;
  const commandPlaceholder = placeholder ? `${placeholder} · ${TEXT_COMMAND_HINT}` : TEXT_COMMAND_HINT;

  return (
    <>
      <textarea
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
