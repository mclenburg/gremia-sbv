import type { DatabaseAdapter } from './databaseService.js';
import { ensureSbvParticipationViolationRuntimeSchema } from './runtimeSchemaCompatibility.js';

export function ensureSbvParticipationViolationSchema(db: DatabaseAdapter): void {
  ensureSbvParticipationViolationRuntimeSchema(db);
}
