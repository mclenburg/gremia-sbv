import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ModuleFrame } from '../../shared/components/ModuleFrame';
import { ModuleFeedback } from '../../shared/components/ModuleFeedback';
import type { CaseRecord } from '../../../domain/models/case.model';
import type { CaseLawRecord, CaseLegalReferenceRecord, LegalNormRecord, NormChecklistItemRecord, NormCommentRecord } from '../../../domain/models/knowledge.model';
import { createKnowledgeDataActions, createKnowledgeEditActions } from './knowledgeActions';
import { KnowledgeDetailPanel, KnowledgeRegisterPanel, KnowledgeSearchPanel } from './KnowledgePanels';
import { useAnnouncer } from '../../shared/a11y/LiveRegionProvider';

export function KnowledgeView({ cases, targetId, onTargetConsumed }: { cases: CaseRecord[]; targetId?: string; onTargetConsumed?: () => void }) {
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

  const { loadNorms, loadDetails } = createKnowledgeDataActions({
    query, source, selectedNormId, cases, setError, setAllKnowledgeNorms, setNorms, setSelectedNormId,
    setCaseReferences, setComments, setCaseLaw, setChecklist,
  });
  const { linkSelectedNormToCase, createCommentForNorm, createCaseLawForNorm, createChecklistItemForNorm } = createKnowledgeEditActions({
    selectedNorm, linkCaseId, commentTitle, commentText, caseLawCourt, caseLawFileNumber, caseLawHolding, checklistText, checklist,
    loadDetails, setMessage, setError, setCommentTitle, setCommentText, setCaseLawCourt, setCaseLawFileNumber, setCaseLawHolding, setChecklistText,
  });

  useEffect(() => {
    void loadNorms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDetails(selectedNormId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNormId, cases.length]);

  useEffect(() => {
    if (!targetId || !norms.some((norm) => norm.id === targetId)) return;
    setSelectedNormId(targetId);
    onTargetConsumed?.();
  }, [targetId, norms, onTargetConsumed]);

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadNorms(query, source);
  }

  return (
    <ModuleFrame title="Wissensdatenbank" kicker="SBV-Kompass" description="Kurze Ratgebertexte zu SBV-relevanten Normen, Pflichten und Handlungsoptionen. In Protokollen mit §§ einfügen." helpId="knowledge.overview">
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
