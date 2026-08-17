import type { CaseAnonymizationMode } from '../../../domain/models/privacy-review.model';

export function CaseAnonymizationModeFieldset({ value, onChange, name }: { value: CaseAnonymizationMode; onChange: (value: CaseAnonymizationMode) => void; name: string; }) {
  return <fieldset className="case-privacy-action-fieldset">
    <legend>Freitexte anonymisieren</legend>
    <div className="case-privacy-action-options">
      <label className={`case-privacy-action-option ${value === 'marked_free_text' ? 'is-selected' : ''}`}>
        <input className="case-privacy-action-radio" type="radio" name={name} checked={value === 'marked_free_text'} onChange={() => onChange('marked_free_text')} />
        <span><strong>Nur vorgemerkte Stellen</strong><small>Nur mit der Anonymisierungsvormerkung gekennzeichnete Freitextstellen werden ersetzt. Beteiligtenfelder und Personen-/Kontaktverknüpfungen werden unabhängig davon vollständig entfernt.</small></span>
      </label>
      <label className={`case-privacy-action-option ${value === 'replace_all_free_text' ? 'is-selected' : ''}`}>
        <input className="case-privacy-action-radio" type="radio" name={name} checked={value === 'replace_all_free_text'} onChange={() => onChange('replace_all_free_text')} />
        <span><strong>Alle Freitexte vollständig ersetzen</strong><small>Alle erfassten Freitexte werden durch den Anonymisierungshinweis und anschließend Lorem ipsum ersetzt. Hochgeladene Dokumente werden in beiden Varianten gelöscht.</small></span>
      </label>
    </div>
    {value === 'marked_free_text' ? <p className="industrial-message industrial-message-warning" role="note"><strong>Achtung:</strong> Nicht vorgemerkte Namen, Personalnummern, Kontaktdaten oder andere personenbezogene Angaben in Freitexten bleiben erhalten und müssen anschließend manuell geprüft werden.</p> : null}
  </fieldset>;
}
