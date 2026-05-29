import { HelpCircle } from 'lucide-react';
import { IndustrialButton } from '../../shared/components/IndustrialButton';
import { IndustrialModal } from '../../shared/dialogs/IndustrialDialogs';

export function TemplateHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <IndustrialModal
      title="Platzhalter in Vorlagen"
      kicker="Hilfe"
      description="Platzhalter werden in doppelten geschweiften Klammern geschrieben. Allgemeine Werte wie SBV-Name oder Arbeitgeber-Ansprechstelle pflegst du unter Einstellungen → Vorlagen & Standardwerte."
      icon={<HelpCircle className="h-5 w-5" />}
      onClose={onClose}
      className="template-help-modal"
      actions={<IndustrialButton onClick={onClose}>Schließen</IndustrialButton>}
    >
      <div className="template-placeholder-help">
        <section>
          <h3>Allgemein</h3>
          <code>{'{{heute}}'}</code>
          <p>Aktuelles Datum.</p>
          <code>{'{{sbv.name}}'}</code>
          <p>Name oder Funktionsbezeichnung der SBV als Absender.</p>
          <code>{'{{arbeitgeber.ansprechpartner}}'}</code>
          <p>Ansprechstelle des Arbeitgebers, z. B. Personalabteilung.</p>
        </section>
        <section>
          <h3>Fallakte</h3>
          <code>{'{{fall.aktenzeichen}}'}</code>
          <p>Aktenzeichen des ausgewählten Falls.</p>
          <code>{'{{fall.name}}'}</code>
          <p>Name oder Pseudonym aus der Fallakte.</p>
          <code>{'{{fall.kurzbeschreibung}}'}</code>
          <p>Kurzbeschreibung des Falls.</p>
          <code>{'{{person.name}}'}</code>
          <p>Personenbezug aus dem Fall, soweit vorhanden.</p>
        </section>
        <section>
          <h3>Fristen und Normen</h3>
          <code>{'{{frist.datum}}'}</code>
          <p>Datum, das beim Erzeugen des Schreibens eingetragen wurde.</p>
          <code>{'{{normen}}'}</code>
          <p>Normbezüge der Vorlage oder des Vorgangs.</p>
        </section>
        <section>
          <h3>Präventionsverfahren</h3>
          <code>{'{{praevention.status}}'}</code>
          <p>Aktueller Status der Maßnahme.</p>
          <code>{'{{praevention.gefaehrdung}}'}</code>
          <p>Dokumentierte Gefährdung oder Ausgangslage.</p>
          <code>{'{{praevention.arbeitgeberfrist}}'}</code>
          <p>Frist zur Arbeitgeberreaktion.</p>
          <code>{'{{praevention.massnahmen}}'}</code>
          <p>Geplante oder dokumentierte Maßnahmen.</p>
        </section>
      </div>
      <div className="template-help-example">
        <h3>Beispiel</h3>
        <pre>{'Bitte stellen Sie mir die Unterlagen zur Fallakte {{fall.aktenzeichen}} bis zum {{frist.datum}} zur Verfügung.'}</pre>
      </div>
    </IndustrialModal>
  );
}
