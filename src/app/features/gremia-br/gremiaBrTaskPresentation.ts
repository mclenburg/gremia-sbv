import type { GremiaBrTaskStatus } from '../../../domain/models/gremia-br.model';

export const GREMIA_BR_TASK_STATUS_LABELS: Record<GremiaBrTaskStatus, string> = {
  OPEN: 'Offen',
  IN_PROGRESS: 'In Bearbeitung',
  BLOCKED: 'Blockiert',
  WAITING_EXTERNAL: 'Wartet auf Rückmeldung',
  QUESTION: 'Rückfrage',
  COMPLETED: 'Erledigt',
  CANCELLED: 'Abgebrochen',
};
