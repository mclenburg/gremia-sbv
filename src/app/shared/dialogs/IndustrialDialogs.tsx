import {
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { AlertTriangle, Download, ShieldAlert } from "lucide-react";
import {
  DangerButton,
  GhostButton,
  IndustrialButton,
} from "../components/IndustrialButton";
import { FileLocationNotice } from "../components/ImportExportFeedback";
import { useDialogFocusManagement } from "./useDialogFocusManagement";

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

type IndustrialModalSurfaceProps = {
  children: ReactNode;
  labelledById: string;
  describedById?: string;
  role?: "dialog" | "alertdialog";
  className?: string;
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

export function IndustrialModalSurface({
  children,
  labelledById,
  describedById,
  role = "dialog",
  className,
  initialFocusRef,
  onClose,
  closeOnEscape = true,
  dataE2e,
}: IndustrialModalSurfaceProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const handleKeyDown = useDialogFocusManagement({
    dialogRef,
    initialFocusRef,
    onClose,
    closeOnEscape,
  });

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className={joinClassNames("industrial-modal", className)}
        role={role}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={labelledById}
        aria-describedby={describedById}
        onKeyDown={handleKeyDown}
        data-industrial-modal="true"
        data-focus-managed="true"
        data-e2e={dataE2e}
      >
        {children}
      </section>
    </div>
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
  return (
    <IndustrialModalSurface
      className={joinClassNames(
          wide && "industrial-modal-wide",
          variant !== "default" && `industrial-modal-${variant}`,
          className,
      )}
      role={role}
      labelledById={titleId}
      describedById={descriptionId}
      initialFocusRef={initialFocusRef}
      onClose={onClose}
      closeOnEscape={closeOnEscape}
      dataE2e={dataE2e}
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
    </IndustrialModalSurface>
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
          <ShieldAlert className="industrial-icon-md" />
        ) : (
          <AlertTriangle className="industrial-icon-md" />
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
      icon={<Download className="industrial-icon-md" />}
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
