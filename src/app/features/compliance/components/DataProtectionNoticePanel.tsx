import { useEffect, useRef, useState } from 'react';
import type { DataProtectionNoticeInput } from '../../../../domain/models/compliance.model';
import { dataProtectionNoticeDefaults, renderDataProtectionNotice, validateDataProtectionNotice } from '../../../../domain/compliance/dataProtectionNotice';
import { EMPTY_TEMPLATE_DEFAULT_VALUES } from '../../../../domain/models/template-default.model';
import { loadTemplateDefaultValues } from '../../../shared/templates/templateDefaults';
import { DateInput, FormSection, TextareaInput, TextInput } from '../../../shared/components/IndustrialForm';
import { ButtonGroup, IndustrialButton, ToolbarButton } from '../../../shared/components/IndustrialButton';
import { CompliancePreviewBody } from './ComplianceDocumentPreview';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type { RetentionSettings } from '../../../../domain/models/retention.model';

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DataProtectionNoticePanel({ onExport }: { onExport: (input: DataProtectionNoticeInput, open: boolean) => Promise<void> | void }) {
  const [input, setInput] = useState<DataProtectionNoticeInput>(() => dataProtectionNoticeDefaults(EMPTY_TEMPLATE_DEFAULT_VALUES, today()));
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const editedFields = useRef(new Set<keyof DataProtectionNoticeInput>());

  useEffect(() => {
    let active = true;
    async function loadSettings(): Promise<RetentionSettings | undefined> {
      const bridge = await waitForBridge();
      return bridge?.retention?.getSettings();
    }
    Promise.allSettled([loadTemplateDefaultValues(), loadSettings()]).then(([defaultsResult, retentionResult]) => {
      if (!active) return;
      const defaults = defaultsResult.status === 'fulfilled' ? defaultsResult.value : EMPTY_TEMPLATE_DEFAULT_VALUES;
      const retention = retentionResult.status === 'fulfilled' ? retentionResult.value : undefined;
      const suggested = dataProtectionNoticeDefaults(defaults, today(), retention);
      setInput((current) => {
        const next = { ...current };
        for (const key of Object.keys(suggested) as Array<keyof DataProtectionNoticeInput>) {
          if (!editedFields.current.has(key)) next[key] = suggested[key];
        }
        return next;
      });
      if (defaultsResult.status === 'rejected') setLoadError('Gespeicherte Organisationsangaben konnten nicht geladen werden. Bitte fehlende Kontakte ergänzen.');
      else if (retentionResult.status === 'rejected' || !retention) setLoadError('Eingestellte Prüffristen konnten nicht geladen werden. Das Schreiben verwendet allgemeine Aufbewahrungskriterien.');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function update(key: keyof DataProtectionNoticeInput, value: string) {
    editedFields.current.add(key);
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function exportNotice(open: boolean) {
    if (busy || loading) return;
    setAttempted(true);
    if (validateDataProtectionNotice(input).length) return;
    setBusy(true);
    try {
      await onExport(input, open);
    } finally {
      setBusy(false);
    }
  }

  const missing = validateDataProtectionNotice(input);
  const preview = missing.length === 0 ? renderDataProtectionNotice(input) : '';

  return (
    <section className="industrial-panel compliance-preview" aria-label="Datenschutzinformation erstellen" aria-busy={busy}>
      <div className="industrial-panel-header compact">
        <div>
          <p className="industrial-kicker">Schreiben an betroffene Personen</p>
          <h2>Datenschutzinformation nach Art. 13 und 14 DSGVO</h2>
        </div>
      </div>
      {loading && <p role="status">Gespeicherte Angaben und Prüffristen werden geladen.</p>}
      {loadError && <p role="status">{loadError}</p>}
      <FormSection title="Absender und Kontakte" ariaLabel="Absender und Kontakte">
        <div className="industrial-form-grid">
          <TextInput label="Verantwortliche Stelle" value={input.responsibleEntity} onValueChange={(value) => update('responsibleEntity', value)} required />
          <TextInput label="Kontakt der verantwortlichen Stelle" value={input.responsibleContact} onValueChange={(value) => update('responsibleContact', value)} required />
          <TextInput label="Kontakt der Schwerbehindertenvertretung" value={input.sbvContact} onValueChange={(value) => update('sbvContact', value)} required />
          <TextInput label="Datenschutzbeauftragte oder Datenschutzbeauftragter" value={input.privacyOfficerContact} onValueChange={(value) => update('privacyOfficerContact', value)} />
          <DateInput label="Datum" value={input.issueDate} onValueChange={(value) => update('issueDate', value)} required />
        </div>
      </FormSection>
      <details className="industrial-subpanel">
        <summary>Automatisch ergänzte Verarbeitungsangaben prüfen oder bearbeiten</summary>
        <div className="industrial-form-grid">
          <TextareaInput label="Rechtsgrundlagen" value={input.legalBasis} onValueChange={(value) => update('legalBasis', value)} required wide />
          <TextareaInput label="Herkunft der Daten" value={input.dataSources} onValueChange={(value) => update('dataSources', value)} required wide />
          <TextareaInput label="Empfänger oder Empfängerkategorien" value={input.recipients} onValueChange={(value) => update('recipients', value)} required wide />
          <TextareaInput label="Speicherdauer oder Kriterien" value={input.retention} onValueChange={(value) => update('retention', value)} required wide />
        </div>
      </details>
      <FormSection title="Betriebliche Angaben" ariaLabel="Betriebliche Angaben">
        <div className="industrial-form-grid">
          <TextInput label="Zuständige Datenschutzaufsichtsbehörde" value={input.supervisoryAuthority} onValueChange={(value) => update('supervisoryAuthority', value)} required wide />
          <TextareaInput label="Drittlandübermittlung" value={input.thirdCountryTransfers} onValueChange={(value) => update('thirdCountryTransfers', value)} required wide />
        </div>
      </FormSection>
      {attempted && missing.length > 0 && <p role="alert">Vor der PDF-Erzeugung ergänzen: {missing.join(', ')}.</p>}
      <ButtonGroup ariaLabel="Datenschutzinformation als PDF">
        <ToolbarButton disabled={busy || loading} onClick={() => void exportNotice(false)}>PDF erzeugen</ToolbarButton>
        <IndustrialButton disabled={busy || loading} onClick={() => void exportNotice(true)}>PDF zum Drucken öffnen</IndustrialButton>
      </ButtonGroup>
      {preview && <CompliancePreviewBody body={preview} />}
    </section>
  );
}
