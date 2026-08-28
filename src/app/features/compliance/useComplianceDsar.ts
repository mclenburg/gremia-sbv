import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type {
  ComplianceDocument,
  ComplianceDocumentType,
  DataSubjectAccessRequestInput,
} from "../../../domain/models/compliance.model";
import type { ProtectedPersonRecord } from "../../../domain/models/protected-person.model";
import { buildDataSubjectAccessReadiness, countPrefillRecords } from "@/domain/compliance/dataSubjectAccessPolicy";
import {
  defaultDsarInput,
  renderDsarResponseDocument,
} from "@/domain/compliance/complianceCenterService";
import { waitForBridge } from "../../core/bridge/waitForBridge";
import { loadTemplateDefaultValues } from "../../shared/templates/templateDefaults";
import type { ComplianceWorkspace } from "./complianceConstants";

type Announce = (message: string, mode?: "polite" | "assertive") => void;
export type { ComplianceWorkspace };

function mergeTemplateDefaultsIntoDsarInput(
  current: DataSubjectAccessRequestInput,
  defaults: Awaited<ReturnType<typeof loadTemplateDefaultValues>>,
): DataSubjectAccessRequestInput {
  return {
    ...current,
    responsibleEntity:
      current.responsibleEntity ||
      defaults["datenschutz.verantwortliche_stelle"] ||
      defaults["arbeitgeber.name"] ||
      defaults["unternehmen.name"],
    privacyContactRole:
      current.privacyContactRole !== "unknown"
        ? current.privacyContactRole
        : defaults["datenschutz.dsb.name"] || defaults["datenschutz.dsb.email"]
          ? "data_protection_officer"
          : defaults["datenschutz.kontakt.name"] || defaults["datenschutz.kontakt.email"]
            ? "responsible_entity"
            : "unknown",
    privacyContactName:
      current.privacyContactName ||
      defaults["datenschutz.dsb.name"] ||
      defaults["datenschutz.kontakt.name"] ||
      defaults["arbeitgeber.ansprechpartner"],
    privacyContactEmail:
      current.privacyContactEmail ||
      defaults["datenschutz.dsb.email"] ||
      defaults["datenschutz.kontakt.email"],
    handoverRecipient:
      current.handoverRecipient ||
      defaults["datenschutz.dsb.name"] ||
      defaults["datenschutz.kontakt.name"] ||
      defaults["arbeitgeber.ansprechpartner"],
  };
}

function useDsarTemplateDefaults(setDsarInput: Dispatch<SetStateAction<DataSubjectAccessRequestInput>>) {
  useEffect(() => {
    let active = true;
    loadTemplateDefaultValues()
      .then((defaults) => {
        if (active) setDsarInput((current) => mergeTemplateDefaultsIntoDsarInput(current, defaults));
      })
      .catch(() => {
        // Standardwerte sind Komfortvorbefüllung; die Art.-15-Maske bleibt manuell nutzbar.
      });
    return () => {
      active = false;
    };
  }, [setDsarInput]);
}

function useDsarPersons(announce: Announce, setMessage: (message: string) => void): ProtectedPersonRecord[] {
  const [persons, setPersons] = useState<ProtectedPersonRecord[]>([]);
  const refreshPersons = useCallback(async () => {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.persons?.list) throw new Error("Personenverzeichnis ist nicht erreichbar.");
      setPersons(await bridge.persons.list());
    } catch (error) {
      const info = error instanceof Error ? error.message : "Personenverzeichnis konnte nicht geladen werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }, [announce, setMessage]);

  useEffect(() => {
    void refreshPersons();
  }, [refreshPersons]);
  return persons;
}

function dsarPersonName(person: ProtectedPersonRecord, fallback: string): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.pseudonymLabel || fallback;
}

export function useComplianceDsar({
  announce,
  setDocument,
  setMessage,
  setSelectedType,
  setWorkspace,
}: {
  announce: Announce;
  setDocument: (document: ComplianceDocument) => void;
  setMessage: (message: string) => void;
  setSelectedType: (type: ComplianceDocumentType) => void;
  setWorkspace: (workspace: ComplianceWorkspace) => void;
}) {
  const [dsarInput, setDsarInput] = useState<DataSubjectAccessRequestInput>(
    () => defaultDsarInput(),
  );
  const persons = useDsarPersons(announce, setMessage);
  const dsarReadiness = useMemo(
    () => buildDataSubjectAccessReadiness(dsarInput),
    [dsarInput],
  );
  useDsarTemplateDefaults(setDsarInput);

  function updateDsarInput<K extends keyof DataSubjectAccessRequestInput>(
    key: K,
    value: DataSubjectAccessRequestInput[K],
  ) {
    const clearsPrefill = key === "requesterName" || key === "caseReference" || key === "subjectPersonId";
    setDsarInput((current) => ({
      ...current,
      [key]: value,
      ...(clearsPrefill ? { prefill: undefined } : {}),
    }));
  }

  function selectDsarPerson(personId: string) {
    const person = persons.find((item) => item.id === personId);
    setDsarInput((current) => ({
      ...current,
      subjectPersonId: personId || undefined,
      requesterName: person ? dsarPersonName(person, current.requesterName) : current.requesterName,
      prefill: undefined,
    }));
  }

  function renderDsar() {
    const readiness = buildDataSubjectAccessReadiness(dsarInput);
    if (!readiness.ready) {
      const info = `SBV-Zuarbeit noch nicht erzeugt: ${readiness.nextActions[0] ?? readiness.warnings[0] ?? "Bitte Prüfschritte abschließen."}`;
      setMessage(info);
      announce(info, "assertive");
      return;
    }
    const next = renderDsarResponseDocument(dsarInput);
    setSelectedType("dsar_response");
    setDocument(next);
    setWorkspace("documents");
    const info = "SBV-Zuarbeit zur Art.-15-Auskunft wurde erzeugt.";
    setMessage(info);
    announce(info, "polite");
  }

  async function prefillDsar() {
    try {
      const bridge = await waitForBridge();
      if (!bridge?.compliance?.prefillDsar) throw new Error("DSGVO-Vorbefüllung ist nicht erreichbar.");
      const prefill = await bridge.compliance.prefillDsar(dsarInput);
      const nextInput = { ...dsarInput, prefill };
      setDsarInput(nextInput);
      setSelectedType("dsar_response");
      setDocument(renderDsarResponseDocument(nextInput));
      const count = countPrefillRecords(prefill);
      const info = count > 0
        ? `SBV-Dateninventur wurde mit ${count} Datensatzbezug/Datensatzbezügen aus Gremia.SBV vorbereitet.`
        : "Art.-15-Vorbefüllung ausgeführt; es wurden keine passenden Datensatzbezüge gefunden.";
      setMessage(info);
      announce(info, "polite");
    } catch (error) {
      const info = error instanceof Error ? error.message : "DSGVO-Vorbefüllung konnte nicht ausgeführt werden.";
      setMessage(info);
      announce(info, "assertive");
    }
  }

  return {
    dsarInput,
    dsarReadiness,
    persons,
    updateDsarInput,
    selectDsarPerson,
    renderDsar,
    prefillDsar,
  };
}
