import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { waitForBridge } from '../../../core/bridge/waitForBridge';
import type { ControlSectionId } from '../sbvControlSections';
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
  const [loaded, setLoaded] = useState(false);
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
    setLoaded(true);
  }, []);

  return {
    loaded,
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

export type SbvOfficeRecordTarget = {
  recordId: string;
  processType: 'employer_obligation_review' | 'inclusion_agreement';
  sourceEvent?: string;
};

export function useSbvOfficeRecordTarget({ target, onTargetConsumed, loaded, obligations, agreements, setActiveSection, setError }: {
  target?: SbvOfficeRecordTarget;
  onTargetConsumed?: () => void;
  loaded: boolean;
  obligations: EmployerObligationReviewRecord[];
  agreements: InclusionAgreementRecord[];
  setActiveSection: Dispatch<SetStateAction<ControlSectionId>>;
  setError: Dispatch<SetStateAction<string>>;
}) {
  const [selectedTarget, setSelectedTarget] = useState<SbvOfficeRecordTarget>();
  const onTargetConsumedRef = useRef(onTargetConsumed);
  useEffect(() => { onTargetConsumedRef.current = onTargetConsumed; }, [onTargetConsumed]);
  useEffect(() => {
    if (!target) return;
    const isObligation = target.processType === 'employer_obligation_review';
    setActiveSection(isObligation ? 'obligations' : 'inclusion');
    if (!loaded) return;
    const records = isObligation ? obligations : agreements;
    if (records.some((record) => record.id === target.recordId)) {
      setSelectedTarget(target);
      setError('');
    } else {
      setSelectedTarget(undefined);
      setError(`${isObligation ? 'Der verknüpfte Prüfvorgang' : 'Die verknüpfte Verhandlungsakte'} ist nicht mehr vorhanden. Prüfen Sie die Wiedervorlage im Fristenregister.`);
    }
    onTargetConsumedRef.current?.();
  }, [agreements, loaded, obligations, setActiveSection, setError, target]);
  return selectedTarget;
}
