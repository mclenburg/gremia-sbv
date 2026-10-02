import type { InlineWorkplaceAccommodationDraft } from "../inlineCommandTypes";
import { FieldCaption, type Setter } from "./inlineCommandOverlayShared";

type FieldsProps = {
  inlineWorkplaceAccommodationDraft: InlineWorkplaceAccommodationDraft;
  setInlineWorkplaceAccommodationDraft: Setter<InlineWorkplaceAccommodationDraft>;
};

function WorkplaceRequestFields({ inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft }: FieldsProps) {
  return (
    <>
      <label className="industrial-modal-wide">
        <FieldCaption
          draft={inlineWorkplaceAccommodationDraft}
          field="title"
        >
          Titel
        </FieldCaption>
        <input
          value={inlineWorkplaceAccommodationDraft.title}
          onChange={(event) =>
            setInlineWorkplaceAccommodationDraft((current) =>
              current
                ? { ...current, title: event.target.value }
                : current,
            )
          }
          placeholder="z. B. fester Arbeitsplatz / technische Arbeitshilfe" className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption
          draft={inlineWorkplaceAccommodationDraft}
          field="requestedAdjustment"
        >
          Gewünschte Gestaltung / Kurznotiz
        </FieldCaption>
        <input
          value={inlineWorkplaceAccommodationDraft.requestedAdjustment}
          onChange={(event) =>
            setInlineWorkplaceAccommodationDraft((current) =>
              current
                ? {
                    ...current,
                    requestedAdjustment: event.target.value,
                  }
                : current,
            )
          }
          placeholder="z. B. fester Arbeitsplatz wegen behinderungsbedingter Belastung" className="industrial-input" />
      </label>
      <label>
        <FieldCaption
          draft={inlineWorkplaceAccommodationDraft}
          field="category"
        >
          Kategorie
        </FieldCaption>
        <select className="industrial-select"
          value={inlineWorkplaceAccommodationDraft.category}
          onChange={(event) =>
            setInlineWorkplaceAccommodationDraft((current) =>
              current
                ? {
                    ...current,
                    category: event.target
                      .value as InlineWorkplaceAccommodationDraft["category"],
                  }
                : current,
            )
          }
        >
          <option value="arbeitsplatz">Arbeitsplatz</option>
          <option value="arbeitsumfeld">Arbeitsumfeld</option>
          <option value="arbeitsorganisation">
            Arbeitsorganisation
          </option>
          <option value="arbeitszeit">Arbeitszeit</option>
          <option value="arbeitsort">Arbeitsort / mobile Arbeit</option>
          <option value="technische_arbeitshilfe">
            technische Arbeitshilfe
          </option>
          <option value="software_barrierefreiheit">
            Software / Barrierefreiheit
          </option>
          <option value="qualifizierung">Qualifizierung</option>
          <option value="aufgabenanpassung">Aufgabenanpassung</option>
          <option value="sonstiges">Sonstiges</option>
        </select>
      </label>
    </>
  );
}

function WorkplaceFollowUpFields({ inlineWorkplaceAccommodationDraft, setInlineWorkplaceAccommodationDraft }: FieldsProps) {
  return (
    <>
      <label>
        <FieldCaption
          draft={inlineWorkplaceAccommodationDraft}
          field="riskLevel"
        >
          Risikostufe
        </FieldCaption>
        <select className="industrial-select"
          value={inlineWorkplaceAccommodationDraft.riskLevel}
          onChange={(event) =>
            setInlineWorkplaceAccommodationDraft((current) =>
              current
                ? {
                    ...current,
                    riskLevel: event.target
                      .value as InlineWorkplaceAccommodationDraft["riskLevel"],
                  }
                : current,
            )
          }
        >
          <option value="normal">normal</option>
          <option value="erhoeht">erhöht</option>
          <option value="kritisch">kritisch</option>
        </select>
      </label>
      <label>
        <span>Umsetzungs-/Wiedervorlage optional</span>
        <input
          type="datetime-local"
          value={inlineWorkplaceAccommodationDraft.implementationDueAt}
          onChange={(event) =>
            setInlineWorkplaceAccommodationDraft((current) =>
              current
                ? {
                    ...current,
                    implementationDueAt: event.target.value,
                  }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption
          draft={inlineWorkplaceAccommodationDraft}
          field="nextStep"
        >
          Nächster Schritt
        </FieldCaption>
        <input
          value={inlineWorkplaceAccommodationDraft.nextStep}
          onChange={(event) =>
            setInlineWorkplaceAccommodationDraft((current) =>
              current
                ? { ...current, nextStep: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
    </>
  );
}

export function InlineWorkplaceAccommodationFields(props: FieldsProps) {
  return (
    <div className="industrial-modal-grid">
      <WorkplaceRequestFields {...props} />
      <WorkplaceFollowUpFields {...props} />
    </div>
  );
}
