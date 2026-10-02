import { useState } from 'react';
import type { PersonStatusExpirySummary } from '../../../domain/models/protected-person.model';

export function usePersonExpiryEvaluation(
  onEvaluateExpiry: () => Promise<PersonStatusExpirySummary>,
  announce: (message: string) => void,
  onError: (message: string) => void,
) {
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function evaluate() {
    setEvaluating(true);
    try {
      const result = await onEvaluateExpiry();
      const warningCount = result.expiringSoon.length;
      const reviewCount = result.expiredReviewRequired.length;
      const message = warningCount || reviewCount
        ? `${warningCount} neue Ablaufwarnungen und ${reviewCount} Datenschutzprüfungen wurden erzeugt.`
        : 'Alle Statusabläufe sind aktuell.';
      setFeedback(message);
      announce(message);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Statusabläufe konnten nicht geprüft werden.');
    } finally {
      setEvaluating(false);
    }
  }

  return { evaluating, feedback, evaluate };
}
