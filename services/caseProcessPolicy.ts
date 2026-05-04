export type CaseProcessType = 'prevention' | 'bem' | 'termination_hearing' | 'equalization';

export type CaseProcessEntryPoint = 'case-tree' | 'case-overview' | 'process-module';

export type CaseProcessCapability = {
  processType: CaseProcessType;
  label: string;
  canCreateStructuredProcess: boolean;
  canCreateCasePlaceholder: boolean;
  allowedEntryPoints: CaseProcessEntryPoint[];
};

export const CASE_PROCESS_CAPABILITIES: CaseProcessCapability[] = [
  { processType: 'prevention', label: 'Präventionsverfahren', canCreateStructuredProcess: true, canCreateCasePlaceholder: false, allowedEntryPoints: ['case-tree', 'case-overview', 'process-module'] },
  { processType: 'bem', label: 'BEM-Verfahren', canCreateStructuredProcess: false, canCreateCasePlaceholder: true, allowedEntryPoints: ['case-tree', 'case-overview', 'process-module'] },
  { processType: 'termination_hearing', label: 'Kündigungsanhörung', canCreateStructuredProcess: true, canCreateCasePlaceholder: false, allowedEntryPoints: ['case-tree', 'case-overview', 'process-module'] },
  { processType: 'equalization', label: 'Gleichstellungsprozess', canCreateStructuredProcess: true, canCreateCasePlaceholder: true, allowedEntryPoints: ['case-tree', 'case-overview', 'process-module'] }
];

export function getCaseProcessCapability(processType: CaseProcessType): CaseProcessCapability {
  const capability = CASE_PROCESS_CAPABILITIES.find((entry) => entry.processType === processType);
  if (!capability) throw new Error(`Unbekannter Prozesstyp: ${processType}`);
  return capability;
}

export function canStartProcessAt(processType: CaseProcessType, entryPoint: CaseProcessEntryPoint): boolean {
  return getCaseProcessCapability(processType).allowedEntryPoints.includes(entryPoint);
}

export function requiresCaseBinding(processType: CaseProcessType): boolean {
  // Fachmaßnahmen in Gremia.SBV sind keine losgelösten Vorgänge, sondern hängen an einer Fallakte.
  return ['prevention', 'bem', 'termination_hearing', 'equalization'].includes(processType);
}

export function shouldCreatePlaceholder(processType: CaseProcessType): boolean {
  return getCaseProcessCapability(processType).canCreateCasePlaceholder && !getCaseProcessCapability(processType).canCreateStructuredProcess;
}
