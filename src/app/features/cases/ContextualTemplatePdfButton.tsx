import { useState } from 'react';
import type { RenderedTemplateResult } from '../../../domain/models/template.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

type ContextualTemplatePdfButtonProps = {
  rendered: RenderedTemplateResult;
  onOpened: (message: string) => void;
};

export function ContextualTemplatePdfButton({ rendered, onOpened }: ContextualTemplatePdfButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const announce = useAnnouncer();

  async function openPdf() {
    setBusy(true);
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.templates) throw new Error('Vorlagendienst ist nicht erreichbar.');
      await bridge.templates.openPdf({
        title: rendered.title,
        subject: rendered.subject,
        body: rendered.body,
      });
      const message = 'PDF wurde im einheitlichen Gremia-Layout als Vorschau geöffnet.';
      onOpened(message);
      announce(message, 'polite');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'PDF konnte nicht erzeugt werden.';
      setError(message);
      announce(message, 'assertive');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="industrial-button"
        disabled={busy || rendered.unresolvedPlaceholders.length > 0}
        onClick={() => void openPdf()}
      >
        {busy ? 'PDF wird erzeugt …' : 'Als PDF öffnen'}
      </button>
      {error && <span className="industrial-inline-warning" role="alert">{error}</span>}
    </>
  );
}
