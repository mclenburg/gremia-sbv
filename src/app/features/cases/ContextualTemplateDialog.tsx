import type { RenderedTemplateResult } from "../../../domain/models/template.model";
import { missingPlaceholderWarning } from "@/domain/templates/templateContextPolicy";
import { ContextualTemplatePdfButton } from "./ContextualTemplatePdfButton";

type ContextualTemplateDialogProps = {
  rendered: RenderedTemplateResult;
  message: string;
  onClose: () => void;
  onCopy: () => void;
  onPdfOpened: (message: string) => void;
};

export function ContextualTemplateDialog({ rendered, message, onClose, onCopy, onPdfOpened }: ContextualTemplateDialogProps) {
  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <section className="industrial-modal industrial-modal-wide" role="dialog" aria-modal="true" aria-labelledby="contextual-template-dialog-title">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Kontextschreiben</p>
            <h2 id="contextual-template-dialog-title">{rendered.title}</h2>
            <p>
              Dieser Entwurf wurde aus dem aktuellen Vorgang erzeugt und der
              Fallakte zugeordnet.
            </p>
          </div>
        </div>
        {!!rendered.unresolvedPlaceholders.length && (
          <div className="industrial-message industrial-message-warning" role="alert">
            {missingPlaceholderWarning(rendered.unresolvedPlaceholders)}
          </div>
        )}
        {message && (
          <div className="industrial-message industrial-message-ok" role="status">
            {message}
          </div>
        )}
        <div className="industrial-subpanel">
          <h4>Betreff</h4>
          <p>{rendered.subject}</p>
        </div>
        <div className="industrial-subpanel template-preview-body">
          <h4>Textvorschau</h4>
          <pre>{rendered.body}</pre>
        </div>
        <div className="industrial-modal-actions">
          <button type="button" className="industrial-secondary-button" onClick={onClose}>
            Schließen
          </button>
          <button type="button" className="industrial-button" onClick={onCopy}>
            In Zwischenablage kopieren
          </button>
          <ContextualTemplatePdfButton rendered={rendered} onOpened={onPdfOpened} />
        </div>
      </section>
    </div>
  );
}
