import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { isValidElement, useEffect, useMemo, useState } from "react";
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
  if (options.length > 5) {
    return <SearchableSelectInput
      label={label}
      value={value}
      options={options}
      onValueChange={onValueChange}
      helpText={helpText}
      helpId={helpRegistryId}
      error={error}
      wide={wide}
      required={required}
      className={className}
      disabled={selectProps.disabled}
      name={selectProps.name}
      autoFocus={selectProps.autoFocus}
    />;
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

export type SearchableSelectInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange" | "list"
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

export function SearchableSelectInput({
  label,
  value,
  options,
  onValueChange,
  helpText,
  helpId: helpRegistryId,
  error,
  wide,
  required,
  placeholder = "Tippen, um zu filtern …",
  className,
  ...inputProps
}: SearchableSelectInputProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  useEffect(() => { setQuery(selectedLabel); }, [selectedLabel]);
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
  const matches = useMemo(() => options.filter((option) => (
    !normalizedQuery || option.label.toLocaleLowerCase("de-DE").includes(normalizedQuery)
  )), [normalizedQuery, options]);

  return (
    <FormField label={label} helpText={helpText} helpId={helpRegistryId} error={error} wide={wide} required={required}>
      {({ id, describedBy, invalid }) => {
        const listId = `${id}-options`;
        const resultId = `${id}-results`;
        return <>
          <input
            {...inputProps}
            id={id}
            type="search"
            aria-describedby={[describedBy, resultId].filter(Boolean).join(" ") || undefined}
            aria-invalid={invalid ? "true" : undefined}
            aria-required={required ? "true" : undefined}
            className={joinClassNames("industrial-input", className)}
            list={listId}
            value={query}
            placeholder={placeholder}
            required={required}
            onChange={(event) => {
              const next = event.currentTarget.value;
              setQuery(next);
              const exact = options.find((option) => option.label.localeCompare(next, "de-DE", { sensitivity: "accent" }) === 0);
              if (exact) onValueChange(exact.value);
              else if (!next) onValueChange("");
            }}
            onBlur={(event) => {
              inputProps.onBlur?.(event);
              const exact = options.find((option) => option.label.localeCompare(event.currentTarget.value, "de-DE", { sensitivity: "accent" }) === 0);
              if (!exact) setQuery(selectedLabel);
            }}
          />
          <datalist id={listId}>{matches.map((option) => <option key={option.value} value={option.label} />)}</datalist>
          <span id={resultId} className="sr-only" role="status" aria-live="polite">{matches.length} Treffer verfügbar.</span>
        </>;
      }}
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
