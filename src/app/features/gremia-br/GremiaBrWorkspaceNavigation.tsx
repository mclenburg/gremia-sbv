import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { ToolbarButton } from '../../shared/components/IndustrialButton';

export const GREMIA_BR_WORKSPACE_SECTIONS = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'meetings', label: 'Sitzungen' },
  { id: 'procedures', label: 'Verfahren' },
  { id: 'documents', label: 'Dokumente' },
] as const;

export type GremiaBrWorkspaceSection = (typeof GREMIA_BR_WORKSPACE_SECTIONS)[number]['id'];

export function GremiaBrWorkspaceNavigation({ activeSection, onSelect }: {
  activeSection: GremiaBrWorkspaceSection;
  onSelect: (section: GremiaBrWorkspaceSection) => void;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % GREMIA_BR_WORKSPACE_SECTIONS.length; break;
      case 'ArrowLeft': nextIndex = (index - 1 + GREMIA_BR_WORKSPACE_SECTIONS.length) % GREMIA_BR_WORKSPACE_SECTIONS.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = GREMIA_BR_WORKSPACE_SECTIONS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const section = GREMIA_BR_WORKSPACE_SECTIONS[nextIndex];
    onSelect(section.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="settings-hub-tabs" role="tablist" aria-label="Gremia.BR-Arbeitsbereiche">
      {GREMIA_BR_WORKSPACE_SECTIONS.map((section, index) => (
        <ToolbarButton
          key={section.id}
          ref={(element) => { tabRefs.current[index] = element; }}
          id={`gremia-br-${section.id}-tab`}
          role="tab"
          aria-selected={activeSection === section.id}
          aria-controls={`gremia-br-${section.id}-panel`}
          tabIndex={activeSection === section.id ? 0 : -1}
          className="settings-hub-tab"
          onClick={() => onSelect(section.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {section.label}
        </ToolbarButton>
      ))}
    </div>
  );
}
