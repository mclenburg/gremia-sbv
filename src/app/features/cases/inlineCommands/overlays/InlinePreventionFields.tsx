import type { InlinePreventionDraft } from "../inlineCommandTypes";
import { FieldCaption, type Setter } from "./inlineCommandOverlayShared";

type FieldsProps = {
  inlinePreventionDraft: InlinePreventionDraft;
  setInlinePreventionDraft: Setter<InlinePreventionDraft>;
};

function PrimaryPreventionFields({ inlinePreventionDraft, setInlinePreventionDraft }: FieldsProps) {
  return (
    <>
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlinePreventionDraft} field="title">
          Titel
        </FieldCaption>
        <input
          value={inlinePreventionDraft.title}
          onChange={(event) =>
            setInlinePreventionDraft((current) =>
              current
                ? { ...current, title: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Arbeitsplatzgefährdung frühzeitig klären" className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption
          draft={inlinePreventionDraft}
          field="hazardDescription"
        >
          Gefährdung / Kurznotiz
        </FieldCaption>
        <input
          value={inlinePreventionDraft.hazardDescription}
          onChange={(event) =>
            setInlinePreventionDraft((current) =>
              current
                ? { ...current, hazardDescription: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Konflikt mit Führungskraft, Überlastung, Kündigungsrisiko" className="industrial-input" />
      </label>
      <label className="industrial-field">
        <FieldCaption
          draft={inlinePreventionDraft}
          field="difficultyType"
        >
          Schwierigkeit
        </FieldCaption>
        <select className="industrial-select"
          value={inlinePreventionDraft.difficultyType}
          onChange={(event) =>
            setInlinePreventionDraft((current) =>
              current
                ? {
                    ...current,
                    difficultyType: event.target
                      .value as InlinePreventionDraft["difficultyType"],
                  }
                : current,
            )
          }
        >
          <option value="personenbedingt">personenbedingt</option>
          <option value="verhaltensbedingt">verhaltensbedingt</option>
          <option value="betriebsbedingt">betriebsbedingt</option>
          <option value="organisatorisch">organisatorisch</option>
          <option value="gesundheitlich_arbeitsplatzbezogen">
            gesundheitlich/arbeitsplatzbezogen
          </option>
          <option value="konflikt_fuehrung">Konflikt Führung</option>
          <option value="sonstiges">Sonstiges</option>
        </select>
      </label>
    </>
  );
}

function FollowUpPreventionFields({ inlinePreventionDraft, setInlinePreventionDraft }: FieldsProps) {
  return (
    <>
      <label className="industrial-field">
        <span className="industrial-field-label">Risiko</span>
        <select className="industrial-select"
          value={inlinePreventionDraft.riskType}
          onChange={(event) =>
            setInlinePreventionDraft((current) =>
              current
                ? {
                    ...current,
                    riskType: event.target
                      .value as InlinePreventionDraft["riskType"],
                  }
                : current,
            )
          }
        >
          <option value="arbeitsplatzverlust">
            Arbeitsplatzverlust
          </option>
          <option value="kuendigung">Kündigung</option>
          <option value="abmahnung">Abmahnung</option>
          <option value="umsetzung">Umsetzung</option>
          <option value="arbeitsunfaehigkeit">
            Arbeitsunfähigkeit
          </option>
          <option value="ueberlastung">Überlastung</option>
          <option value="leistungsverlust">Leistungsverlust</option>
          <option value="sonstiges">Sonstiges</option>
        </select>
      </label>
      <label className="industrial-field">
        <span className="industrial-field-label">Arbeitgeberantwort optional</span>
        <input
          type="datetime-local"
          value={inlinePreventionDraft.employerResponseDueAt}
          onChange={(event) =>
            setInlinePreventionDraft((current) =>
              current
                ? {
                    ...current,
                    employerResponseDueAt: event.target.value,
                  }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlinePreventionDraft} field="nextStep">
          Nächster Schritt
        </FieldCaption>
        <input
          value={inlinePreventionDraft.nextStep}
          onChange={(event) =>
            setInlinePreventionDraft((current) =>
              current
                ? { ...current, nextStep: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
    </>
  );
}

export function InlinePreventionFields(props: FieldsProps) {
  return (
    <div className="industrial-modal-grid">
      <PrimaryPreventionFields {...props} />
      <FollowUpPreventionFields {...props} />
    </div>
  );
}
