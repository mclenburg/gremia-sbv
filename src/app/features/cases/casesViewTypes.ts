import type { CaseCategory, CaseRecord, PersonBindingState } from "../../core/models/case.model";
import type { ProtectedPersonRecord } from "../../core/models/protected-person.model";
import type { ContactRecord, CreateContactInput } from "../../core/models/contact.model";
import type { CreateDeadlineInput } from "../../core/models/deadline.model";
import type { CaseNodeTarget } from "../../core/navigation/caseNodeTarget";
import type { SbvParticipationViolationPrefill } from "../participation-violations/sbvParticipationViolationViewLogic";

export type CasesViewProps = {
  cases: CaseRecord[];
  contacts: ContactRecord[];
  protectedPersons: ProtectedPersonRecord[];
  target?: CaseNodeTarget | null;
  onCreateCase: (input: {
    caseNumber: string;
    displayName: string;
    category: CaseCategory;
    summary?: string;
    protectedPersonId?: string;
    personBindingState?: PersonBindingState;
    isPseudonymized?: boolean;
  }) => Promise<void>;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onCasesChanged: () => Promise<void>;
  onTargetConsumed?: () => void;
  onOpenParticipationViolationPrefill?: (prefill: SbvParticipationViolationPrefill) => void;
};

export type CaseToast = {
  id: number;
  variant: "ok" | "warning";
  text: string;
};
