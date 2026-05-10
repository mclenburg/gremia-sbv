import { useCallback, useMemo } from 'react';
import { waitForBridge } from '../../core/bridge/waitForBridge';
import type { CaseCategory } from '../../core/models/case.model';

export function usePersonCaseBindingHandlers(reloadWorkData: () => Promise<void>) {
  const createCaseForPerson = useCallback(async (input: { protectedPersonId: string; caseNumber: string; displayName: string; category: CaseCategory; summary?: string }) => {
    const bridge = await waitForBridge();
    if (!bridge?.cases) throw new Error('Falldienst ist nicht erreichbar.');
    await bridge.cases.create({ ...input, personBindingState: 'active' });
    await reloadWorkData();
  }, [reloadWorkData]);

  const createAnonymousRequestCase = useCallback(async (input: { caseNumber: string; category: CaseCategory; summary?: string; pseudonymLabel?: string }) => {
    const bridge = await waitForBridge();
    if (!bridge?.persons || !bridge?.cases) throw new Error('Personen- oder Falldienst ist nicht erreichbar.');
    const person = await bridge.persons.createAnonymousRequest(input.pseudonymLabel);
    await bridge.cases.create({
      caseNumber: input.caseNumber,
      displayName: person.pseudonymLabel ?? 'Anonyme Anfrage',
      category: input.category,
      summary: input.summary,
      protectedPersonId: person.id,
      personBindingState: 'anonymous_request',
      isPseudonymized: true
    });
    await reloadWorkData();
  }, [reloadWorkData]);

  return useMemo(() => ({ createCaseForPerson, createAnonymousRequestCase }), [createCaseForPerson, createAnonymousRequestCase]);
}
