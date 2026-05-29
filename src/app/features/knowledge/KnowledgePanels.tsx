import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
import { IndustrialButton, ToolbarButton } from '../../shared/components/IndustrialButton';
import { SelectInput, TextInput } from '../../shared/components/IndustrialForm';
import type { CaseRecord } from '../../core/models/case.model';
import type { CaseLawRecord, CaseLegalReferenceRecord, LegalNormRecord, NormChecklistItemRecord, NormCommentRecord } from '../../core/models/knowledge.model';

export function KnowledgeSearchPanel({
  query,
  source,
  sources,
  onQueryChange,
  onSourceChange,
  onSubmit
}: {
  query: string;
  source: string;
  sources: string[];
  onQueryChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <section className="industrial-panel">
      <form onSubmit={onSubmit} className="knowledge-search-bar">
        <Search className="h-4 w-4 text-yellow-300" aria-hidden="true" />
        <TextInput label="Suchbegriff" value={query} onValueChange={onQueryChange} placeholder="Norm, Stichwort oder Praxisbegriff suchen …" />
        <SelectInput
          label="Quelle"
          aria-label="Quelle der Wissenssuche"
          value={source}
          onValueChange={onSourceChange}
          options={[{ value: '', label: 'alle Quellen' }, ...sources.map((item) => ({ value: item, label: item }))]}
        />
        <IndustrialButton type="submit">Suchen</IndustrialButton>
      </form>
    </section>
  );
}

export function KnowledgeRegisterPanel({ norms, selectedNormId, onSelectNorm }: { norms: LegalNormRecord[]; selectedNormId: string; onSelectNorm: (id: string) => void }) {
  return (
    <aside className="industrial-panel">
      <div className="industrial-panel-header compact"><div><p className="industrial-kicker">Normen</p><h2>Register</h2><p className="industrial-meta">{norms.length} Treffer</p></div></div>
      <div className="knowledge-register-list">
        {norms.map((norm) => (
          <ToolbarButton key={norm.id} type="button" className={`knowledge-register-row ${selectedNormId === norm.id ? 'active' : ''}`} onClick={() => onSelectNorm(norm.id)} aria-pressed={selectedNormId === norm.id}>
            <strong>{norm.paragraph}</strong>
            <span>{norm.title}</span>
            <small>{norm.source} · {norm.tags.slice(0, 3).join(', ')}</small>
          </ToolbarButton>
        ))}
        {!norms.length && <div className="industrial-empty compact">Keine Normen gefunden.</div>}
      </div>
    </aside>
  );
}

