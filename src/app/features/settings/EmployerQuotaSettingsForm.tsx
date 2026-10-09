import { useEffect, useState, type FormEvent } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export function EmployerQuotaSettingsForm() {
  const [workplaces, setWorkplaces] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const bridge = await waitForBridge();
        if (!bridge?.employerQuota) throw new Error('Einstellungen sind nicht verfügbar.');
        const settings = await bridge.employerQuota.getSettings();
        if (active) setWorkplaces(settings.chargeableWorkplaces === null ? '' : String(settings.chargeableWorkplaces));
      } catch {
        if (active) {
          setLoadFailed(true);
          setError('Die Zahl der maßgeblichen Arbeitsplätze konnte nicht geladen werden. Bitte Einstellungen erneut öffnen.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadFailed) return;
    setError('');
    setMessage('');
    const trimmed = workplaces.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(value))) {
      setError('Bitte eine ganze, nicht negative Zahl für die maßgeblichen Arbeitsplätze eingeben.');
      return;
    }
    setSaving(true);
    try {
      const bridge = await waitForBridge();
      if (!bridge?.employerQuota) throw new Error('Einstellungen sind nicht verfügbar.');
      const saved = await bridge.employerQuota.saveSettings({ chargeableWorkplaces: value });
      setWorkplaces(saved.chargeableWorkplaces === null ? '' : String(saved.chargeableWorkplaces));
      setMessage(saved.chargeableWorkplaces === null
        ? 'Angabe entfernt. Die Beschäftigungsquoten-Kachel bleibt ausgeblendet.'
        : 'Maßgebliche Arbeitsplätze wurden gespeichert.');
    } catch {
      setError('Die Zahl der maßgeblichen Arbeitsplätze konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="industrial-settings-form settings-section-narrow">
      <div>
        <h3>Unternehmensgröße</h3>
        <p className="industrial-settings-note">Maßgebliche Arbeitsplätze nach §§ 156–157 SGB IX angeben. Ausbildungsplätze und weitere gesetzliche Ausnahmen zählen dabei nicht mit. Die Personenliste zeigt daraus eine aktuelle Orientierung zur Beschäftigungspflicht.</p>
      </div>
      <label htmlFor="employer-chargeable-workplaces">
        <span>Maßgebliche Arbeitsplätze</span>
      </label>
      <input
        id="employer-chargeable-workplaces"
        className="industrial-input"
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={workplaces}
        onChange={(event) => setWorkplaces(event.currentTarget.value)}
        disabled={loading || saving || loadFailed}
      />
      <p className="industrial-settings-note">Feld leeren und speichern, um die Kachel in der Personenliste auszublenden.</p>
      {error && <div className="industrial-message industrial-message-warning" role="alert">{error}</div>}
      {message && <div className="industrial-message industrial-message-ok" role="status">{message}</div>}
      <button type="submit" className="industrial-button" disabled={loading || saving || loadFailed}>{saving ? 'Speichert …' : 'Unternehmensgröße speichern'}</button>
    </form>
  );
}
