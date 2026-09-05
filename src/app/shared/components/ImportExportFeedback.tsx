import { useMemo, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { IndustrialButton } from "./IndustrialButton";
import type { TransferImportDecisionItem } from "../../../domain/models/transfer.model";

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
  integrityLabel?: string;
  fileNotice?: string;
  warnings?: string[];
  planItems?: TransferImportDecisionItem[];
  mergeAllowed?: boolean;
  createModeLabel?: string;
  mergeBlockedMessage?: string;
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
  integrityLabel,
  fileNotice,
  warnings = [],
  planItems = [],
  mergeAllowed = true,
  createModeLabel = "Als neue lokale Übergabeakte anlegen",
  mergeBlockedMessage = "Zusammenführung ist wegen echter Konflikte gesperrt. Bitte als neue lokale Übergabeakte importieren und fachlich prüfen.",
  onModeChange,
  onTargetChange,
}: ImportPackageReviewProps) {
  const [matchFilter, setMatchFilter] = useState("");
  const hasMatches = matches.length > 0;
  const normalizedFilter = matchFilter.trim().toLocaleLowerCase("de-DE");
  const visibleMatches = useMemo(
    () => normalizedFilter
      ? matches.filter((match) => `${match.label} ${match.reasonLabel}`.toLocaleLowerCase("de-DE").includes(normalizedFilter))
      : matches,
    [matches, normalizedFilter],
  );
  const selectedMatch = matches.find((match) => match.id === targetId);

  return (
    <div className="industrial-import-package-review industrial-modal-preview industrial-modal-wide">
      <strong>Paket geprüft</strong>
      <p>
        {caseCount} Fallakte(n), {measureCount} Maßnahme(n), {documentCount}{" "}
        Dokument(e), {deadlineCount} Frist(en). Gültigkeit: {validUntilLabel}.
      </p>
      {integrityLabel ? <p>{integrityLabel}</p> : null}
      {fileNotice ? <p>{fileNotice}</p> : null}
      {warnings.length ? (
        <ul className="industrial-import-package-warnings">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {planItems.length ? (
        <div className="industrial-import-plan" aria-label="Importplan">
          <strong>Importplan</strong>
          <ul className="industrial-import-package-warnings">
            {planItems.map((item) => (
              <li key={item.id} data-severity={item.severity}>
                <span>{item.label}</span>
                <small>{item.description}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <fieldset className="industrial-import-package-options">
        <legend>Importentscheidung</legend>
        <label className="industrial-checkbox-row compact">
          <input
            type="radio"
            name="handover-import-mode"
            checked={mode === "create_new"}
            onChange={() => onModeChange("create_new")}
          />
          <span>{createModeLabel}</span>
        </label>
        {hasMatches && mergeAllowed ? (
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
        {hasMatches && !mergeAllowed ? (
          <p className="industrial-message industrial-message-warning" role="alert">
            {mergeBlockedMessage}
          </p>
        ) : null}
        {mode === "merge_existing" && hasMatches && mergeAllowed ? (
          <label className="industrial-import-package-target">
            <span>Passendes Gegenstück</span>
            {matches.length > 5 ? (
              <input
                className="industrial-input"
                value={matchFilter}
                onChange={(event) => setMatchFilter(event.currentTarget.value)}
                placeholder="Gegenstücke filtern …"
                aria-label="Passende Gegenstücke filtern"
              />
            ) : null}
            <select className="industrial-select" value={targetId} onChange={(event) => onTargetChange(event.currentTarget.value)}>
              {visibleMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.label} · {match.reasonLabel}
                </option>
              ))}
            </select>
            {matches.length > 5 ? <small aria-live="polite">{visibleMatches.length} von {matches.length} Gegenstück(en) sichtbar.</small> : null}
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
