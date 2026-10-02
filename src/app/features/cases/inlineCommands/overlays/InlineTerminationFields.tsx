import type { InlineTerminationDraft } from "../inlineCommandTypes";
import { FieldCaption, type Setter } from "./inlineCommandOverlayShared";

type FieldsProps = {
  inlineTerminationDraft: InlineTerminationDraft;
  setInlineTerminationDraft: Setter<InlineTerminationDraft>;
};

function TerminationBasicsFields({ inlineTerminationDraft, setInlineTerminationDraft }: FieldsProps) {
  return (
    <>
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlineTerminationDraft} field="title">
          Titel
        </FieldCaption>
        <input
          value={inlineTerminationDraft.title}
          onChange={(event) =>
            setInlineTerminationDraft((current) =>
              current
                ? { ...current, title: event.target.value }
                : current,
            )
          }
          placeholder="z. B. Anhörung zur ordentlichen Kündigung" className="industrial-input" />
      </label>
      <label className="industrial-field">
        <FieldCaption
          draft={inlineTerminationDraft}
          field="terminationType"
        >
          Kündigungsart
        </FieldCaption>
        <select className="industrial-select"
          value={inlineTerminationDraft.terminationType}
          onChange={(event) =>
            setInlineTerminationDraft((current) =>
              current
                ? {
                    ...current,
                    terminationType: event.target
                      .value as InlineTerminationDraft["terminationType"],
                  }
                : current,
            )
          }
        >
          <option value="ordentlich">ordentlich</option>
          <option value="ausserordentlich">außerordentlich</option>
          <option value="aenderungskuendigung">
            Änderungskündigung
          </option>
          <option value="verdachtskuendigung">
            Verdachtskündigung
          </option>
          <option value="personenbedingt">personenbedingt</option>
          <option value="verhaltensbedingt">verhaltensbedingt</option>
          <option value="betriebsbedingt">betriebsbedingt</option>
          <option value="sonstiges">Sonstiges</option>
        </select>
      </label>
      <label className="industrial-field">
        <FieldCaption
          draft={inlineTerminationDraft}
          field="protectionStatus"
        >
          Schutzstatus
        </FieldCaption>
        <select className="industrial-select"
          value={inlineTerminationDraft.protectionStatus}
          onChange={(event) =>
            setInlineTerminationDraft((current) =>
              current
                ? {
                    ...current,
                    protectionStatus: event.target
                      .value as InlineTerminationDraft["protectionStatus"],
                  }
                : current,
            )
          }
        >
          <option value="unklar">unklar</option>
          <option value="schwerbehindert">schwerbehindert</option>
          <option value="gleichgestellt">gleichgestellt</option>
          <option value="antrag_laeuft">Antrag läuft</option>
          <option value="nicht_bekannt">nicht bekannt</option>
        </select>
      </label>
    </>
  );
}

function TerminationFollowUpFields({ inlineTerminationDraft, setInlineTerminationDraft }: FieldsProps) {
  return (
    <>
      <label className="industrial-field">
        <FieldCaption draft={inlineTerminationDraft} field="receivedAt">
          Eingang optional
        </FieldCaption>
        <input
          type="datetime-local"
          value={inlineTerminationDraft.receivedAt}
          onChange={(event) =>
            setInlineTerminationDraft((current) =>
              current
                ? { ...current, receivedAt: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label className="industrial-field">
        <span className="industrial-field-label">SBV-Frist optional</span>
        <input
          type="datetime-local"
          value={inlineTerminationDraft.sbvStatementDueAt}
          onChange={(event) =>
            setInlineTerminationDraft((current) =>
              current
                ? { ...current, sbvStatementDueAt: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption
          draft={inlineTerminationDraft}
          field="employerReason"
        >
          Arbeitgebervortrag / Kurznotiz
        </FieldCaption>
        <input
          value={inlineTerminationDraft.employerReason}
          onChange={(event) =>
            setInlineTerminationDraft((current) =>
              current
                ? { ...current, employerReason: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
      <label className="industrial-modal-wide">
        <FieldCaption draft={inlineTerminationDraft} field="nextStep">
          Nächster Schritt
        </FieldCaption>
        <input
          value={inlineTerminationDraft.nextStep}
          onChange={(event) =>
            setInlineTerminationDraft((current) =>
              current
                ? { ...current, nextStep: event.target.value }
                : current,
            )
          } className="industrial-input" />
      </label>
    </>
  );
}

export function InlineTerminationFields(props: FieldsProps) {
  return (
    <div className="industrial-modal-grid">
      <TerminationBasicsFields {...props} />
      <TerminationFollowUpFields {...props} />
    </div>
  );
}
