import type { ReactNode } from "react";
import { WorkbenchContent, WorkbenchSidebar } from "./WorkbenchStructure";
import type { IndustrialPanelTone } from "./WorkbenchPanels";

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
