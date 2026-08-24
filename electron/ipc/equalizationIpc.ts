import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import {
  EQUALIZATION_STATUS_ORDER,
  evaluateEqualizationWarnings,
} from "../../services/equalizationWorkflowPolicy.js";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  CreateEqualizationIntakeInput,
  CreateEqualizationProcessInput,
  UpdateEqualizationProcessInput,
} from "../../src/domain/models/equalization.model.js";
import {
  assertAllowedEnum,
  assertOptionalString,
  assertPlainObject,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

function parseIntakeInput(input: unknown): CreateEqualizationIntakeInput {
  const channel = 'equalization:create-intake';
  const checked = assertPlainObject(input, channel);
  const person = assertPlainObject(checked.person, channel, 'Personenbezug');
  const mode = assertAllowedEnum(person.mode, channel, 'Art des Personenbezugs', ['existing', 'new_identified', 'new_pseudonymous'] as const);
  const parsedPerson = mode === 'existing'
    ? { mode, protectedPersonId: assertString(person.protectedPersonId, channel, 'Person-ID', { minLength: 1, maxLength: 120 }) }
    : mode === 'new_identified'
      ? {
          mode,
          firstName: assertString(person.firstName, channel, 'Vorname', { minLength: 1, maxLength: 200 }),
          lastName: assertString(person.lastName, channel, 'Nachname', { minLength: 1, maxLength: 200 }),
        }
      : {
          mode,
          pseudonymLabel: assertString(person.pseudonymLabel, channel, 'Pseudonym', { minLength: 1, maxLength: 200 }),
        };
  return {
    person: parsedPerson,
    caseNumber: assertString(checked.caseNumber, channel, 'Aktenzeichen', { minLength: 1, maxLength: 120 }),
    category: assertAllowedEnum(checked.category, channel, 'Vorgangsart', ['gleichstellung', 'gdb'] as const),
    summary: assertOptionalString(checked.summary, channel, 'Kurzbeschreibung', { maxLength: 5_000 }),
  };
}

export function registerEqualizationIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const equalization = services.equalization;

  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationSteps, async () => EQUALIZATION_STATUS_ORDER);
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationList, async (_event, caseId?: unknown) =>
    equalization().list(
      assertOptionalString(caseId, "equalization:list", "Fall-ID", { maxLength: 120 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationCreate, async (_event, input: unknown) =>
    equalization().create(
      assertRecordInput<CreateEqualizationProcessInput>(input, "equalization:create"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationCreateIntake, async (_event, input: unknown) =>
    services.equalizationIntake().create(parseIntakeInput(input)),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationUpdate, async (_event, id: unknown, input: unknown) =>
    equalization().update(
      assertString(id, "equalization:update", "Gleichstellungs-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateEqualizationProcessInput>(input, "equalization:update"),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.equalizationWarnings, async (_event, id: unknown) => {
    const record = equalization().getById(
      assertString(id, "equalization:warnings", "Gleichstellungs-ID", { minLength: 1, maxLength: 120 }),
    );
    if (!record) return [];
    return evaluateEqualizationWarnings(record);
  });
}
