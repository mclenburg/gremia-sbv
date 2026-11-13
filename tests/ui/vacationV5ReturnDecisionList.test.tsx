import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { returnDecisionSearchText, VacationV5ReturnDecisionList } from '../../src/app/features/case-handover/VacationV5ReturnDecisionList';

describe('Format-5-Rückgabeentscheidungen', () => {
  it('zeigt beide fachlichen Stände mit benannter Einzelentscheidung', () => {
    const html = renderToStaticMarkup(<VacationV5ReturnDecisionList items={[
      { ref: 'meeting_1', kind: 'meeting', decision: 'review_conflict', expectedOriginSha256: 'a'.repeat(64),
        originData: { id: 'secret-origin-id', title: 'Ursprüngliche Sitzung', status: 'draft', starts_at: '2026-11-11T09:00:00.000Z', created_at: '2026-11-01' },
        deputyData: { id: 'secret-deputy-id', title: 'Sitzung der Vertretung', status: 'draft', starts_at: '2026-11-12T09:00:00.000Z', created_at: '2026-11-02' } },
    ]} choices={{}} onChange={() => undefined} />);
    expect(html).toContain('Ursprüngliche Sitzung');
    expect(html).toContain('Sitzung der Vertretung');
    expect(html).toContain('Konflikt');
    expect(html).toContain('Stand der Vertretung trotz Konflikt übernehmen');
    expect(html).toContain('Bisherigen Stand behalten');
    expect(html).toContain('Bisheriger Stand');
    expect(html).toContain('Beginn');
    expect(html).not.toContain('created_at');
    expect(html).not.toContain('secret-origin-id');
    expect(html).not.toContain('secret-deputy-id');
    expect(html).not.toContain('<th scope="row">Status</th>');
    expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*><span[^>]*>Entscheidung/);
    expect(html).not.toContain('meeting_1');
    expect(html).not.toContain('aaaaaaaa');
  });

  it('sucht nach sichtbaren Fachangaben statt technischen Kennungen', () => {
    const item = { ref: 'secret-ref', kind: 'meeting', decision: 'propose_update', expectedOriginSha256: null,
      originData: { id: 'secret-origin-id', title: 'Alte Sitzung' },
      deputyData: { id: 'secret-deputy-id', title: 'Neue Sitzung' } } as const;
    const searchText = returnDecisionSearchText(item);
    expect(searchText).toContain('neue sitzung');
    expect(searchText).not.toContain('secret');
  });
});