export function KnowledgeDetailPanel({
  selectedNorm,
  cases,
  linkCaseId,
  caseReferences,
  checklist,
  comments,
  caseLaw,
  checklistText,
  commentTitle,
  commentText,
  caseLawCourt,
  caseLawFileNumber,
  caseLawHolding,
  onLinkCaseIdChange,
  onLinkSelectedNormToCase,
  onChecklistTextChange,
  onCommentTitleChange,
  onCommentTextChange,
  onCaseLawCourtChange,
  onCaseLawFileNumberChange,
  onCaseLawHoldingChange,
  onCreateChecklistItem,
  onCreateComment,
  onCreateCaseLaw
}: {
  selectedNorm?: LegalNormRecord;
  cases: CaseRecord[];
  linkCaseId: string;
  caseReferences: CaseLegalReferenceRecord[];
  checklist: NormChecklistItemRecord[];
  comments: NormCommentRecord[];
  caseLaw: CaseLawRecord[];
  checklistText: string;
  commentTitle: string;
  commentText: string;
  caseLawCourt: string;
  caseLawFileNumber: string;
  caseLawHolding: string;
  onLinkCaseIdChange: (value: string) => void;
  onLinkSelectedNormToCase: () => void | Promise<void>;
  onChecklistTextChange: (value: string) => void;
  onCommentTitleChange: (value: string) => void;
  onCommentTextChange: (value: string) => void;
  onCaseLawCourtChange: (value: string) => void;
  onCaseLawFileNumberChange: (value: string) => void;
  onCaseLawHoldingChange: (value: string) => void;
  onCreateChecklistItem: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateComment: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateCaseLaw: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <section className="industrial-panel knowledge-detail-panel">
      {!selectedNorm && <div className="industrial-empty">Norm auswählen.</div>}
      {selectedNorm && (
        <>
          <div className="industrial-panel-header compact">
            <div>
              <p className="industrial-kicker">{selectedNorm.source}</p>
              <h2>{selectedNorm.paragraph} · {selectedNorm.title}</h2>
              <p>{selectedNorm.shortText}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="industrial-subpanel"><h4>SBV-Bedeutung</h4><p>{selectedNorm.sbvMeaning ?? 'Noch nicht ergänzt.'}</p></div>
            <div className="industrial-subpanel"><h4>Praxishinweis</h4><p>{selectedNorm.practiceNote ?? 'Noch nicht ergänzt.'}</p></div>
            <div className="industrial-subpanel"><h4>Typische Fälle</h4><p>{selectedNorm.typicalCases ?? 'Noch nicht ergänzt.'}</p></div>
            <div className="industrial-subpanel"><h4>Tags</h4><p>{selectedNorm.tags.join(', ') || '—'}</p></div>
          </div>

          <details className="industrial-subpanel mt-4 knowledge-case-link">
            <summary>Mit Fallakte verknüpfen</summary>
            <div className="industrial-form-grid compact">
              <SelectInput
                label="Fallakte"
                aria-label="Fallakte für Rechtsbezug auswählen"
                value={linkCaseId}
                onValueChange={onLinkCaseIdChange}
                options={[{ value: '', label: 'Fall auswählen' }, ...cases.map((record) => ({ value: record.id, label: `${record.caseNumber} · ${record.displayName}` }))]}
              />
              <IndustrialButton onClick={() => void onLinkSelectedNormToCase()}>Rechtsbezug setzen</IndustrialButton>
            </div>
            <div className="mt-3">
              {caseReferences.map((reference) => <p key={reference.id} className="industrial-meta"><strong>{reference.caseNumber}</strong> · {reference.createdAt.slice(0, 10)}</p>)}
              {!caseReferences.length && <p className="industrial-meta">Noch keine Fallverknüpfung.</p>}
            </div>
          </details>

          <div className="grid gap-4 xl:grid-cols-3 mt-4">
            <section className="industrial-subpanel">
              <h4>Checkliste</h4>
              {checklist.map((item) => <p key={item.id} className="industrial-meta">□ {item.text}</p>)}
              <form onSubmit={onCreateChecklistItem} className="industrial-settings-form compact">
                <TextInput label="Checklisteneintrag" value={checklistText} onValueChange={onChecklistTextChange} placeholder="Checklisteneintrag" />
                <ToolbarButton type="submit">Ergänzen</ToolbarButton>
              </form>
            </section>
            <section className="industrial-subpanel">
              <h4>Eigene Kommentare</h4>
              {comments.map((comment) => <p key={comment.id} className="industrial-meta"><strong>{comment.title}</strong><br />{comment.content}</p>)}
              <form onSubmit={onCreateComment} className="industrial-settings-form compact">
                <TextInput label="Titel" value={commentTitle} onValueChange={onCommentTitleChange} placeholder="Titel" />
                <TextCommandTextarea fieldId="knowledge-comment" value={commentText} onChange={(event) => onCommentTextChange(event.target.value)} placeholder="Kommentar" />
                <ToolbarButton type="submit">Speichern</ToolbarButton>
              </form>
            </section>
            <section className="industrial-subpanel">
              <h4>Rechtsprechung</h4>
              {caseLaw.map((item) => <p key={item.id} className="industrial-meta"><strong>{item.court}, {item.fileNumber}</strong><br />{item.shortHolding}</p>)}
              <form onSubmit={onCreateCaseLaw} className="industrial-settings-form compact">
                <TextInput label="Gericht" value={caseLawCourt} onValueChange={onCaseLawCourtChange} placeholder="Gericht" />
                <TextInput label="Aktenzeichen" value={caseLawFileNumber} onValueChange={onCaseLawFileNumberChange} placeholder="Aktenzeichen" />
                <TextCommandTextarea fieldId="knowledge-case-law-holding" value={caseLawHolding} onChange={(event) => onCaseLawHoldingChange(event.target.value)} placeholder="Kurzleitsatz / Relevanz" />
                <ToolbarButton type="submit">Speichern</ToolbarButton>
              </form>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
