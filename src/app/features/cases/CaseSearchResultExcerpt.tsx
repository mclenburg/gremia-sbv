function splitSnippet(snippet: string): { text: string; highlighted: boolean }[] {
  const segments: { text: string; highlighted: boolean }[] = [];
  let cursor = 0;
  const pattern = /\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(snippet)) !== null) {
    if (match.index > cursor) segments.push({ text: snippet.slice(cursor, match.index), highlighted: false });
    segments.push({ text: match[1] ?? '', highlighted: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < snippet.length) segments.push({ text: snippet.slice(cursor), highlighted: false });
  return segments.filter((segment) => segment.text.length > 0);
}

export function CaseSearchResultExcerpt({ excerpt }: { excerpt: string }) {
  const segments = splitSnippet(excerpt);
  if (!segments.some((segment) => segment.highlighted)) return <p>{excerpt}</p>;
  return (
    <p>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={`${segment.text}-${index}`}>{segment.text}</mark>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
