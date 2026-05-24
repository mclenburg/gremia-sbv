import type { ReactNode } from "react";
import { ModuleFrame } from "./ModuleFrame";
import { StatusBadge } from "./StatusBadges";

export type WorkbenchStatItem = {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger" | "success";
};

export type IndustrialPanelTone =
  | "default"
  | "ok"
  | "success"
  | "warning"
  | "danger"
  | "problem"
  | "info"
  | "muted"
  | "neutral";


export function recordMatchesQuery(
  values: Array<string | number | null | undefined>,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values
    .filter((value): value is string | number => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function industrialToneClass(tone: IndustrialPanelTone = "default"): string {
  return `industrial-tone-${tone}`;
}

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function IndustrialPanel({
  children,
  kicker,
  title,
  description,
  actions,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  kicker?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      className={joinClassNames("industrial-panel", className)}
      aria-label={ariaLabel}
    >
      {title ? (
        <IndustrialPanelHeader
          kicker={kicker}
          title={title}
          description={description}
          actions={actions}
        />
      ) : null}
      {children}
    </section>
  );
}

export function IndustrialRecordCard({
  children,
  tone = "default",
  selected = false,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  tone?: IndustrialPanelTone;
  selected?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <article
      className={joinClassNames(
        "industrial-record-card",
        industrialToneClass(tone),
        selected && "is-active",
        className,
      )}
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
    >
      {children}
    </article>
  );
}

export function IndustrialSelectionCard({
  children,
  selected = false,
  tone = "default",
  className,
  ariaLabel,
}: {
  children: ReactNode;
  selected?: boolean;
  tone?: IndustrialPanelTone;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <article
      className={joinClassNames(
        "industrial-selection-card",
        industrialToneClass(tone),
        selected && "is-active",
        className,
      )}
      aria-label={ariaLabel}
      aria-current={selected ? "true" : undefined}
    >
      {children}
    </article>
  );
}

export function IndustrialStatusCard({
  title,
  statusLabel,
  tone = "default",
  children,
  detail,
}: {
  title: string;
  statusLabel: string;
  tone?: IndustrialPanelTone;
  children: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <article
      className={joinClassNames(
        "industrial-status-card",
        industrialToneClass(tone),
      )}
    >
      <div className="industrial-status-card-header">
        <h3>{title}</h3>
        <StatusBadge
          label={statusLabel}
          tone={tone}
          ariaLabel={`Status ${statusLabel}`}
        />
      </div>
      <p>{children}</p>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

export function IndustrialWarningPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClassNames("industrial-warning-panel", className)}
      role="note"
    >
      {children}
    </div>
  );
}

export function IndustrialDangerPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClassNames("industrial-danger-panel", className)}
      role="alert"
    >
      {children}
    </div>
  );
}

export function WorkbenchPage({
  title,
  kicker,
  description,
  actions,
  children,
  compact = true,
}: {
  title: string;
  kicker?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <ModuleFrame
      title={title}
      kicker={kicker}
      description={description}
      compact={compact}
    >
      <div className="workbench-page">
        {actions ? (
          <WorkbenchHeader
            title={title}
            kicker={kicker}
            description={description}
            actions={actions}
            visuallyHiddenTitle
          />
        ) : null}
        {children}
      </div>
    </ModuleFrame>
  );
}

export function WorkbenchHeader({
  title,
  kicker,
  description,
  actions,
  visuallyHiddenTitle = false,
}: {
  title: string;
  kicker?: string;
  description?: string;
  actions?: ReactNode;
  visuallyHiddenTitle?: boolean;
}) {
  return (
    <header className="workbench-header">
      <div>
        {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
        <h2 className={visuallyHiddenTitle ? "sr-only" : undefined}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <WorkbenchToolbar>{actions}</WorkbenchToolbar> : null}
    </header>
  );
}

export function WorkbenchSidebar({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <aside className="workbench-sidebar" aria-label={ariaLabel}>
      {children}
    </aside>
  );
}

export function WorkbenchContent({
  children,
  ariaLive,
}: {
  children: ReactNode;
  ariaLive?: "off" | "polite" | "assertive";
}) {
  return (
    <section
      className="workbench-content industrial-workspace-content"
      aria-live={ariaLive}
    >
      {children}
    </section>
  );
}

