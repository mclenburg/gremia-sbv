import type { ChangeEvent, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { TextCommandTextarea, type TextCommandTextareaChange } from "../textCommands/TextCommandTextarea";
import type { HelpRegistryId } from "../help/helpRegistry";
import { FormField, joinClassNames } from "./IndustrialFormCore";
export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange"
> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  helpText?: ReactNode;
  helpId?: HelpRegistryId;
  error?: ReactNode;
  wide?: boolean;
};

export function TextInput({
  label,
  value,
  onValueChange,
  helpText,
  helpId: helpRegistryId,
  error,
  wide,
  required,
  className,
  ...inputProps
}: TextInputProps) {
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
          value={value}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onValueChange(event.currentTarget.value)
          }
        />
      )}
    </FormField>
  );
}

export function SearchInput(props: Omit<TextInputProps, "type">) {
  return (
    <TextInput
      {...props}
      type="search"
      className={joinClassNames("industrial-search-input", props.className)}
    />
  );
}

export function DateInput(props: Omit<TextInputProps, "type">) {
  return <TextInput {...props} type="date" />;
}

export function DateTimeInput(props: Omit<TextInputProps, "type">) {
  return <TextInput {...props} type="datetime-local" />;
}

export function PasswordInput(props: Omit<TextInputProps, "type">) {
  return (
    <TextInput {...props} type="password" autoComplete="current-password" />
  );
}

export type TextareaInputProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "value" | "onChange"
> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  helpText?: ReactNode;
  helpId?: HelpRegistryId;
  error?: ReactNode;
  wide?: boolean;
  textCommandFieldId?: string;
  showCommandHint?: boolean;
  globalCommandsEnabled?: boolean;
  onTextCommand?: (command: TextCommandTextareaChange) => void;
};

export function TextareaInput({
  label,
  value,
  onValueChange,
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
}: TextareaInputProps) {
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
          value={value}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          showCommandHint={showCommandHint}
          globalCommandsEnabled={globalCommandsEnabled}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onValueChange(event.currentTarget.value)
          }
          onTextCommand={onTextCommand}
        />
      )}
    </FormField>
  );
}

