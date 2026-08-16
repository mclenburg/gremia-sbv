import { useEffect, useRef } from 'react';

export type ElectionHelpTopic =
  | 'setup'
  | 'body'
  | 'voters'
  | 'nominations'
  | 'documents'
  | 'ballots'
  | 'mail'
  | 'counting'
  | 'acceptance'
  | 'archive';

const CONTENT: Record<ElectionHelpTopic, { title: string; body: string }> = {
  setup: {
    title: 'Wahleinleitung',
    body: 'Mindestschwelle, Wahlgrund, Wahlzeitraum und Verfahrensvorschlag werden nach dem gespeicherten Rechtsregelstand geprüft. Die Entscheidung über das Verfahren trifft das Wahlorgan.',
  },
  body: {
    title: 'Wahlorgan',
    body: 'Förmliches Verfahren: Wahlvorstand nach §§ 1 ff. SchwbVWO. Vereinfachtes Verfahren: Wahlversammlung und Wahlleitung nach §§ 18 ff. SchwbVWO. Nachwahlen bleiben verfahrensbezogen.',
  },
  voters: {
    title: 'Wählerliste',
    body: 'Nur bereits schwerbehinderte oder bereits gleichgestellte Beschäftigte werden als wahlberechtigt bestätigt. Offene Gleichstellungsanträge zählen nicht.',
  },
  nominations: {
    title: 'Kandidaturen und Wahlvorschläge',
    body: 'Wählbarkeitskriterien werden als Prüfhilfe dokumentiert. Die finale Entscheidung bleibt beim Wahlorgan. Im förmlichen Verfahren werden Stützunterschriften und Korrektur-/Nachfristen geführt.',
  },
  documents: {
    title: 'Vorbereitende Dokumente',
    body: 'Vorbereitende PDF-Dokumente werden verschlüsselt abgelegt. Wahlausschreiben enthält die vorgesehenen Pflichtangaben; Rechtsregel- und Templateversion bleiben am Dokument nachvollziehbar.',
  },
  ballots: {
    title: 'Stimmzettel und Wahltag',
    body: 'Die Wahlgänge für Vertrauensperson und Stellvertretung bleiben strikt getrennt. Gremia.SBV erzeugt Stimmzettel und dokumentiert Wahltag-Checkpunkte, speichert aber niemals eine individuelle Stimmabgabe.',
  },
  mail: {
    title: 'Briefwahl',
    body: 'Dokumentiert werden nur Ausgabe, Eingang, Erklärung, Übergabe an die Urne und die Behandlung verspäteter Wahlbriefe. Der Inhalt des Stimmzettels wird nicht gespeichert.',
  },
  counting: {
    title: 'Auszählung und Losentscheid',
    body: 'Erfasst werden ausschließlich aggregierte Stimmenzahlen. Bei entscheidender Stimmengleichheit fordert die Anwendung die Dokumentation eines realen Losentscheids; sie führt niemals selbst einen Zufallsentscheid aus.',
  },
  acceptance: {
    title: 'Benachrichtigung und Annahme',
    body: 'Gewählte Personen werden dokumentiert benachrichtigt. Ablehnung oder Ablauf der Annahmefrist werden festgehalten; bei Ablehnung wird der nächste Rang als Nachrückfall vorbereitet.',
  },
  archive: {
    title: 'Bekanntmachung, Wahlakte und Übergabe',
    body: 'Der Abschluss führt Bekanntmachung, Arbeitgeber-/BR-Mitteilung, Aufbewahrung, Legal Hold, menschenlesbare PDF-Wahlakte und geschützten Instanztransfer zusammen. Digitale Exporte ersetzen physische Originale nicht.',
  },
};

export function ElectionHelpDialog({
  topic,
  onClose,
  returnFocus,
}: {
  topic: ElectionHelpTopic;
  onClose: () => void;
  returnFocus: HTMLElement | null;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    return () => returnFocus?.focus();
  }, [returnFocus]);
  const content = CONTENT[topic];
  return (
    <div className="industrial-modal-backdrop" role="presentation">
      <div className="industrial-modal" role="dialog" aria-modal="true" aria-labelledby="election-help-title">
        <div className="industrial-panel-header">
          <h2 id="election-help-title">{content.title}</h2>
          <button ref={close} type="button" className="industrial-secondary-button" onClick={onClose}>
            Schließen
          </button>
        </div>
        <p>{content.body}</p>
      </div>
    </div>
  );
}
