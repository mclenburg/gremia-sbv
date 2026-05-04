import type { ReactNode } from 'react';

export type WorkbenchStatItem = {
  label: string;
  value: string | number;
  tone?: 'default' | 'warning' | 'danger' | 'success';
};

export function WorkbenchSummary({
  items,
  actions,
  ariaLabel
}: {
  items: WorkbenchStatItem[];
  actions?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className="workbench-summary" aria-label={ariaLabel}>
      <div className="workbench-summary-grid">
        {items.map((item) => (
          <div className={`workbench-summary-card workbench-summary-card-${item.tone ?? 'default'}`} key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      {actions ? <div className="workbench-summary-actions">{actions}</div> : null}
    </div>
  );
}

export function WorkbenchGrid({ children }: { children: ReactNode }) {
  return <div className="workbench-grid">{children}</div>;
}

export function WorkbenchListPanel({
  children,
  ariaLabel
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
  ariaLabel
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
  description
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
  wide = false
}: {
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <label className={`industrial-field ${wide ? 'industrial-field-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function IndustrialFormGrid({
  children,
  columns = 'auto'
}: {
  children: ReactNode;
  columns?: 'auto' | 2 | 3 | 4;
}) {
  return <div className={`industrial-form-grid industrial-form-grid-${columns}`}>{children}</div>;
}

export function IndustrialCheckboxRow({ children }: { children: ReactNode }) {
  return <div className="industrial-checkbox-row">{children}</div>;
}

export function IndustrialActionRow({ children }: { children: ReactNode }) {
  return <div className="industrial-action-row">{children}</div>;
}