export function WorkbenchToolbar({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="workbench-toolbar" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function WorkbenchSummary({
  items,
  actions,
  ariaLabel,
}: {
  items: WorkbenchStatItem[];
  actions?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="workbench-summary" aria-label={ariaLabel}>
      <div className="workbench-summary-grid">
        {items.map((item) => (
          <div
            className={`workbench-summary-card workbench-summary-card-${item.tone ?? "default"}`}
            key={item.label}
          >
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      {actions ? (
        <div className="workbench-summary-actions">{actions}</div>
      ) : null}
    </div>
  );
}

export function WorkbenchGrid({ children }: { children: ReactNode }) {
  return <div className="workbench-grid">{children}</div>;
}

export function WorkbenchListPanel({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <section className="workbench-list-panel" aria-label={ariaLabel}>
      {children}
    </section>
  );
}

export function WorkbenchDetailPanel({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <section className="workbench-detail-panel" aria-label={ariaLabel}>
      {children}
    </section>
  );
}

export function WorkbenchCreatePanel({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <div className="workbench-create-panel">
      {title || description ? (
        <div className="workbench-panel-head">
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function IndustrialField({
  children,
  label,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <label
      className={`industrial-field ${wide ? "industrial-field-wide" : ""}`}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

export function IndustrialFormGrid({
  children,
  columns = "auto",
}: {
  children: ReactNode;
  columns?: "auto" | 2 | 3 | 4;
}) {
  return (
    <div className={`industrial-form-grid industrial-form-grid-${columns}`}>
      {children}
    </div>
  );
}

export function IndustrialCheckboxRow({ children }: { children: ReactNode }) {
  return <div className="industrial-checkbox-row">{children}</div>;
}

export function IndustrialActionRow({ children }: { children: ReactNode }) {
  return <div className="industrial-action-row">{children}</div>;
}


export function EmptyState({
  title = "Kein Eintrag vorhanden",
  text,
  action,
}: {
  title?: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="industrial-empty-state" role="status">
      <strong>{title}</strong>
      <span>{text}</span>
      {action ? <div className="industrial-empty-state-action">{action}</div> : null}
    </div>
  );
}

export function SearchToolbar({
  searchValue,
  onSearchChange,
  searchLabel = "Suche",
  searchPlaceholder = "Suchen …",
  resultCount,
  children,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  resultCount?: number;
  children?: ReactNode;
}) {
  const searchId = `industrial-search-${searchLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="industrial-search-toolbar" role="search">
      <label className="industrial-search-field" htmlFor={searchId}>
        <span>{searchLabel}</span>
        <input
          id={searchId}
          className="industrial-input"
          type="search"
          value={searchValue}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
        />
      </label>
      {typeof resultCount === "number" ? (
        <span className="industrial-search-count" aria-live="polite">
          {resultCount} Treffer
        </span>
      ) : null}
      {children ? <div className="industrial-search-actions">{children}</div> : null}
    </div>
  );
}

export function FilterBar({
  children,
  ariaLabel = "Filter",
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="industrial-filter-bar" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function RecordList<T>({
  items,
  renderItem,
  getKey,
  empty,
  ariaLabel,
  className,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  empty: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <div className={joinClassNames("industrial-record-list", className)} aria-label={ariaLabel}>
        {empty}
      </div>
    );
  }

  return (
    <div className={joinClassNames("industrial-record-list", className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <div className="industrial-record-list-item" key={getKey(item)}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

export type DataTableRow = {
  id: string;
  cells: ReactNode[];
};

export function DataTable({
  headers,
  rows,
  empty,
  ariaLabel,
}: {
  headers: string[];
  rows: DataTableRow[];
  empty: ReactNode;
  ariaLabel: string;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className="industrial-data-table-shell">
      <table className="industrial-data-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkbenchWorkspace({
  children,
  navigation,
  ariaLabel,
  ariaLive,
}: {
  children: ReactNode;
  navigation: ReactNode;
  ariaLabel?: string;
  ariaLive?: "off" | "polite" | "assertive";
}) {
  return (
    <div className="industrial-workspace-shell" aria-label={ariaLabel}>
      <WorkbenchSidebar
        ariaLabel={ariaLabel ? `${ariaLabel} Navigation` : undefined}
      >
        {navigation}
      </WorkbenchSidebar>
      <WorkbenchContent ariaLive={ariaLive}>{children}</WorkbenchContent>
    </div>
  );
}

export type WorkbenchNavigationItem<T extends string> = {
  id: T;
  title: string;
  description?: string;
};

export function WorkbenchNavigation<T extends string>({
  items,
  active,
  onChange,
  ariaLabel,
}: {
  items: WorkbenchNavigationItem<T>[];
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <nav className="industrial-workspace-nav" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? "is-active" : ""}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => onChange(item.id)}
        >
          <strong>{item.title}</strong>
          {item.description ? <span>{item.description}</span> : null}
        </button>
      ))}
    </nav>
  );
}

export function IndustrialPanelHeader({
  kicker,
  title,
  description,
  actions,
  compact = true,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`industrial-panel-header ${compact ? "compact" : ""}`}>
      <div>
        {kicker ? <p className="industrial-kicker">{kicker}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="industrial-action-row">{actions}</div> : null}
    </div>
  );
}
