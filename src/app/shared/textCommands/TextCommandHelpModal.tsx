import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Search, X } from 'lucide-react';
import { TEXT_COMMAND_HELP_GROUPS, TEXT_COMMAND_REGISTRY, type TextCommandDefinition } from '@/domain/textCommands/textCommandPolicy';
import { useDialogFocusManagement } from '../dialogs/useDialogFocusManagement';

function definitionsForGroup(kinds: string[], query: string): TextCommandDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();
  return kinds
    .map((kind) => TEXT_COMMAND_REGISTRY.find((definition) => definition.kind === kind))
    .filter((definition): definition is TextCommandDefinition => Boolean(definition))
    .filter((definition) => {
      if (!normalizedQuery) return true;
      return `${definition.tokens.join(' ')} ${definition.label} ${definition.description}`.toLowerCase().includes(normalizedQuery);
    });
}

export function TextCommandHelpModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  const groups = useMemo(
    () => TEXT_COMMAND_HELP_GROUPS
      .map((group) => ({ ...group, definitions: definitionsForGroup(group.kinds, query) }))
      .filter((group) => group.definitions.length > 0),
    [query]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const handleDialogKeyDown = useDialogFocusManagement({
    active: open,
    dialogRef,
    initialFocusRef: searchRef,
    onClose: close,
  });

  useLayoutEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        event.stopPropagation();
        if (open) close();
        else setOpen(true);
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [close, open]);

  if (!open) return null;

  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="industrial-modal text-command-help-modal"
        data-e2e="inline-help-dialog"
        data-focus-managed="true"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="text-command-help-title"
        aria-describedby="text-command-help-description"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon"><Keyboard className="h-5 w-5" /></div>
          <div>
            <p className="industrial-kicker">Live-Erfassung</p>
            <h2 id="text-command-help-title">Kurzbefehle</h2>
            <p id="text-command-help-description">Strg+H öffnet oder schließt diese Übersicht. Die Liste ist durchsuchbar; Esc schließt das Fenster.</p>
          </div>
          <button type="button" className="industrial-icon-button" onClick={close} aria-label="Kurzbefehle schließen"><X className="h-4 w-4" /></button>
        </div>

        <label className="text-command-help-search">
          <span><Search className="h-4 w-4" /> Kurzbefehle durchsuchen</span>
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Frist, Beteiligung, Datenschutz, /anp …" />
        </label>

        <div className="industrial-inline-note" role="note">
          Klickbare Aktenbezüge im Protokoll sind für <code>/bem</code>, <code>/praev</code>, <code>/bet</code>, <code>/kuend</code>, <code>/gleich</code>, <code>/anp</code> und <code>/fr</code> aktiv.
        </div>

        <div className="text-command-help-grid">
          {groups.map((group) => (
            <article key={group.title} className="text-command-help-group">
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <div className="text-command-help-list">
                {group.definitions.map((definition) => (
                  <div key={definition.kind} className="text-command-help-item">
                    <code>{definition.tokens.join(' · ')}</code>
                    <div>
                      <strong>{definition.label}</strong>
                      <span>{definition.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!groups.length && <p className="text-command-help-empty">Keine Kurzbefehle zur Suche gefunden.</p>}
        </div>

        <div className="industrial-modal-actions">
          <button type="button" className="industrial-secondary-button" onClick={close}>Schließen</button>
        </div>
      </section>
    </div>
  );
}
