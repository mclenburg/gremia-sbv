export type WorkplaceAccommodationStatus =
  | 'entwurf'
  | 'angefragt'
  | 'in_pruefung'
  | 'unterlagen_fehlen'
  | 'arbeitgeber_lehnt_ab'
  | 'inklusionsamt_einbezogen'
  | 'bewilligt'
  | 'in_umsetzung'
  | 'wirksamkeitspruefung'
  | 'abgeschlossen'
  | 'eskaliert';

export type WorkplaceAccommodationCategory =
  | 'arbeitsplatz'
  | 'arbeitsumfeld'
  | 'arbeitsorganisation'
  | 'arbeitszeit'
  | 'arbeitsort'
  | 'technische_arbeitshilfe'
  | 'software_barrierefreiheit'
  | 'qualifizierung'
  | 'aufgabenanpassung'
  | 'sonstiges';

export type WorkplaceAccommodationRiskLevel = 'normal' | 'erhoeht' | 'kritisch';
export type WorkplaceAccommodationEmployerResponseStatus = 'offen' | 'zugesagt' | 'teilweise_zugesagt' | 'abgelehnt' | 'klaerung_noetig';
export type WorkplaceAccommodationImplementationStatus = 'nicht_begonnen' | 'geplant' | 'in_umsetzung' | 'umgesetzt' | 'nicht_umgesetzt' | 'nicht_mehr_erforderlich';

export interface WorkplaceAccommodationRecord {
  id: string;
  caseId: string;
  title: string;
  status: WorkplaceAccommodationStatus;
  category: WorkplaceAccommodationCategory;
  riskLevel: WorkplaceAccommodationRiskLevel;
  requestedAdjustment: string;
  legalBasis: string;
  barrierOrLimitation?: string;
  workplaceContext?: string;
  proposedSolution?: string;
  technicalAidNeeded: boolean;
  organizationalAdjustmentNeeded: boolean;
  workingTimeAdjustmentNeeded: boolean;
  qualificationNeeded: boolean;
  fixedWorkplaceNeeded: boolean;
  homeofficeOrMobileWorkRelevant: boolean;
  inclusionOfficeInvolved: boolean;
  rehabCarrierInvolved: boolean;
  employerResponseStatus: WorkplaceAccommodationEmployerResponseStatus;
  employerResponseAt?: string;
  implementationStatus: WorkplaceAccommodationImplementationStatus;
  implementationDueAt?: string;
  effectivenessReviewAt?: string;
  nextStep?: string;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkplaceAccommodationInput {
  caseId: string;
  title: string;
  category?: WorkplaceAccommodationCategory;
  status?: WorkplaceAccommodationStatus;
  riskLevel?: WorkplaceAccommodationRiskLevel;
  requestedAdjustment?: string;
  legalBasis?: string;
  barrierOrLimitation?: string;
  workplaceContext?: string;
  proposedSolution?: string;
  technicalAidNeeded?: boolean;
  organizationalAdjustmentNeeded?: boolean;
  workingTimeAdjustmentNeeded?: boolean;
  qualificationNeeded?: boolean;
  fixedWorkplaceNeeded?: boolean;
  homeofficeOrMobileWorkRelevant?: boolean;
  inclusionOfficeInvolved?: boolean;
  rehabCarrierInvolved?: boolean;
  employerResponseStatus?: WorkplaceAccommodationEmployerResponseStatus;
  implementationStatus?: WorkplaceAccommodationImplementationStatus;
  employerResponseAt?: string;
  implementationDueAt?: string;
  effectivenessReviewAt?: string;
  nextStep?: string;
  outcome?: string;
  createDefaultDeadlines?: boolean;
}

export interface UpdateWorkplaceAccommodationInput {
  title?: string;
  status?: WorkplaceAccommodationStatus;
  category?: WorkplaceAccommodationCategory;
  riskLevel?: WorkplaceAccommodationRiskLevel;
  requestedAdjustment?: string;
  legalBasis?: string;
  barrierOrLimitation?: string;
  workplaceContext?: string;
  proposedSolution?: string;
  technicalAidNeeded?: boolean;
  organizationalAdjustmentNeeded?: boolean;
  workingTimeAdjustmentNeeded?: boolean;
  qualificationNeeded?: boolean;
  fixedWorkplaceNeeded?: boolean;
  homeofficeOrMobileWorkRelevant?: boolean;
  inclusionOfficeInvolved?: boolean;
  rehabCarrierInvolved?: boolean;
  employerResponseStatus?: WorkplaceAccommodationEmployerResponseStatus;
  employerResponseAt?: string;
  implementationStatus?: WorkplaceAccommodationImplementationStatus;
  implementationDueAt?: string;
  effectivenessReviewAt?: string;
  nextStep?: string;
  outcome?: string;
}

export interface WorkplaceAccommodationDashboardSummary {
  open: number;
  critical: number;
  employerResponseOpen: number;
  effectivenessReviewDue: number;
}

export interface WorkplaceAccommodationWarning {
  level: 'info' | 'warning' | 'critical';
  message: string;
}

export const workplaceAccommodationStatusLabels: Record<WorkplaceAccommodationStatus, string> = {
  entwurf: 'Entwurf',
  angefragt: 'angefragt',
  in_pruefung: 'in Prüfung',
  unterlagen_fehlen: 'Unterlagen fehlen',
  arbeitgeber_lehnt_ab: 'Arbeitgeber lehnt ab',
  inklusionsamt_einbezogen: 'Inklusionsamt einbezogen',
  bewilligt: 'bewilligt',
  in_umsetzung: 'in Umsetzung',
  wirksamkeitspruefung: 'Wirksamkeitsprüfung',
  abgeschlossen: 'abgeschlossen',
  eskaliert: 'eskaliert'
};

export const workplaceAccommodationCategoryLabels: Record<WorkplaceAccommodationCategory, string> = {
  arbeitsplatz: 'Arbeitsplatz',
  arbeitsumfeld: 'Arbeitsumfeld',
  arbeitsorganisation: 'Arbeitsorganisation',
  arbeitszeit: 'Arbeitszeit',
  arbeitsort: 'Arbeitsort / mobile Arbeit',
  technische_arbeitshilfe: 'technische Arbeitshilfe',
  software_barrierefreiheit: 'Software / Barrierefreiheit',
  qualifizierung: 'Qualifizierung',
  aufgabenanpassung: 'Aufgabenanpassung',
  sonstiges: 'Sonstiges'
};
