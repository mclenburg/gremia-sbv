import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { TextCommandTextarea } from '../../shared/textCommands/TextCommandTextarea';
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
        <Search className="h-4 w-4 text-yellow-300" />
        <input className="industrial-input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Norm, Stichwort oder Praxisbegriff suchen …" />
        <select value={source} onChange={(event) => onSourceChange(event.target.value)}>
          <option value="">alle Quellen</option>
          {sources.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="submit" className="industrial-button">Suchen</button>
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
          <button key={norm.id} type="button" className={`knowledge-register-row ${selectedNormId === norm.id ? 'active' : ''}`} onClick={() => onSelectNorm(norm.id)}>
            <strong>{norm.paragraph}</strong>
            <span>{norm.title}</span>
            <small>{norm.source} · {norm.tags.slice(0, 3).join(', ')}</small>
          </button>
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
              <select value={linkCaseId} onChange={(event) => onLinkCaseIdChange(event.target.value)}>
                <option value="">Fall auswählen</option>
                {cases.map((record) => <option key={record.id} value={record.id}>{record.caseNumber} · {record.displayName}</option>)}
              </select>
              <button type="button" className="industrial-button" onClick={() => void onLinkSelectedNormToCase()}>Rechtsbezug setzen</button>
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
              <form onSubmit={onCreateChecklistItem} className="industrial-settings-form compact"><input value={checklistText} onChange={(event) => onChecklistTextChange(event.target.value)} placeholder="Checklisteneintrag" /><button className="industrial-secondary-button" type="submit">Ergänzen</button></form>
            </section>
            <section className="industrial-subpanel">
              <h4>Eigene Kommentare</h4>
              {comments.map((comment) => <p key={comment.id} className="industrial-meta"><strong>{comment.title}</strong><br />{comment.content}</p>)}
              <form onSubmit={onCreateComment} className="industrial-settings-form compact"><input value={commentTitle} onChange={(event) => onCommentTitleChange(event.target.value)} placeholder="Titel" /><TextCommandTextarea fieldId="knowledge-comment" value={commentText} onChange={(event) => onCommentTextChange(event.target.value)} placeholder="Kommentar" /><button className="industrial-secondary-button" type="submit">Speichern</button></form>
            </section>
            <section className="industrial-subpanel">
              <h4>Rechtsprechung</h4>
              {caseLaw.map((item) => <p key={item.id} className="industrial-meta"><strong>{item.court}, {item.fileNumber}</strong><br />{item.shortHolding}</p>)}
              <form onSubmit={onCreateCaseLaw} className="industrial-settings-form compact"><input value={caseLawCourt} onChange={(event) => onCaseLawCourtChange(event.target.value)} placeholder="Gericht" /><input value={caseLawFileNumber} onChange={(event) => onCaseLawFileNumberChange(event.target.value)} placeholder="Aktenzeichen" /><TextCommandTextarea fieldId="knowledge-case-law-holding" value={caseLawHolding} onChange={(event) => onCaseLawHoldingChange(event.target.value)} placeholder="Kurzleitsatz / Relevanz" /><button className="industrial-secondary-button" type="submit">Speichern</button></form>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
