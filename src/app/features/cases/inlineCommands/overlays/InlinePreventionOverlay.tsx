import { ShieldAlert } from "lucide-react";
import type { InlineCommandOverlaysProps } from "../InlineCommandOverlays";
import type { InlinePreventionDraft } from "../inlineCommandTypes";
import { FieldCaption, IndustrialModalSurface } from "./inlineCommandOverlayShared";

type OverlayProps = Pick<InlineCommandOverlaysProps,
  "inlinePreventionDraft" | "setInlinePreventionDraft" | "createPreventionFromProtocol" | "cancelInlinePreventionDraft">;

export function InlinePreventionOverlay({ props }: { props: OverlayProps }) {
  const {
    inlinePreventionDraft,
    setInlinePreventionDraft,
    createPreventionFromProtocol,
    cancelInlinePreventionDraft,
  } = props;

  return inlinePreventionDraft ? (
    <IndustrialModalSurface className="inline-command-quick"
      labelledById="inline-prevention-title"
      onClose={cancelInlinePreventionDraft}
    >
        <div className="industrial-modal-header">
          <div className="industrial-modal-icon">
            <ShieldAlert className="industrial-icon-md" />
          </div>
          <div>
            <p className="industrial-kicker">Inline-Maßnahme</p>
            <h2 id="inline-prevention-title">Prävention vormerken</h2>
            <p>
              Merkt ein Präventionsverfahren nach § 167 Abs. 1 SGB IX für die
              aktuelle Fallakte vor. Angelegt wird es erst mit der Notiz.
            </p>
          </div>
        </div>
        <div className="industrial-modal-grid">
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
          <label>
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
          <label>
            <span>Risiko</span>
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
          <label>
            <span>Arbeitgeberantwort optional</span>
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
        </div>
        <div className="industrial-modal-preview">
          <ShieldAlert className="industrial-icon" /> Wird mit dem Speichern der Notiz als Fallaktenvorgang angelegt:{" "}
          <strong>
            {inlinePreventionDraft.title.trim() || "Präventionsverfahren"}
          </strong>
        </div>
        <div className="industrial-modal-actions">
          <button
            type="button" className="industrial-secondary-button"
            onClick={cancelInlinePreventionDraft}
          >
            Abbrechen
          </button>
          <button
            type="button" className="industrial-button"
            onClick={() => void createPreventionFromProtocol()}
          >
            Vormerken und weiterprotokollieren
          </button>
        </div>
    </IndustrialModalSurface>
  ) : null;
}
