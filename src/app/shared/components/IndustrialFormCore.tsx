import type { ReactNode } from "react";
import { useId } from "react";
import { IndustrialHelpButton } from "../help/IndustrialHelp";
import type { HelpRegistryId } from "../help/helpRegistry";
export type IndustrialFieldOption = {
  value: string;
  label: string;
};

export type FieldChromeProps = {
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

export function joinClassNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function describedById(helpTextId?: string, errorId?: string): string | undefined {
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

