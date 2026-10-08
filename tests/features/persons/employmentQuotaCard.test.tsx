import { describe, expect, it } from 'vitest';
import { EmploymentQuotaCard } from '../../../src/app/features/persons/EmploymentQuotaCard';
import type { ProtectedPersonRecord } from '../../../src/domain/models/protected-person.model';
import { renderComponent, visibleText } from '../../helpers/renderedMarkup';

const person: ProtectedPersonRecord = {
  id: 'person-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  firstName: 'Ada',
  lastName: 'Test',
  employmentState: 'active_employee',
  protectionStatus: 'severely_disabled',
  statusSource: 'manual',
  lifecycleState: 'active',
};

describe('Beschäftigungsquoten-Kachel', () => {
  it('ist ohne gespeicherte Unternehmensgröße vollständig ausgeblendet', () => {
    expect(renderComponent(EmploymentQuotaCard, { workplaces: null, persons: [person], today: '2026-10-08' }).markup).toBe('');
  });

  it('zeigt Pflichtplätze und den begrenzten Aussagewert der aktuellen Daten', () => {
    const { markup } = renderComponent(EmploymentQuotaCard, { workplaces: 40, persons: [person], today: '2026-10-08' });
    const text = visibleText(markup);
    expect(text).toContain('Beschäftigungsquote');
    expect(text).toContain('40');
    expect(text).toContain('Pflichtplätze');
    expect(text).toContain('fehlen aktuell 1');
    expect(text).toContain('Keine amtliche Feststellung');
  });
});
