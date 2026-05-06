import type { CaseCategory, CaseRecord } from "../../core/models/case.model";
import type { ContactRecord, CreateContactInput } from "../../core/models/contact.model";
import type { CreateDeadlineInput } from "../../core/models/deadline.model";
import type { CaseNodeTarget } from "../../core/navigation/caseNodeTarget";

export type CasesViewProps = {
  cases: CaseRecord[];
  contacts: ContactRecord[];
  target?: CaseNodeTarget | null;
  onCreateCase: (input: {
    caseNumber: string;
    displayName: string;
    category: CaseCategory;
    summary?: string;
  }) => Promise<void>;
  onCreateDeadline: (input: CreateDeadlineInput) => Promise<void>;
  onCreateContact: (input: CreateContactInput) => Promise<ContactRecord>;
  onCasesChanged: () => Promise<void>;
  onTargetConsumed?: () => void;
};

export type CaseToast = {
  id: number;
  variant: "ok" | "warning";
  text: string;
};
