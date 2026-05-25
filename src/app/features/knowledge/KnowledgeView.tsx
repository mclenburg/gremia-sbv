import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseLawRecord, CaseLegalReferenceRecord, LegalNormRecord, NormChecklistItemRecord, NormCommentRecord } from '../../core/models/knowledge.model';
import { SBV_ADVISOR_KNOWLEDGE_ENTRIES } from './knowledgeAdvisorData';
import { filterKnowledgeNorms, mergeKnowledgeNorms } from './knowledgeSearch';
import { KnowledgeDetailPanel, KnowledgeRegisterPanel, KnowledgeSearchPanel } from './KnowledgePanels';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

export function KnowledgeView({ cases }: { cases: CaseRecord[] }) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [norms, setNorms] = useState<LegalNormRecord[]>([]);
  const [allKnowledgeNorms, setAllKnowledgeNorms] = useState<LegalNormRecord[]>([]);
  const [selectedNormId, setSelectedNormId] = useState('');
  const [caseReferences, setCaseReferences] = useState<CaseLegalReferenceRecord[]>([]);
  const [comments, setComments] = useState<NormCommentRecord[]>([]);
  const [caseLaw, setCaseLaw] = useState<CaseLawRecord[]>([]);
  const [checklist, setChecklist] = useState<NormChecklistItemRecord[]>([]);
  const [linkCaseId, setLinkCaseId] = useState('');
  const [commentTitle, setCommentTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [caseLawCourt, setCaseLawCourt] = useState('');
  const [caseLawFileNumber, setCaseLawFileNumber] = useState('');
  const [caseLawHolding, setCaseLawHolding] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const announce = useAnnouncer();

  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useEffect(() => {
    if (message) announce(message, 'polite');
  }, [message, announce]);

  const selectedNorm = useMemo(() => norms.find((norm) => norm.id === selectedNormId), [norms, selectedNormId]);
  const sources = useMemo(() => [...new Set(allKnowledgeNorms.map((norm) => norm.source))].sort((a, b) => a.localeCompare(b)), [allKnowledgeNorms]);

  async function loadNorms(nextQuery = query, nextSource = source) {
    setError('');
    try {
      const bridge = await waitForBridge();
      let remoteRows: LegalNormRecord[] = [];
      if (bridge?.knowledge) {
        remoteRows = await bridge.knowledge.listNorms({ limit: 800 });
      }
      const mergedRows = mergeKnowledgeNorms(remoteRows);
      const filteredRows = filterKnowledgeNorms(mergedRows, nextQuery, nextSource);
      setAllKnowledgeNorms(mergedRows);
      setNorms(filteredRows);
      if (!selectedNormId && filteredRows.length) setSelectedNormId(filteredRows[0].id);
      if (selectedNormId && !filteredRows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(filteredRows[0]?.id ?? '');
    } catch (error) {
      const fallbackRows = filterKnowledgeNorms(SBV_ADVISOR_KNOWLEDGE_ENTRIES, nextQuery, nextSource);
      setAllKnowledgeNorms(SBV_ADVISOR_KNOWLEDGE_ENTRIES);
      setNorms(fallbackRows);
      if (!selectedNormId && fallbackRows.length) setSelectedNormId(fallbackRows[0].id);
      if (selectedNormId && !fallbackRows.some((norm) => norm.id === selectedNormId)) setSelectedNormId(fallbackRows[0]?.id ?? '');
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

  useEffect(() => {
    void loadNorms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetails(selectedNormId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNormId, cases.length]);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadNorms(query, source);
  }

  async function linkSelectedNormToCase() {
    setMessage('');
    setError('');
    if (!selectedNorm || !linkCaseId) {
      setError('Bitte Norm und Fall auswählen.');
      return;
    }
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.linkNormToCase({ caseId: linkCaseId, legalNormId: selectedNorm.id, note: 'Im Wissensmodul verknüpft.' });
      setMessage(`Rechtsbezug ${selectedNorm.paragraph} wurde mit der Fallakte verknüpft.`);
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rechtsbezug konnte nicht verknüpft werden.');
    }
  }

  async function createCommentForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createComment({ legalNormId: selectedNorm.id, title: commentTitle, content: commentText });
      setCommentTitle('');
      setCommentText('');
      setMessage('Kommentar gespeichert.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Kommentar konnte nicht gespeichert werden.');
    }
  }

  async function createCaseLawForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createCaseLaw({ legalNormId: selectedNorm.id, court: caseLawCourt, fileNumber: caseLawFileNumber, shortHolding: caseLawHolding });
      setCaseLawCourt('');
      setCaseLawFileNumber('');
      setCaseLawHolding('');
      setMessage('Rechtsprechungsnotiz gespeichert.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rechtsprechungsnotiz konnte nicht gespeichert werden.');
    }
  }

  async function createChecklistItemForNorm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNorm) return;
    setMessage('');
    setError('');
    try {
      const bridge = await waitForBridge();
      if (!bridge?.knowledge) throw new Error('Wissensdienst ist nicht erreichbar.');
      await bridge.knowledge.createChecklistItem({ legalNormId: selectedNorm.id, text: checklistText, sortOrder: checklist.length + 1 });
      setChecklistText('');
      setMessage('Checklisteneintrag ergänzt.');
      await loadDetails(selectedNorm.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Checklisteneintrag konnte nicht gespeichert werden.');
    }
  }

  return (
    <ModuleFrame title="Wissensdatenbank" kicker="SBV-Kompass" description="Kurze Ratgebertexte zu SBV-relevanten Normen, Pflichten und Handlungsoptionen. In Protokollen mit §§ einfügen.">
      <ModuleFeedback items={[message ? { id: 'knowledge-message', tone: 'success', message } : null, error ? { id: 'knowledge-error', tone: 'warning', message: error } : null]} />
      <KnowledgeSearchPanel query={query} source={source} sources={sources} onQueryChange={setQuery} onSourceChange={setSource} onSubmit={runSearch} />
      <section className="knowledge-layout">
        <KnowledgeRegisterPanel norms={norms} selectedNormId={selectedNormId} onSelectNorm={setSelectedNormId} />
        <KnowledgeDetailPanel
          selectedNorm={selectedNorm}
          cases={cases}
          linkCaseId={linkCaseId}
          caseReferences={caseReferences}
          checklist={checklist}
          comments={comments}
          caseLaw={caseLaw}
          checklistText={checklistText}
          commentTitle={commentTitle}
          commentText={commentText}
          caseLawCourt={caseLawCourt}
          caseLawFileNumber={caseLawFileNumber}
          caseLawHolding={caseLawHolding}
          onLinkCaseIdChange={setLinkCaseId}
          onLinkSelectedNormToCase={linkSelectedNormToCase}
          onChecklistTextChange={setChecklistText}
          onCommentTitleChange={setCommentTitle}
          onCommentTextChange={setCommentText}
          onCaseLawCourtChange={setCaseLawCourt}
          onCaseLawFileNumberChange={setCaseLawFileNumber}
          onCaseLawHoldingChange={setCaseLawHolding}
          onCreateChecklistItem={createChecklistItemForNorm}
          onCreateComment={createCommentForNorm}
          onCreateCaseLaw={createCaseLawForNorm}
        />
      </section>
    </ModuleFrame>
  );
}
