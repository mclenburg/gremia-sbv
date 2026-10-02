import type { MobileCompanionReturnConflictResolution, MobileCompanionReturnImportInput } from '../../src/domain/models/mobile-companion.model.js';
import { assertAllowedEnum, assertRecordInput, assertString } from './ipcValidation.js';

export function validateMobileReturnImportInput(input: unknown): MobileCompanionReturnImportInput {
  const value = assertRecordInput<Record<string, unknown>>(input, 'caseHandover:mobile:return:import');
  if (!Array.isArray(value.resolutions) || value.resolutions.length > 1000) {
    throw new Error('caseHandover:mobile:return:import: Konfliktentscheidungen sind ungültig.');
  }
  const resolutions: MobileCompanionReturnConflictResolution[] = value.resolutions.map((entry) => {
    const resolution = assertRecordInput<Record<string, unknown>>(entry, 'caseHandover:mobile:return:import');
    return {
      mobileId: assertString(resolution.mobileId, 'caseHandover:mobile:return:import', 'Änderungs-ID', { minLength: 1, maxLength: 120 }),
      decision: assertAllowedEnum(resolution.decision, 'caseHandover:mobile:return:import', 'Konfliktentscheidung', ['apply_mobile', 'keep_desktop']),
    };
  });
  return {
    filePath: assertString(value.filePath, 'caseHandover:mobile:return:import', 'Dateiauswahl', { minLength: 1, maxLength: 2000 }),
    resolutions,
  };
}
