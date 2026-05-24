import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { AlertTriangle, Download, KeyRound, ShieldAlert } from "lucide-react";
import {
  DangerButton,
  GhostButton,
  IndustrialButton,
} from "../components/IndustrialButton";
import { FormActions, PasswordInput } from "../components/IndustrialForm";
import { FileLocationNotice } from "../components/ImportExportFeedback";

type IndustrialDialogVariant = "default" | "warning" | "danger";

type IndustrialModalProps = {
  title: string;
  kicker?: string;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  role?: "dialog" | "alertdialog";
  wide?: boolean;
  variant?: IndustrialDialogVariant;
  className?: string;
  labelledById?: string;
  describedById?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose?: () => void;
  closeOnEscape?: boolean;
  dataE2e?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
}

export function IndustrialModal({
  title,
  kicker,
  description,
  children,
  actions,
  icon,
  role = "dialog",
  wide = false,
  variant = "default",
  className,
  labelledById,
  describedById,
  initialFocusRef,
  onClose,
  closeOnEscape = true,
  dataE2e,
}: IndustrialModalProps) {
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const titleId = labelledById ?? generatedTitleId;
  const descriptionId = description ? describedById ?? generatedDescriptionId : undefined;
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      const explicitTarget = initialFocusRef?.current;
      if (explicitTarget) {
        explicitTarget.focus();
        return;
      }
      const first = dialogRef.current
        ? focusableElements(dialogRef.current)[0]
        : undefined;
      first?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      previousActiveElement?.focus();
    };
  }, [initialFocusRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && closeOnEscape && onClose) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = focusableElements(dialogRef.current);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className={joinClassNames(
          "industrial-modal",
          wide && "industrial-modal-wide",
          variant !== "default" && `industrial-modal-${variant}`,
          className,
        )}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        data-industrial-modal="true"
        data-e2e={dataE2e}
      >
        <div className="industrial-modal-header">
          {icon ? <div className="industrial-modal-icon" aria-hidden="true">{icon}</div> : null}
          <div>
            {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
        </div>
        {children}
        {actions ? <div className="industrial-modal-actions">{actions}</div> : null}
      </section>
    </div>
  );
}

export type ConfirmDialogVariant = "warning" | "danger";

export type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Fortfahren",
  cancelLabel = "Abbrechen",
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const ActionButton = variant === "danger" ? DangerButton : IndustrialButton;

  return (
    <IndustrialModal
      title={title}
      kicker={variant === "danger" ? "Sicherheitsabfrage" : "Bestätigung"}
      description="Bitte prüfe die Auswirkung dieser Aktion, bevor du fortfährst."
      icon={
        variant === "danger" ? (
          <ShieldAlert className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )
      }
      role="alertdialog"
      variant={variant}
      initialFocusRef={cancelButtonRef}
      onClose={onCancel}
      className="industrial-confirm-dialog"
      dataE2e="industrial-confirm-dialog"
      actions={
        <>
          <GhostButton type="button" ref={cancelButtonRef} onClick={onCancel}>
            {cancelLabel}
          </GhostButton>
          <ActionButton type="button" onClick={onConfirm}>
            {confirmLabel}
          </ActionButton>
        </>
      }
    >
      <div className="industrial-confirm-message">
        {message.split("\n").map((line, index) => (
          <p key={`${line}-${index}`}>{line || "\u00a0"}</p>
        ))}
      </div>
    </IndustrialModal>
  );
}

export function DestructiveConfirmDialog(
  props: Omit<ConfirmDialogProps, "variant">,
) {
  return <ConfirmDialog {...props} variant="danger" />;
}

export type PassphraseDialogProps = {
  title: string;
  kicker?: string;
  description: ReactNode;
  passphrase: string;
  onPassphraseChange: (value: string) => void;
  passphraseLabel?: string;
  minLength?: number;
  error?: string;
  busy?: boolean;
  children?: ReactNode;
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: () => void;
  onCancel: () => void;
  canSubmit?: boolean;
  wide?: boolean;
};

export function PassphraseDialog({
  title,
  kicker = "Geschützter Vorgang",
  description,
  passphrase,
  onPassphraseChange,
  passphraseLabel = "Passphrase",
  minLength,
  error,
  busy = false,
  children,
  submitLabel,
  cancelLabel = "Abbrechen",
  onSubmit,
  onCancel,
  canSubmit = true,
  wide = false,
}: PassphraseDialogProps) {
  return (
    <IndustrialModal
      title={title}
      kicker={kicker}
      description={description}
      icon={<KeyRound className="h-5 w-5" />}
      onClose={onCancel}
      wide={wide}
    >
      <form
        className="industrial-modal-grid"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <PasswordInput
          label={passphraseLabel}
          value={passphrase}
          minLength={minLength}
          autoFocus
          required
          wide
          error={error}
          onValueChange={onPassphraseChange}
        />
        {children}
        <FormActions>
          <GhostButton type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </GhostButton>
          <IndustrialButton type="submit" disabled={busy || !canSubmit}>
            {busy ? "Bitte warten …" : submitLabel}
          </IndustrialButton>
        </FormActions>
      </form>
    </IndustrialModal>
  );
}

export type ExportResultDialogProps = {
  title: string;
  kicker?: string;
  filePath: string;
  description?: ReactNode;
  closeLabel?: string;
  onClose: () => void;
};

export function ExportResultDialog({
  title,
  kicker = "Export abgeschlossen",
  filePath,
  description = "Der Export wurde lokal gespeichert. Der Pfad wird nur angezeigt und nicht als personenbezogener Inhalt ins Audit übernommen.",
  closeLabel = "Schließen",
  onClose,
}: ExportResultDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  return (
    <IndustrialModal
      title={title}
      kicker={kicker}
      description={description}
      icon={<Download className="h-5 w-5" />}
      initialFocusRef={closeButtonRef}
      onClose={onClose}
      role="dialog"
      className="industrial-export-result-dialog"
      dataE2e="industrial-export-result-dialog"
      actions={
        <GhostButton type="button" ref={closeButtonRef} onClick={onClose}>
          {closeLabel}
        </GhostButton>
      }
    >
      <FileLocationNotice filePath={filePath} />
    </IndustrialModal>
  );
}

export type ReasonRequiredDialogProps = {
  title: string;
  description: ReactNode;
  reason: string;
  onReasonChange: (value: string) => void;
  error?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ReasonRequiredDialog({
  title,
  description,
  reason,
  onReasonChange,
  error,
  confirmLabel = "Begründung übernehmen",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
}: ReasonRequiredDialogProps) {
  return (
    <IndustrialModal
      title={title}
      kicker="Begründung erforderlich"
      description={description}
      icon={<AlertTriangle className="h-5 w-5" />}
      role="alertdialog"
      variant="warning"
      onClose={onCancel}
    >
      <form
        className="industrial-modal-grid"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <label className="industrial-modal-wide">
          <span>Begründung</span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.currentTarget.value)}
            aria-invalid={error ? "true" : undefined}
          />
        </label>
        {error ? (
          <div className="industrial-message industrial-message-warning industrial-modal-wide" role="alert">
            {error}
          </div>
        ) : null}
        <FormActions>
          <GhostButton type="button" onClick={onCancel}>
            {cancelLabel}
          </GhostButton>
          <IndustrialButton type="submit" disabled={!reason.trim()}>
            {confirmLabel}
          </IndustrialButton>
        </FormActions>
      </form>
    </IndustrialModal>
  );
}
