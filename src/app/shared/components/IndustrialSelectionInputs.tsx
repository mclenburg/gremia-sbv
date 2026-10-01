import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { isValidElement, useEffect, useMemo, useRef, useState } from "react";
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
  const selectableOptions = useMemo(
    () => options.filter((option) => option.value !== ""),
    [options],
  );
  const selectedLabel = value
    ? selectableOptions.find((option) => option.value === value)?.label ?? ""
    : "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
  const matches = useMemo(() => selectableOptions.filter((option) => (
    !open || !normalizedQuery || option.label.toLocaleLowerCase("de-DE").includes(normalizedQuery)
  )), [normalizedQuery, open, selectableOptions]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, query]);

  function openOptions() {
    setQuery("");
    setActiveIndex(Math.max(0, selectableOptions.findIndex((option) => option.value === value)));
    setOpen(true);
  }

  function closeOptions() {
    setOpen(false);
    setQuery("");
  }

  function selectOption(option: IndustrialFieldOption) {
    onValueChange(option.value);
    closeOptions();
  }

  return (
    <FormField label={label} helpText={helpText} helpId={helpRegistryId} error={error} wide={wide} required={required}>
      {({ id, describedBy, invalid }) => {
        const listId = `${id}-options`;
        const resultId = `${id}-results`;
        return <div className="industrial-searchable-select">
          <input
            {...inputProps}
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && matches.length ? `${listId}-${Math.min(activeIndex, matches.length - 1)}` : undefined}
            aria-describedby={[describedBy, resultId].filter(Boolean).join(" ") || undefined}
            aria-invalid={invalid ? "true" : undefined}
            aria-required={required ? "true" : undefined}
            className={joinClassNames("industrial-input industrial-select-input industrial-searchable-select-input", className)}
            value={open ? query : selectedLabel}
            placeholder={placeholder}
            required={required && !value}
            onFocus={(event) => {
              inputProps.onFocus?.(event);
              if (!open) openOptions();
            }}
            onClick={() => { if (!open) openOptions(); }}
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (!open) setOpen(true);
              setQuery(next);
              setActiveIndex(0);
              const exact = selectableOptions.find((option) => option.label.localeCompare(next, "de-DE", { sensitivity: "accent" }) === 0);
              if (exact) selectOption(exact);
              else if (!next) onValueChange("");
            }}
            onKeyDown={(event) => {
              inputProps.onKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (!open) openOptions();
                else if (matches.length) setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
                if (matches.length) selectOption(matches[Math.min(activeIndex, matches.length - 1)]);
              } else if (event.key === "Escape" && open) {
                event.preventDefault();
                closeOptions();
              }
            }}
            onBlur={(event) => {
              inputProps.onBlur?.(event);
              closeOptions();
            }}
          />
          {open && <ul ref={listRef} id={listId} className="industrial-searchable-select-options" role="listbox">
            {matches.map((option, index) => <li
              key={option.value}
              id={`${listId}-${index}`}
              className="industrial-searchable-select-option"
              role="option"
              aria-selected={option.value === value}
              data-active={index === Math.min(activeIndex, matches.length - 1) ? "true" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >{option.label}</li>)}
            {!matches.length && <li className="industrial-searchable-select-empty">Keine Treffer</li>}
          </ul>}
          <span id={resultId} className="industrial-sr-only" role="status" aria-live="polite">{open ? `${matches.length} Treffer verfügbar.` : ""}</span>
        </div>;
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
          className="industrial-input"
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
