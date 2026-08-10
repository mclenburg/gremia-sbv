import type { ChangeEvent, FocusEvent, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { TextCommandTextarea, type TextCommandTextareaChange } from "../textCommands/TextCommandTextarea";
import type { HelpRegistryId } from "../help/helpRegistry";
import { FormField, joinClassNames } from "./IndustrialFormCore";
export type DeferredTextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "defaultValue" | "onChange" | "onBlur"
> & {
  label: string;
  value?: string | number | null;
  onCommit: (value: string) => void | Promise<void>;
  helpText?: ReactNode;
  helpId?: HelpRegistryId;
  error?: ReactNode;
  wide?: boolean;
};

function normalizeDeferredValue(
  value: string | number | null | undefined,
): string {
  return value === null || value === undefined ? "" : String(value);
}

export function DeferredTextInput({
  label,
  value,
  onCommit,
  helpText,
  helpId: helpRegistryId,
  error,
  wide,
  required,
  className,
  ...inputProps
}: DeferredTextInputProps) {
  const normalizedValue = normalizeDeferredValue(value);
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const nextValue = event.currentTarget.value;
    if (nextValue !== normalizedValue) {
      void onCommit(nextValue);
    }
  }

  return (
    <FormField
      label={label}
      helpText={helpText}
      helpId={helpRegistryId}
      error={error}
      wide={wide}
      required={required}
    >
      {({ id, describedBy, invalid }) => (
        <input
          {...inputProps}
          id={id}
          className={joinClassNames(
            "industrial-input industrial-text-input",
            className,
          )}
          value={draft}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setDraft(event.currentTarget.value)
          }
          onBlur={handleBlur}
        />
      )}
    </FormField>
  );
}

export function DeferredDateTimeInput(
  props: Omit<DeferredTextInputProps, "type">,
) {
  return <DeferredTextInput {...props} type="datetime-local" />;
}

export type DeferredTextareaInputProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "value" | "defaultValue" | "onChange" | "onBlur"
> & {
  label: string;
  value?: string | null;
  onCommit: (value: string) => void | Promise<void>;
  helpText?: ReactNode;
  helpId?: HelpRegistryId;
  error?: ReactNode;
  wide?: boolean;
  textCommandFieldId?: string;
  showCommandHint?: boolean;
  globalCommandsEnabled?: boolean;
  onTextCommand?: (command: TextCommandTextareaChange) => void;
};

export function DeferredTextareaInput({
  label,
  value,
  onCommit,
  helpText,
  helpId: helpRegistryId,
  error,
  wide,
  required,
  className,
  textCommandFieldId,
  showCommandHint,
  globalCommandsEnabled,
  onTextCommand,
  ...textareaProps
}: DeferredTextareaInputProps) {
  const normalizedValue = value ?? "";
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  function handleBlur(event: FocusEvent<HTMLTextAreaElement>) {
    const nextValue = event.currentTarget.value;
    if (nextValue !== normalizedValue) {
      void onCommit(nextValue);
    }
  }

  return (
    <FormField
      label={label}
      helpText={helpText}
      helpId={helpRegistryId}
      error={error}
      wide={wide}
      required={required}
    >
      {({ id, describedBy, invalid }) => (
        <TextCommandTextarea
          {...textareaProps}
          id={id}
          fieldId={textCommandFieldId ?? id}
          className={joinClassNames(
            "industrial-input industrial-textarea-input",
            className,
          )}
          value={draft}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          showCommandHint={showCommandHint}
          globalCommandsEnabled={globalCommandsEnabled}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            setDraft(event.currentTarget.value)
          }
          onTextCommand={onTextCommand}
          onBlur={handleBlur}
        />
      )}
    </FormField>
  );
}

