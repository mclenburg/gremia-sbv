import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { FileText } from "lucide-react";
import { ToolbarButton } from "../components/IndustrialButton";
import { useOptionalAnnouncer } from "../a11y/LiveRegionProvider";

export type ProcessDetailBadge = {
  label: string;
  value: string;
};

export function ProcessDetailHeader({
  title,
  description,
  badgeLabel = "Maßnahme",
  documentAction,
  badges,
}: {
  title: string;
  description: string;
  badgeLabel?: string;
  documentAction?: () => void;
  badges: ProcessDetailBadge[];
}) {
  return (
    <>
      <div className="case-process-header">
        <div className="case-process-header-main">
          <div className="case-process-title-row">
            <span className="industrial-badge">{badgeLabel}</span>
            {documentAction && (
              <ToolbarButton
                className="case-process-document-link"
                onClick={documentAction}
              >
                <FileText className="h-3.5 w-3.5" />
                Dokumente
              </ToolbarButton>
            )}
          </div>
          <h2>{title}</h2>
        </div>
        <div className="case-process-badges" aria-label="Statusübersicht">
          {badges.map((badge) => (
            <span key={badge.label} className="case-process-badge">
              <strong>{badge.label}</strong>
              {badge.value}
            </span>
          ))}
        </div>
      </div>
      <p className="industrial-meta">{description}</p>
    </>
  );
}

export function ProcessSection({
  title,
  objective,
  children,
  announceOnMount,
  focusOnMount = false,
}: {
  title: string;
  objective?: string;
  children: ReactNode;
  announceOnMount?: string;
  focusOnMount?: boolean;
}) {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement | null>(null);
  const announce = useOptionalAnnouncer();

  useEffect(() => {
    if (announceOnMount) {
      announce?.(announceOnMount);
    }

    if (focusOnMount && typeof window !== "undefined") {
      const schedule = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(callback, 0));
      schedule(() => {
        sectionRef.current?.focus({ preventScroll: false });
      });
    }
  }, [announce, announceOnMount, focusOnMount]);

  return (
    <section
      ref={sectionRef}
      className="industrial-form-section process-detail-section"
      aria-labelledby={headingId}
      tabIndex={focusOnMount ? -1 : undefined}
    >
      <h3 id={headingId}>{title}</h3>
      {objective && <p className="industrial-meta">{objective}</p>}
      {children}
    </section>
  );
}
