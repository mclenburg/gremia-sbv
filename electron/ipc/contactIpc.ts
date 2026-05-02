import type { IpcMain } from 'electron';
import { ContactService } from '../../services/contactService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { ContactListFilters, CreateContactInput, UpdateContactInput } from '../../src/app/core/models/contact.model.js';

export function registerContactIpc(ipcMain: IpcMain, security: SecurityService): void {
  const contacts = new ContactService(() => security.getActiveDatabase());

  ipcMain.handle('contacts:list', async (_event, filters?: ContactListFilters) => contacts.listContacts(filters));
  ipcMain.handle('contacts:create', async (_event, input: CreateContactInput) => contacts.createContact(input));
  ipcMain.handle('contacts:update', async (_event, id: string, input: UpdateContactInput) => contacts.updateContact(id, input));
  ipcMain.handle('contacts:delete', async (_event, id: string) => contacts.deleteContact(id));
}
