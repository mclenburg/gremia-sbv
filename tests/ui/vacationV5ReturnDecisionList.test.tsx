import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VacationV5ReturnDecisionList } from '../../src/app/features/case-handover/VacationV5ReturnDecisionList';

describe('Format-5-Rückgabeentscheidungen', () => {
  it('zeigt beide fachlichen Stände mit benannter Einzelentscheidung', () => {
    const html = renderToStaticMarkup(<VacationV5ReturnDecisionList items={[
      { ref: 'meeting_1', kind: 'meeting', decision: 'review_conflict', expectedOriginSha256: 'a'.repeat(64),
        originData: { title: 'Ursprüngliche Sitzung', status: 'draft' },
        deputyData: { title: 'Sitzung der Vertretung', status: 'draft' } },
    ]} choices={{}} onChange={() => undefined} />);
    expect(html).toContain('Ursprüngliche Sitzung');
    expect(html).toContain('Sitzung der Vertretung');
    expect(html).toContain('Konflikt');
    expect(html).toContain('Konflikt bewusst übernehmen');
    expect(html).toContain('Ursprung behalten');
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*><span[^>]*>Entscheidung/);
    expect(html).not.toContain('meeting_1');
    expect(html).not.toContain('aaaaaaaa');
  });
});
