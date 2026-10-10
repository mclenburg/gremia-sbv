/** FTS snippets use bracket delimiters; React renders every segment as text. */
export function SearchSnippet({ excerpt }: { excerpt: string }) {
  return <>{excerpt.split(/(\[[^\]]+\])/g).filter(Boolean).map((segment, index) =>
    segment.startsWith('[') && segment.endsWith(']')
      ? <mark key={index}>{segment.slice(1, -1)}</mark>
      : <span key={index} className="industrial-text-fragment">{segment}</span>)}</>;
}
