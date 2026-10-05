import { waitForBridge } from "../../core/bridge/waitForBridge";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { PersonBindingState } from "../../../domain/models/case.model";
import type { ProtectedPersonRecord } from "../../../domain/models/protected-person.model";
import type { CasesViewProps } from "./casesViewTypes";
import type { useAnnouncer } from "../../shared/a11y/LiveRegionProvider";

export type CaseCreationActionDeps = {
  setError: Dispatch<SetStateAction<string>>;
  setIsCaseCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  caseNumber: string;
  displayName: string;
  category: Parameters<CasesViewProps["onCreateCase"]>[0]["category"];
  summary: string;
  selectedProtectedPersonId: string;
  protectedPersons: ProtectedPersonRecord[];
  onCreateCase: CasesViewProps["onCreateCase"];
  onCasesChanged: CasesViewProps["onCasesChanged"];
  setCaseNumber: Dispatch<SetStateAction<string>>;
  setDisplayName: Dispatch<SetStateAction<string>>;
  setSummary: Dispatch<SetStateAction<string>>;
  setSelectedProtectedPersonId: Dispatch<SetStateAction<string>>;
  announce: ReturnType<typeof useAnnouncer>;
};

export function createCaseCreationActions(deps: CaseCreationActionDeps) {
  const { setError, setIsCaseCreateModalOpen, caseNumber, displayName, category, summary, selectedProtectedPersonId, protectedPersons, onCreateCase, onCasesChanged, setCaseNumber, setDisplayName, setSummary, setSelectedProtectedPersonId, announce } = deps;
  function openCaseCreateModal() {
    setError("");
    setIsCaseCreateModalOpen(true);
  }

  function cancelCaseCreateModal() {
    setIsCaseCreateModalOpen(false);
    setError("");
  }

  async function createCaseFromModal(mode: "identified" | "anonymous") {
    setError("");
    if (!caseNumber.trim()) {
      setError("Bitte ein Aktenzeichen erfassen.");
      return;
    }
    if (mode === "identified" && !selectedProtectedPersonId) {
      setError("Bitte zuerst eine Person auswählen oder den Sonderweg ohne Personenbezug nutzen.");
      return;
    }

    try {
      let protectedPersonId = selectedProtectedPersonId;
      let bindingState: PersonBindingState = "active";
      let nextDisplayName = displayName.trim();
      if (mode === "anonymous") {
        const bridge = await waitForBridge();
        if (!bridge?.persons) throw new Error("Personendienst ist nicht erreichbar.");
        const anonymousPerson = await bridge.persons.createAnonymousRequest();
        protectedPersonId = anonymousPerson.id;
        bindingState = "anonymous_request";
        nextDisplayName = displayName.trim() || anonymousPerson.pseudonymLabel || "Anonyme Beratung";
      } else if (!nextDisplayName) {
        const person = protectedPersons.find((entry) => entry.id === selectedProtectedPersonId);
        nextDisplayName = person?.pseudonymLabel || [person?.lastName, person?.firstName].filter(Boolean).join(", ") || "Personenbezogene Fallakte";
      }
      await onCreateCase({
        caseNumber: caseNumber.trim(),
        displayName: nextDisplayName,
        category,
        summary: summary.trim() || undefined,
        protectedPersonId,
        personBindingState: bindingState,
        isPseudonymized: bindingState === "anonymous_request",
      });
      announce(bindingState === "anonymous_request" ? "Anonyme Anfrage wurde angelegt." : "Fallakte wurde mit Person verknüpft.");
      setCaseNumber("");
      setDisplayName("");
      setSummary("");
      setSelectedProtectedPersonId("");
      setIsCaseCreateModalOpen(false);
      await onCasesChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Fall konnte nicht angelegt werden.");
    }
  }

  async function addCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createCaseFromModal("identified");
  }

  async function addAnonymousCase() {
    await createCaseFromModal("anonymous");
  }

  return { openCaseCreateModal, cancelCaseCreateModal, addCase, addAnonymousCase };
}
