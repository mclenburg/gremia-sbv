import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { isValidElement } from "react";
import type { HelpRegistryId } from "../help/helpRegistry";
import { FormField, joinClassNames, type IndustrialFieldOption } from "./IndustrialFormCore";
export type SelectInputProps = Omit<
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
