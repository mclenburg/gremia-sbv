import type { CaseNoteLinkRecord } from '../../core/models/case-note-link.model';
import type { CaseExplorerSelection } from './caseWorkbenchTypes';

type Props = {
  links?: CaseNoteLinkRecord[];
  onSelect: (selection: CaseExplorerSelection) => void;
  onMissingTarget?: (label: string) => void;
};

export function selectionForLink(link: CaseNoteLinkRecord): CaseExplorerSelection | null {
  if (link.targetType === 'bem') return { type: 'process', processType: 'bem', id: link.targetId };
  if (link.targetType === 'prevention') return { type: 'process', processType: 'prevention', id: link.targetId };
  if (link.targetType === 'participation') return { type: 'process', processType: 'participation', id: link.targetId };
  if (link.targetType === 'termination_hearing') return { type: 'process', processType: 'termination_hearing', id: link.targetId };
  if (link.targetType === 'equalization') return { type: 'process', processType: 'equalization', id: link.targetId };
  if (link.targetType === 'workplace_accommodation') return { type: 'process', processType: 'workplace_accommodation', id: link.targetId };
  return null;
}

export function typeLabel(link: CaseNoteLinkRecord): string {
  if (link.targetType === 'bem') return 'BEM';
  if (link.targetType === 'prevention') return 'Prävention';
  if (link.targetType === 'participation') return 'SBV-Beteiligung';
  if (link.targetType === 'termination_hearing') return 'Kündigungsanhörung';
  if (link.targetType === 'equalization') return 'Gleichstellung/GdB';
  if (link.targetType === 'workplace_accommodation') return 'Arbeitsplatzanpassung';
  return 'Frist';
}

export function CaseNoteEntityLinks({ links, onSelect, onMissingTarget }: Props) {
  const visibleLinks = links ?? [];
  if (!visibleLinks.length) return null;

  return (
    <div className="case-note-entity-links" aria-label="Interne Aktenbezüge aus dieser Notiz">
      <strong>Aktenbezüge</strong>
      <div className="case-note-entity-link-list">
        {visibleLinks.map((link) => {
          const selection = selectionForLink(link);
          const disabled = Boolean(link.isMissingTarget) || (!selection && link.targetType !== 'deadline');
          return (
            <button
              key={link.id}
              type="button"
              className="case-note-entity-link"
              data-e2e="note-entity-link"
              aria-label={link.accessibleLabel}
              disabled={disabled}
              onClick={() => {
                if (!selection) {
                  onMissingTarget?.(link.label);
                  return;
                }
                onSelect(selection);
              }}
            >
              <span>{typeLabel(link)}</span>
              <strong>{link.label}</strong>
              {link.isMissingTarget && <small>Ziel nicht mehr vorhanden</small>}
              {link.targetType === 'deadline' && !link.isMissingTarget && <small>Im Fristenmodul öffnen</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
