import type {
  ChangeEvent,
  FocusEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { isValidElement, useEffect, useId, useState } from "react";
import { TextCommandTextarea, type TextCommandTextareaChange } from "../textCommands/TextCommandTextarea";
import { IndustrialHelpButton } from "../help/IndustrialHelp";
import type { HelpRegistryId } from "../help/helpRegistry";

export type IndustrialFieldOption = {
  value: string;
  label: string;
};

type FieldChromeProps = {
  label: string;
  helpText?: ReactNode;
  helpId?: HelpRegistryId;
  error?: ReactNode;
  required?: boolean;
  wide?: boolean;
  className?: string;
  children: (ids: {
    id: string;
    describedBy?: string;
    invalid: boolean;
  }) => ReactNode;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function describedById(helpTextId?: string, errorId?: string): string | undefined {
  return [helpTextId, errorId].filter(Boolean).join(" ") || undefined;
}

export function FormSection({
  children,
  title,
  kicker,
  description,
  actions,
  className,
  ariaLabel,
  helpId,
}: {
  children: ReactNode;
  title?: string;
  kicker?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  ariaLabel?: string;
  helpId?: HelpRegistryId;
}) {
  const headingId = useId();
  return (
    <section
      className={joinClassNames("industrial-form-section", "industrial-panel", className)}
      aria-label={ariaLabel ?? (title ? undefined : "Formularabschnitt")}
      aria-labelledby={title ? headingId : undefined}
    >
      {title || description || actions || helpId ? (
        <div className="industrial-panel-header compact">
          <div>
            {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
            {title ? (
              <div className="industrial-section-title-row">
                <h2 id={headingId}>{title}</h2>
                {helpId ? <IndustrialHelpButton helpId={helpId} label="Abschnittshilfe öffnen" /> : null}
              </div>
            ) : helpId ? (
              <IndustrialHelpButton helpId={helpId} label="Abschnittshilfe öffnen" />
            ) : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? (
            <div className="industrial-action-row">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function FormField({
  label,
  helpText,
  helpId: helpRegistryId,
  error,
  required = false,
  wide = false,
  className,
  children,
}: FieldChromeProps) {
  const id = useId();
  const helpTextId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const invalid = Boolean(error);

  return (
    <div
      className={joinClassNames(
        "industrial-field",
        wide && "industrial-field-wide",
        invalid && "industrial-field-invalid",
        className,
      )}
    >
      <div className="industrial-field-label-row">
        <label className="industrial-field-label" htmlFor={id}>
          <span className="industrial-field-label-text">{label}</span>
          {required ? (
            <span className="industrial-field-required-marker" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {helpRegistryId ? <IndustrialHelpButton helpId={helpRegistryId} label="Feldhilfe öffnen" /> : null}
      </div>
      {children({
        id,
        describedBy: describedById(helpTextId, errorId),
        invalid,
      })}
      {helpText ? (
        <p className="industrial-field-help" id={helpTextId}>
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p className="industrial-field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = Omit<
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

type TextareaInputProps = Omit<
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

type DeferredTextInputProps = Omit<
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

type DeferredTextareaInputProps = Omit<
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

type SelectInputProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "value" | "onChange"
> & {
  label: string;
  value: string;
  options: IndustrialFieldOption[];
  onValueChange: (value: string) => void;
  helpText?: ReactNode;
  helpId?: HelpRegistryId;
  error?: ReactNode;
  wide?: boolean;
};

export function SelectInput({
  label,
  value,
  options,
  onValueChange,
  helpText,
  helpId: helpRegistryId,
  error,
  wide,
  required,
  className,
  ...selectProps
}: SelectInputProps) {
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
        <select
          {...selectProps}
          id={id}
          className={joinClassNames(
            "industrial-input industrial-select industrial-select-input",
            className,
          )}
          value={value}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onValueChange(event.currentTarget.value)
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

export function CheckboxField({
  label,
  checked,
  onCheckedChange,
  helpText,
  helpId: helpRegistryId,
  error,
  wide = false,
  required = false,
  className,
  ...inputProps
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type" | "checked" | "onChange"
> & {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  helpText?: ReactNode;
  helpId?: HelpRegistryId;
  error?: ReactNode;
  wide?: boolean;
}) {
  return (
    <FormField
      label={label}
      helpText={helpText}
      helpId={helpRegistryId}
      error={error}
      wide={wide}
      required={required}
      className={joinClassNames("industrial-checkbox-field", className)}
    >
      {({ id, describedBy, invalid }) => (
        <input
          {...inputProps}
          id={id}
          type="checkbox"
          checked={checked}
          required={required}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        />
      )}
    </FormField>
  );
}

function formErrorKey(error: ReactNode, occurrence: number): string {
  if (typeof error === "string" || typeof error === "number") {
    return `${String(error)}-${occurrence}`;
  }

  if (isValidElement(error) && error.key !== null) {
    return `${String(error.key)}-${occurrence}`;
  }

  return `form-error-${occurrence}`;
}

export function FormErrorSummary({
  errors,
  title = "Bitte Eingaben prüfen",
}: {
  errors: Array<ReactNode | false | null | undefined>;
  title?: string;
}) {
  const visibleErrors = errors.filter(Boolean);
  if (!visibleErrors.length) return null;

  const occurrences = new Map<string, number>();
  const keyedErrors = visibleErrors.map((error) => {
    const baseKey =
      typeof error === "string" || typeof error === "number"
        ? String(error)
        : isValidElement(error) && error.key !== null
          ? String(error.key)
          : "form-error";
    const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
    occurrences.set(baseKey, occurrence);
    return { error, key: formErrorKey(error, occurrence) };
  });

  return (
    <div className="industrial-form-error-summary" role="alert" tabIndex={-1}>
      <strong>{title}</strong>
      <ul>
        {keyedErrors.map(({ error, key }) => (
          <li key={key}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function FormActions({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end" | "between";
  className?: string;
}) {
  return (
    <div
      className={joinClassNames(
        "industrial-form-actions",
        `industrial-form-actions-${align}`,
        className,
      )}
    >
      {children}
    </div>
  );
}
