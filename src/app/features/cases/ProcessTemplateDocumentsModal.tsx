import { Download, FileText } from 'lucide-react';
import type { PreventionProcessRecord } from '../../core/models/prevention.model';
import type { BemProcessRecord } from '../../core/models/bem.model';
import type { EqualizationProcessRecord } from '../../core/models/equalization.model';
import type { TerminationHearingRecord } from '../../core/models/termination.model';
import { terminationStatusLabel } from '../termination/terminationShared';
import type { RenderedTemplateResult, TemplateRecord } from '../../core/models/template.model';
import { statusLabel } from '../prevention/preventionShared';
import { bemStatusLabel } from '../bem/bemShared';
import { equalizationStatusLabel } from '../equalization/equalizationShared';

type PreventionProcessTemplateModalState = {
  process: PreventionProcessRecord;
  processType: 'prevention';
  templates: TemplateRecord[];
  rendered?: RenderedTemplateResult;
  loading: boolean;
  error?: string;
  info?: string;
};

type BemProcessTemplateModalState = {
  process: BemProcessRecord;
  processType: 'bem';
  templates: TemplateRecord[];
  rendered?: RenderedTemplateResult;
  loading: boolean;
  error?: string;
  info?: string;
};

type EqualizationProcessTemplateModalState = {
  process: EqualizationProcessRecord;
  processType: 'equalization';
  templates: TemplateRecord[];
  rendered?: RenderedTemplateResult;
  loading: boolean;
  error?: string;
  info?: string;
};

type TerminationProcessTemplateModalState = {
  process: TerminationHearingRecord;
  processType: 'termination_hearing';
  templates: TemplateRecord[];
  rendered?: RenderedTemplateResult;
  loading: boolean;
  error?: string;
  info?: string;
};

export type ProcessTemplateModalState =
  | PreventionProcessTemplateModalState
  | BemProcessTemplateModalState
  | EqualizationProcessTemplateModalState
  | TerminationProcessTemplateModalState;

export function processTemplateProcessLabel(processType: ProcessTemplateModalState['processType']): string {
  if (processType === 'bem') return 'BEM';
  if (processType === 'equalization') return 'Gleichstellung / GdB';
  if (processType === 'termination_hearing') return 'Kündigungsanhörung';
  return 'Prävention';
}

export function processTemplateStatusLabel(state: ProcessTemplateModalState): string {
  switch (state.processType) {
    case 'bem':
      return bemStatusLabel(state.process.status);
    case 'equalization':
      return equalizationStatusLabel(state.process.applicationStatus);
    case 'termination_hearing':
      return terminationStatusLabel(state.process.status);
    case 'prevention':
      return statusLabel(state.process.status);
  }
}

export function processTemplateStatusTag(state: ProcessTemplateModalState): string {
  const status = state.processType === 'equalization'
    ? state.process.applicationStatus
    : state.process.status;
  return `status:${status}`;
}

export function ProcessTemplateDocumentsModal({
  state,
  onClose,
  onDownload,
  processTypeLabel
}: {
  state: ProcessTemplateModalState | null;
  onClose: () => void;
  onDownload: (template: TemplateRecord) => void;
  processTypeLabel: (processType: 'prevention' | 'bem') => string;
}) {
  if (!state) return null;

  return (
    <div className="industrial-modal-backdrop" role="dialog" aria-modal="true">
      <section className="industrial-modal process-template-modal">
        <div className="industrial-panel-header compact">
          <div>
            <p className="industrial-kicker">Dokumente zur Maßnahme</p>
            <h2>{processTemplateProcessLabel(state.processType)} · {processTemplateStatusLabel(state)}</h2>
            <p>Gezeigt werden Vorlagen der passenden Maßnahmeart, die mit dem aktuellen Status verbunden sind.</p>
          </div>
          <button type="button" className="industrial-secondary-button" onClick={onClose}>Schließen</button>
        </div>

        {state.loading && <div className="industrial-empty">Vorlagen werden geladen …</div>}
        {state.error && <div className="industrial-message industrial-message-warning">{state.error}</div>}
        {state.info && <div className="industrial-message industrial-message-ok">{state.info}</div>}
        {state.processType === 'bem' && <div className="industrial-message industrial-message-warning">BEM-Dokumente enthalten regelmäßig Gesundheits-, Datenschutz- oder Einwilligungsinformationen. Jeder Download benötigt eine bewusste Exportbestätigung.</div>}

        {!state.loading && !state.templates.length && !state.error && (
          <div className="process-template-empty">
            <p>Für diesen Status ist noch keine Vorlage hinterlegt.</p>
            <div className="process-template-hint">
              <span>Benötigte Tags</span>
              <code>{`massnahme:${state.processType}`}</code>
              <code>{processTemplateStatusTag(state)}</code>
            </div>
            <p className="process-template-empty-note">Lege die Vorlage im Vorlagenmodul an und verbinde sie mit Maßnahmeart und Status. Danach erscheint sie hier automatisch.</p>
          </div>
        )}

        <div className="process-template-list">
          {state.templates.map((template) => (
            <article key={template.id} className="process-template-card">
              <div>
                <strong>{template.title}</strong>
                <p>{template.description}</p>
                <span>{template.legalBasis.join(', ') || 'ohne Normbezug'}</span>
              </div>
              <button type="button" className="industrial-button" onClick={() => onDownload(template)}><Download className="h-4 w-4" />Download</button>
            </article>
          ))}
        </div>

        {state.rendered && (
          <div className="industrial-subpanel mt-4">
            <h4>Zuletzt erzeugt</h4>
            {state.rendered.unresolvedPlaceholders.length > 0 && <div className="industrial-message industrial-message-warning mb-3">Offene Platzhalter: {state.rendered.unresolvedPlaceholders.join(', ')}</div>}
            <p className="industrial-meta"><strong>Betreff:</strong> {state.rendered.subject}</p>
            <textarea className="industrial-output-area" value={state.rendered.body} readOnly />
          </div>
        )}
      </section>
    </div>
  );
}
