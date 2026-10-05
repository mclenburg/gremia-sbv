import type { FormEvent } from 'react';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseLawRecord, CaseLegalReferenceRecord, LegalNormRecord, NormChecklistItemRecord, NormCommentRecord } from '../../../domain/models/knowledge.model';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { SBV_ADVISOR_KNOWLEDGE_ENTRIES } from './knowledgeAdvisorData';
import { filterKnowledgeNorms, mergeKnowledgeNorms } from './knowledgeSearch';

type KnowledgeDataDeps = {
  query: string;
  source: string;
  selectedNormId: string;
  cases: CaseRecord[];
  setError: (error: string) => void;
  setAllKnowledgeNorms: (rows: LegalNormRecord[]) => void;
  setNorms: (rows: LegalNormRecord[]) => void;
  setSelectedNormId: (id: string) => void;
  setCaseReferences: (rows: CaseLegalReferenceRecord[]) => void;
  setComments: (rows: NormCommentRecord[]) => void;
  setCaseLaw: (rows: CaseLawRecord[]) => void;
  setChecklist: (rows: NormChecklistItemRecord[]) => void;
};

export function createKnowledgeDataActions({ query, source, selectedNormId, cases, setError, setAllKnowledgeNorms, setNorms, setSelectedNormId, setCaseReferences, setComments, setCaseLaw, setChecklist }: KnowledgeDataDeps) {
  function applyNormRows(rows: LegalNormRecord[], nextQuery: string, nextSource: string) {
    const filteredRows = filterKnowledgeNorms(rows, nextQuery, nextSource);
    setAllKnowledgeNorms(rows);
    setNorms(filteredRows);
    if (!selectedNormId && filteredRows.length) setSelectedNormId(filteredRows[0].id);
    if (selectedNormId && !filteredRows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(filteredRows[0]?.id ?? '');
  }

  async function loadNorms(nextQuery = query, nextSource = source) {
    setError('');
    try {
      const bridge = await waitForBridge();
      let remoteRows: LegalNormRecord[] = [];
      if (bridge?.knowledge) {
        remoteRows = await bridge.knowledge.listNorms({ limit: 800 });
      }
      applyNormRows(mergeKnowledgeNorms(remoteRows), nextQuery, nextSource);
    } catch (error) {
      applyNormRows(SBV_ADVISOR_KNOWLEDGE_ENTRIES, nextQuery, nextSource);
      setError(error instanceof Error ? `${error.message} Lokaler SBV-Ratgeber wurde geladen.` : 'Wissensdienst nicht erreichbar. Lokaler SBV-Ratgeber wurde geladen.');
    }
  }

  async function loadDetails(normId: string) {
    if (!normId) {
      setCaseReferences([]);
      setComments([]);
      setCaseLaw([]);
      setChecklist([]);
      return;
    }
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      const allCaseReferences = await Promise.all(cases.map((record) => bridge.knowledge.listCaseReferences(record.id)));
      const [commentRows, caseLawRows, checklistRows] = await Promise.all([
        bridge.knowledge.listComments(normId),
        bridge.knowledge.listCaseLaw(normId),
        bridge.knowledge.listChecklist(normId)
      ]);
      setCaseReferences(allCaseReferences.flat().filter((reference) => reference.legalNormId === normId));
      setComments(commentRows);
      setCaseLaw(caseLawRows);
      setChecklist(checklistRows);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Details konnten nicht geladen werden.');
    }
  }

  return { loadNorms, loadDetails };
}

type KnowledgeEditDeps = {
  selectedNorm: LegalNormRecord | undefined;
  linkCaseId: string;
  commentTitle: string;
  commentText: string;
  caseLawCourt: string;
  caseLawFileNumber: string;
  caseLawHolding: string;
  checklistText: string;
  checklist: NormChecklistItemRecord[];
  loadDetails: (normId: string) => Promise<void>;
  setMessage: (message: string) => void;
  setError: (error: string) => void;
  setCommentTitle: (value: string) => void;
  setCommentText: (value: string) => void;
  setCaseLawCourt: (value: string) => void;
  setCaseLawFileNumber: (value: string) => void;
  setCaseLawHolding: (value: string) => void;
  setChecklistText: (value: string) => void;
};

export function createKnowledgeEditActions({
  selectedNorm, linkCaseId, commentTitle, commentText, caseLawCourt, caseLawFileNumber, caseLawHolding, checklistText, checklist,
  loadDetails, setMessage, setError, setCommentTitle, setCommentText, setCaseLawCourt, setCaseLawFileNumber, setCaseLawHolding, setChecklistText,
}: KnowledgeEditDeps) {
  async function runMutation(normId: string, action: (service: NonNullable<Window['gremiaSbv']>['knowledge']) => Promise<unknown>, onSaved: () => void, fallback: string) {
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await action(bridge.knowledge);
      onSaved();
      await loadDetails(normId);
    } catch (error) {
      setError(error instanceof Error ? error.message : fallback);
    }
  }

  async function linkSelectedNormToCase() {
    if (!selectedNorm || !linkCaseId) {
      setMessage('');
      setError('Bitte Norm und Fall auswählen.');
      return;
    }
    await runMutation(
      selectedNorm.id,
      (service) => service.linkNormToCase({ caseId: linkCaseId, legalNormId: selectedNorm.id, note: 'Im Wissensmodul verknüpft.' }),
      () => setMessage(`Rechtsbezug ${selectedNorm.paragraph} wurde mit der Fallakte verknüpft.`),
      'Rechtsbezug konnte nicht verknüpft werden.',
    );
  }

  async function createCommentForNorm(event: Pick<FormEvent<HTMLFormElement>, 'preventDefault'>) {
    event.preventDefault();
    if (!selectedNorm) return;
    await runMutation(
      selectedNorm.id,
      (service) => service.createComment({ legalNormId: selectedNorm.id, title: commentTitle, content: commentText }),
      () => {
        setCommentTitle('');
        setCommentText('');
        setMessage('Kommentar gespeichert.');
      },
      'Kommentar konnte nicht gespeichert werden.',
    );
  }

  async function createCaseLawForNorm(event: Pick<FormEvent<HTMLFormElement>, 'preventDefault'>) {
    event.preventDefault();
    if (!selectedNorm) return;
    await runMutation(
      selectedNorm.id,
      (service) => service.createCaseLaw({ legalNormId: selectedNorm.id, court: caseLawCourt, fileNumber: caseLawFileNumber, shortHolding: caseLawHolding }),
      () => {
        setCaseLawCourt('');
        setCaseLawFileNumber('');
        setCaseLawHolding('');
        setMessage('Rechtsprechungsnotiz gespeichert.');
      },
      'Rechtsprechungsnotiz konnte nicht gespeichert werden.',
    );
  }

  async function createChecklistItemForNorm(event: Pick<FormEvent<HTMLFormElement>, 'preventDefault'>) {
    event.preventDefault();
    if (!selectedNorm) return;
    await runMutation(
      selectedNorm.id,
      (service) => service.createChecklistItem({ legalNormId: selectedNorm.id, text: checklistText, sortOrder: checklist.length + 1 }),
      () => {
        setChecklistText('');
        setMessage('Checklisteneintrag ergänzt.');
      },
      'Checklisteneintrag konnte nicht gespeichert werden.',
    );
  }

  return { linkSelectedNormToCase, createCommentForNorm, createCaseLawForNorm, createChecklistItemForNorm };
}
