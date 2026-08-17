import { useCallback, useState } from 'react';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type {
  ComplaintWorkflowRecord,
  EmployerObligationReviewRecord,
  InclusionAgreementRecord,
  InclusionOfficerSnapshotRecord,
  QuickCaseTemplate,
  SbvAssemblyRecord,
  SbvMeetingRecord,
} from '../../../../domain/models/sbv-office-workflow.model';

export function useSbvOfficeWorkflows() {
  const [assemblyWarning, setAssemblyWarning] = useState(false);
  const [meetings, setMeetings] = useState<SbvMeetingRecord[]>([]);
  const [assemblies, setAssemblies] = useState<SbvAssemblyRecord[]>([]);
  const [obligations, setObligations] = useState<EmployerObligationReviewRecord[]>([]);
  const [officers, setOfficers] = useState<InclusionOfficerSnapshotRecord[]>([]);
  const [agreements, setAgreements] = useState<InclusionAgreementRecord[]>([]);
  const [complaints, setComplaints] = useState<ComplaintWorkflowRecord[]>([]);
  const [templates, setTemplates] = useState<QuickCaseTemplate[]>([]);

  const bridge = async () => {
    const appBridge = await waitForBridge();
    if (!appBridge?.sbvOffice) {
      throw new Error('SBV-Amtsarbeits-Bridge ist nicht verfügbar.');
    }
    return appBridge.sbvOffice;
  };

  const load = useCallback(async () => {
    const sbvOffice = await bridge();
    const year = new Date().getFullYear();
    const [
      loadedMeetings,
      loadedAssemblies,
      loadedObligations,
      loadedOfficers,
      loadedAgreements,
      loadedComplaints,
      loadedTemplates,
      warning,
    ] = await Promise.all([
      sbvOffice.meetings.list(),
      sbvOffice.assemblies.list(),
      sbvOffice.obligations.list(),
      sbvOffice.officers.list(),
      sbvOffice.agreements.list(),
      sbvOffice.complaints.list(),
      sbvOffice.complaints.templates(),
      sbvOffice.assemblies.annualWarning(year),
    ]);

    setMeetings(loadedMeetings);
    setAssemblies(loadedAssemblies);
    setObligations(loadedObligations);
    setOfficers(loadedOfficers);
    setAgreements(loadedAgreements);
    setComplaints(loadedComplaints);
    setTemplates(loadedTemplates);
    setAssemblyWarning(warning);
  }, []);

  return {
    meetings,
    assemblies,
    assemblyWarning,
    obligations,
    officers,
    agreements,
    complaints,
    templates,
    load,
    bridge,
  };
}
