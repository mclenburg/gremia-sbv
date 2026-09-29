import type { GremiaBrOwnTaskDetail, GremiaBrTaskTransitionOptions } from '../../../domain/models/gremia-br.model';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { SearchableSelectInput } from '../../shared/components/IndustrialForm';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';
import { GREMIA_BR_TASK_STATUS_LABELS } from './gremiaBrTaskPresentation';

export function GremiaBrTaskDetailDialog({
  title, detail, busy, error, status, transitionOptions, selectedTransition,
  optionsBusy, transitionBusy, onLoadTransitions, onSelectTransition,
  onSubmitTransition, onReloadDetail, onClose,
}: {
  title: string;
  detail: GremiaBrOwnTaskDetail | null;
  busy: boolean;
  error: string;
  status: string;
  transitionOptions: GremiaBrTaskTransitionOptions | null;
  selectedTransition: string;
  optionsBusy: boolean;
  transitionBusy: boolean;
  onLoadTransitions: () => void;
  onSelectTransition: (status: string) => void;
  onSubmitTransition: () => void;
  onReloadDetail: () => void;
  onClose: () => void;
}) {
  const selectedStatus = transitionOptions?.allowed.find((value) => value === selectedTransition);
  return (
    <IndustrialModal
      title={detail?.title ?? title}
      kicker="Gremia.BR-Aufgabe"
      onClose={transitionBusy ? undefined : onClose}
      closeOnEscape={!transitionBusy}
      actions={
        <>
          <IndustrialButton variant="secondary" onClick={onReloadDetail} disabled={busy || optionsBusy || transitionBusy}>Details neu laden</IndustrialButton>
          <IndustrialButton variant="secondary" onClick={onClose} disabled={transitionBusy}>Schließen</IndustrialButton>
        </>
      }
    >
      {busy ? <p role="status">Aufgabendetails werden geladen.</p> : null}
      {error ? <p className="industrial-message industrial-message-warning" role="alert">{error}</p> : null}
      {status ? <p className="industrial-message industrial-message-success" role="status">{status}</p> : null}
      {detail ? (
        <>
          <dl className="industrial-meta-grid">
            <div><dt>Status</dt><dd>{GREMIA_BR_TASK_STATUS_LABELS[detail.status]}</dd></div>
            {detail.dueAt ? <div><dt>Fällig</dt><dd>{new Date(detail.dueAt).toLocaleString('de-DE')}</dd></div> : null}
          </dl>
          {detail.description ? <p>{detail.description}</p> : null}
          <div className="industrial-action-row">
            <IndustrialButton variant="secondary" onClick={onLoadTransitions} loading={optionsBusy} disabled={transitionBusy}>
              Statusänderungen abrufen
            </IndustrialButton>
          </div>
          {transitionOptions?.allowed.length === 0 ? <p className="industrial-meta">Keine Statusänderung möglich.</p> : null}
          {transitionOptions && transitionOptions.allowed.length > 0 ? (
            <div className="industrial-form-grid">
              <SearchableSelectInput
                label="Neuer Status"
                value={selectedTransition}
                options={transitionOptions.allowed.map((value) => ({ value, label: GREMIA_BR_TASK_STATUS_LABELS[value] }))}
                onValueChange={onSelectTransition}
                disabled={transitionBusy}
              />
              <IndustrialButton onClick={onSubmitTransition} loading={transitionBusy} disabled={!selectedStatus}>
                {selectedStatus
                  ? `Status zu ${GREMIA_BR_TASK_STATUS_LABELS[selectedStatus]} ändern`
                  : 'Status wählen'}
              </IndustrialButton>
            </div>
          ) : null}
        </>
      ) : null}
    </IndustrialModal>
  );
}
