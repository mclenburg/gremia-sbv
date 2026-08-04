import type { IpcMain } from "electron";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import type {
  ContactListFilters,
  CreateContactInput,
  UpdateContactInput,
} from "../../src/app/core/models/contact.model.js";
import {
  assertOptionalObject,
  assertRecordInput,
  assertString,
} from "./ipcValidation.js";

export function registerContactIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const contacts = services.contacts;

  ipcMain.handle("contacts:list", async (_event, filters?: unknown) =>
    contacts.listContacts(
      assertOptionalObject<ContactListFilters>(filters, "contacts:list", "Filter"),
    ),
  );
  ipcMain.handle("contacts:create", async (_event, input: unknown) =>
    contacts.createContact(
      assertRecordInput<CreateContactInput>(input, "contacts:create"),
    ),
  );
  ipcMain.handle("contacts:update", async (_event, id: unknown, input: unknown) =>
    contacts.updateContact(
      assertString(id, "contacts:update", "Kontakt-ID", { minLength: 1, maxLength: 120 }),
      assertRecordInput<UpdateContactInput>(input, "contacts:update"),
    ),
  );
  ipcMain.handle("contacts:delete", async (_event, id: unknown) =>
    contacts.deleteContact(assertString(id, "contacts:delete", "Kontakt-ID", { minLength: 1, maxLength: 120 })),
  );
}
