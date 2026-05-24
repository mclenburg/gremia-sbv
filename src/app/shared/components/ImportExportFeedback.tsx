import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { IndustrialButton } from "./IndustrialButton";

type ExportActionProps = {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
};

export function ExportAction({
  children,
  type = "button",
  disabled = false,
  loading = false,
  onClick,
}: ExportActionProps) {
  return (
    <IndustrialButton
      type={type}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      className="industrial-export-action"
    >
      <Download className="h-4 w-4" />
      {children}
    </IndustrialButton>
  );
}

type FileLocationNoticeProps = {
  filePath: string;
  label?: string;
  description?: ReactNode;
};

export function FileLocationNotice({
  filePath,
  label = "Speicherort",
  description,
}: FileLocationNoticeProps) {
  return (
    <div className="industrial-file-location-notice" role="status" aria-live="polite">
      <strong>{label}</strong>
      {description ? <p>{description}</p> : null}
      <code>{filePath}</code>
    </div>
  );
}

export type ImportPackageMatchOption = {
  id: string;
  label: string;
  reasonLabel: string;
};

type ImportPackageReviewProps = {
  caseCount: number;
  measureCount: number;
  documentCount: number;
  deadlineCount: number;
  validUntilLabel: string;
  matches: ImportPackageMatchOption[];
  mode: "create_new" | "merge_existing";
  targetId: string;
  onModeChange: (mode: "create_new" | "merge_existing") => void;
  onTargetChange: (targetId: string) => void;
};

export function ImportPackageReview({
  caseCount,
  measureCount,
  documentCount,
  deadlineCount,
  validUntilLabel,
  matches,
  mode,
  targetId,
  onModeChange,
  onTargetChange,
}: ImportPackageReviewProps) {
  const hasMatches = matches.length > 0;
  const selectedMatch = matches.find((match) => match.id === targetId);

  return (
    <div className="industrial-import-package-review industrial-modal-preview industrial-modal-wide">
      <strong>Paket geprüft</strong>
      <p>
        {caseCount} Fallakte(n), {measureCount} Maßnahme(n), {documentCount}{" "}
        Dokument(e), {deadlineCount} Frist(en). Gültigkeit: {validUntilLabel}.
      </p>
      <fieldset className="industrial-import-package-options">
        <legend>Importentscheidung</legend>
        <label className="industrial-checkbox-row compact">
          <input
            type="radio"
            name="handover-import-mode"
            checked={mode === "create_new"}
            onChange={() => onModeChange("create_new")}
          />
          <span>Als neue lokale Übergabeakte anlegen</span>
        </label>
        {hasMatches ? (
          <label className="industrial-checkbox-row compact">
            <input
              type="radio"
              name="handover-import-mode"
              checked={mode === "merge_existing"}
              onChange={() => onModeChange("merge_existing")}
            />
            <span>Mit bestehender Fallakte zusammenführen/aktualisieren</span>
          </label>
        ) : null}
        {mode === "merge_existing" && hasMatches ? (
          <label className="industrial-import-package-target">
            <span>Passendes Gegenstück</span>
            <select value={targetId} onChange={(event) => onTargetChange(event.currentTarget.value)}>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.label} · {match.reasonLabel}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selectedMatch ? (
          <p>
            Gewählte Zusammenführung: {selectedMatch.label} ·{" "}
            {selectedMatch.reasonLabel}.
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
