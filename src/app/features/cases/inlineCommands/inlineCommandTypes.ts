import type { ContactCategory } from "../../../core/models/contact.model";
import type { DeadlineSeverity } from "../../../core/models/deadline.model";
import type {
   ConfidentialCommandLevel,
   RiskLevelCommand,
   TextCommandToken,
} from "@services/textCommandPolicy";

export type ProtocolTextTarget = "content" | "nextSteps";

export type InlineDeadlineDraft = {
  target: ProtocolTextTarget;
  token: TextCommandToken;
  title: string;
  dueAt: string;
  severity: DeadlineSeverity;
  legalBasis: string;
  description: string;
  markerIndex: number | null;
};

export type InlineContactDraft = {
  target: ProtocolTextTarget;
  token: TextCommandToken;
  markerIndex: number;
  query: string;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
  category: ContactCategory;
  email: string;
  phone: string;
};

export type InlineCaseLinkDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  query: string;
};
export type InlineLegalNormDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  query: string;
};
export type InlineRiskDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  level: RiskLevelCommand;
  text: string;
};
export type InlineOpenTaskDraft = {
  target: ProtocolTextTarget;
  markerIndex: number | null;
  token: TextCommandToken;
  title: string;
  description: string;
  severity: DeadlineSeverity;
};
export type InlineConfidentialityDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  level: ConfidentialCommandLevel;
};
export type InlineAnonymizationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  label: string;
};
export type InlineBemDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  triggerDescription: string;
  triggerType:
    | "sechs_wochen_au"
    | "wiederholt_au"
    | "praeventiv"
    | "arbeitgeberangebot"
    | "sbv_anregung"
    | "sonstiges";
  responseDueAt: string;
  nextStep: string;
};
export type InlinePreventionDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  hazardDescription: string;
  difficultyType:
    | "personenbedingt"
    | "verhaltensbedingt"
    | "betriebsbedingt"
    | "organisatorisch"
    | "gesundheitlich_arbeitsplatzbezogen"
    | "konflikt_fuehrung"
    | "sonstiges";
  riskType:
    | "abmahnung"
    | "kuendigung"
    | "umsetzung"
    | "arbeitsunfaehigkeit"
    | "ueberlastung"
    | "leistungsverlust"
    | "arbeitsplatzverlust"
    | "sonstiges";
  employerResponseDueAt: string;
  nextStep: string;
};
export type InlineEqualizationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  status:
    | "beratung"
    | "vorbereitung"
    | "eingereicht"
    | "nachfrage"
    | "bewilligt"
    | "abgelehnt"
    | "widerspruch"
    | "abgeschlossen";
  note: string;
  objectionDueAt: string;
  nextStep: string;
};
export type InlineTerminationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  terminationType:
    | "ordentlich"
    | "ausserordentlich"
    | "aenderungskuendigung"
    | "verdachtskuendigung"
    | "personenbedingt"
    | "verhaltensbedingt"
    | "betriebsbedingt"
    | "sonstiges";
  protectionStatus:
    | "schwerbehindert"
    | "gleichgestellt"
    | "antrag_laeuft"
    | "unklar"
    | "nicht_bekannt";
  receivedAt: string;
  sbvStatementDueAt: string;
  employerReason: string;
  nextStep: string;
};

export type InlineParticipationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  employerMeasure: string;
  riskLevel: "normal" | "erhoeht" | "kritisch";
  statementDueAt: string;
  nextStep: string;
};
export type InlineWorkplaceAccommodationDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  commandText?: string;
  prefilledFields?: string[];
  title: string;
  requestedAdjustment: string;
  category:
    | "arbeitsplatz"
    | "arbeitsumfeld"
    | "arbeitsorganisation"
    | "arbeitszeit"
    | "arbeitsort"
    | "technische_arbeitshilfe"
    | "software_barrierefreiheit"
    | "qualifizierung"
    | "aufgabenanpassung"
    | "sonstiges";
  riskLevel: "normal" | "erhoeht" | "kritisch";
  implementationDueAt: string;
  nextStep: string;
};
export type InlineTemplateDraft = {
  target: ProtocolTextTarget;
  markerIndex: number;
  token: TextCommandToken;
  query: string;
};
