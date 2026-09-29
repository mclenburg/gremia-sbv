import { useEffect, useState } from 'react';
import type { GremiaBrExternalReferenceRecord, GremiaBrInformationRequest, GremiaBrProcedureDetail } from '../../../domain/models/gremia-br.model';
import { createInformationRequest, deleteProcedureLink, loadInformationRequests, loadProcedureDetail, loadProcedureLinks, saveProcedureLink } from './gremiaBrWorkspaceActions';
import type { BusyAction } from './GremiaBrWorkspacePanels';

type RunAction = (action: Exclude<BusyAction, null>, work: () => Promise<string>) => Promise<void>;

async function submitInformationRequest(input: {
  caseId: string;
  procedureId: string;
  links: GremiaBrExternalReferenceRecord[];
  items: string;
  reason: string;
  dueDate: string;
}): Promise<GremiaBrInformationRequest> {
  if (!input.caseId || !input.procedureId || !input.links.some((link) => link.sourceType === 'verfahren' && link.sourceId === input.procedureId)) {
    throw new Error('Bitte ein verknüpftes Verfahren auswählen.');
  }
  return createInformationRequest({
    caseId: input.caseId,
    procedureId: input.procedureId,
    items: input.items,
    ...(input.reason.trim() ? { reason: input.reason } : {}),
    ...(input.dueDate ? { responseDueAt: new Date(`${input.dueDate}T23:59:59`).toISOString() } : {}),
  });
}

export function useGremiaBrProcedureLinks(
  announce: (message: string, politeness?: 'polite' | 'assertive') => void,
  runAction: RunAction,
  onError: (message: string) => void,
) {
  const [procedureLocalCaseId, setProcedureLocalCaseId] = useState('');
  const [procedureRemoteCaseId, setProcedureRemoteCaseId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [procedureDetail, setProcedureDetail] = useState<GremiaBrProcedureDetail | null>(null);
  const [procedureLinks, setProcedureLinks] = useState<GremiaBrExternalReferenceRecord[]>([]);
  const [informationRequests, setInformationRequests] = useState<GremiaBrInformationRequest[]>([]);
  const [informationRequestsProcedureId, setInformationRequestsProcedureId] = useState('');
  const [requestItems, setRequestItems] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [responseDueDate, setResponseDueDate] = useState('');

  function clearRequestDraft() {
    setRequestItems('');
    setRequestReason('');
    setResponseDueDate('');
  }

  useEffect(() => {
    if (!procedureLocalCaseId) {
      setProcedureLinks([]);
      return;
    }
    let active = true;
    setProcedureLinks([]);
    void loadProcedureLinks(procedureLocalCaseId)
      .then((links) => { if (active) setProcedureLinks(links); })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Verknüpfungen konnten nicht geladen werden.';
        onError(message);
        announce(message, 'assertive');
      });
    return () => { active = false; };
  }, [procedureLocalCaseId, announce, onError]);

  function resetRemoteSelection() {
    setProcedureRemoteCaseId('');
    setProcedureId('');
    setProcedureDetail(null);
    setInformationRequests([]);
    setInformationRequestsProcedureId('');
    clearRequestDraft();
  }

  return {
    procedureLocalCaseId, procedureRemoteCaseId, procedureId, procedureDetail, procedureLinks,
    informationRequests, informationRequestsProcedureId,
    requestItems, requestReason, responseDueDate,
    setRequestItems, setRequestReason, setResponseDueDate,
    selectProcedureLocalCase: (id: string) => {
      setProcedureLocalCaseId(id);
      setInformationRequests([]);
      setInformationRequestsProcedureId('');
      clearRequestDraft();
    },
    resetRemoteSelection,
    selectProcedureRemoteCase: (id: string) => {
      setProcedureRemoteCaseId(id);
      setProcedureId('');
      setProcedureDetail(null);
      setInformationRequests([]);
      setInformationRequestsProcedureId('');
      clearRequestDraft();
    },
    selectProcedure: (id: string) => {
      setProcedureId(id);
      setProcedureDetail(null);
      setInformationRequests([]);
      setInformationRequestsProcedureId('');
      clearRequestDraft();
    },
    loadSelectedProcedure: () => runAction('procedure', async () => {
      if (!procedureId) throw new Error('Bitte ein Verfahren auswählen.');
      setProcedureDetail(await loadProcedureDetail(procedureId));
      return 'Verfahrensdetails wurden geladen.';
    }),
    loadSelectedInformationRequests: () => runAction('procedure', async () => {
      if (!procedureLocalCaseId || !procedureId || !procedureLinks.some((link) => link.sourceType === 'verfahren' && link.sourceId === procedureId)) {
        throw new Error('Bitte ein verknüpftes Verfahren auswählen.');
      }
      const requests = await loadInformationRequests(procedureLocalCaseId, procedureId);
      setInformationRequests(requests);
      setInformationRequestsProcedureId(procedureId);
      return 'Informationsanforderungen wurden geladen.';
    }),
    createSelectedInformationRequest: () => runAction('procedure', async () => {
      const created = await submitInformationRequest({
        caseId: procedureLocalCaseId, procedureId, links: procedureLinks,
        items: requestItems, reason: requestReason, dueDate: responseDueDate,
      });
      if (informationRequestsProcedureId === procedureId) setInformationRequests((current) => [...current, created]);
      clearRequestDraft();
      return 'Informationsanforderung wurde in Gremia.BR erstellt.';
    }),
    linkSelectedProcedure: () => runAction('procedure', async () => {
      if (!procedureLocalCaseId || !procedureDetail || procedureDetail.id !== procedureId || procedureDetail.masterCaseId !== procedureRemoteCaseId) {
        throw new Error('Bitte lokale Fallakte und aktuelle Verfahrensdetails auswählen.');
      }
      await saveProcedureLink(procedureLocalCaseId, procedureId);
      setProcedureLinks(await loadProcedureLinks(procedureLocalCaseId));
      return 'Verfahren wurde mit der lokalen Fallakte verknüpft.';
    }),
    unlinkProcedure: (id: string) => runAction('procedure', async () => {
      if (!procedureLocalCaseId || !procedureLinks.some((link) => link.id === id && link.sourceType === 'verfahren')) {
        throw new Error('Diese Verknüpfung ist nicht mehr in der ausgewählten Fallakte vorhanden.');
      }
      await deleteProcedureLink(id);
      setProcedureLinks(await loadProcedureLinks(procedureLocalCaseId));
      setInformationRequests([]);
      setInformationRequestsProcedureId('');
      return 'Verknüpfung wurde aufgehoben.';
    }),
  };
}
