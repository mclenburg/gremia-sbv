import { contextBridge, ipcRenderer } from 'electron';
import type { CaseDocumentRecord } from '../src/app/core/models/case-document.model.js';
import type { CaseRecord, CreateCaseInput } from '../src/app/core/models/case.model.js';
import type { ContactListFilters, ContactRecord, CreateContactInput, DeleteContactResult, UpdateContactInput } from '../src/app/core/models/contact.model.js';
import type { CaseContentSearchInput, CaseNoteRecord, CaseSearchResult, CreateCaseNoteInput, UpdateCaseNoteInput } from '../src/app/core/models/case-note.model.js';
import type { CreateDeadlineInput, DeadlineDashboardItem, DeadlineListFilters, DeadlineRecord, UpdateDeadlineInput } from '../src/app/core/models/deadline.model.js';
import type { SecurityResult, SecurityStatus } from '../src/app/core/models/security.model.js';
import type { GenerateReportInput, ReportDescriptor, ReportExportHistoryItem, ReportGenerationResult } from '../src/app/core/models/report.model.js';

const api = {
  security: {
    status: (): Promise<SecurityStatus> => ipcRenderer.invoke('security:status'),
    setupInitialPassword: (password: string): Promise<SecurityResult> => ipcRenderer.invoke('security:setup-initial-password', password),
    unlock: (password: string): Promise<SecurityResult> => ipcRenderer.invoke('security:unlock', password),
    changePassword: (currentPassword: string, newPassword: string): Promise<SecurityResult> =>
      ipcRenderer.invoke('security:change-password', currentPassword, newPassword),
    resetPasswordWithRecoveryKey: (recoveryKey: string, newPassword: string): Promise<SecurityResult> =>
      ipcRenderer.invoke('security:reset-password-with-recovery-key', recoveryKey, newPassword),
    destroyLocalVault: (confirmation: string): Promise<SecurityResult> =>
      ipcRenderer.invoke('security:destroy-local-vault', confirmation),
    lock: (): Promise<{ locked: boolean }> => ipcRenderer.invoke('security:lock')
  },
  cases: {
    list: (): Promise<CaseRecord[]> => ipcRenderer.invoke('cases:list'),
    create: (input: CreateCaseInput): Promise<CaseRecord> => ipcRenderer.invoke('cases:create', input),
    listNotes: (caseId: string): Promise<CaseNoteRecord[]> => ipcRenderer.invoke('cases:notes:list', caseId),
    createNote: (input: CreateCaseNoteInput): Promise<CaseNoteRecord> => ipcRenderer.invoke('cases:notes:create', input),
    updateNote: (id: string, input: UpdateCaseNoteInput): Promise<CaseNoteRecord> => ipcRenderer.invoke('cases:notes:update', id, input),
    deleteNote: (id: string): Promise<{ deleted: boolean }> => ipcRenderer.invoke('cases:notes:delete', id),
    listDocuments: (caseId: string): Promise<CaseDocumentRecord[]> => ipcRenderer.invoke('cases:documents:list', caseId),
    selectAndImportDocuments: (caseId: string, containsHealthData = true): Promise<CaseDocumentRecord[]> =>
      ipcRenderer.invoke('cases:documents:select-and-import', caseId, containsHealthData),
    deleteDocument: (id: string): Promise<{ deleted: boolean }> => ipcRenderer.invoke('cases:documents:delete', id),
    search: (input: CaseContentSearchInput): Promise<CaseSearchResult[]> => ipcRenderer.invoke('cases:search', input)
  },
  contacts: {
    list: (filters?: ContactListFilters): Promise<ContactRecord[]> => ipcRenderer.invoke('contacts:list', filters),
    create: (input: CreateContactInput): Promise<ContactRecord> => ipcRenderer.invoke('contacts:create', input),
    update: (id: string, input: UpdateContactInput): Promise<ContactRecord> => ipcRenderer.invoke('contacts:update', id, input),
    delete: (id: string): Promise<DeleteContactResult> => ipcRenderer.invoke('contacts:delete', id)
  },
  deadlines: {
    list: (filters?: DeadlineListFilters): Promise<DeadlineRecord[]> => ipcRenderer.invoke('deadlines:list', filters),
    dashboard: (): Promise<DeadlineDashboardItem[]> => ipcRenderer.invoke('deadlines:dashboard'),
    create: (input: CreateDeadlineInput): Promise<DeadlineRecord> => ipcRenderer.invoke('deadlines:create', input),
    update: (id: string, input: UpdateDeadlineInput): Promise<DeadlineRecord> => ipcRenderer.invoke('deadlines:update', id, input),
    complete: (id: string, note?: string): Promise<DeadlineRecord> => ipcRenderer.invoke('deadlines:complete', id, note),
    suspend: (id: string, reason: string): Promise<DeadlineRecord> => ipcRenderer.invoke('deadlines:suspend', id, reason),
    cancel: (id: string, reason: string): Promise<DeadlineRecord> => ipcRenderer.invoke('deadlines:cancel', id, reason)
  },
  reports: {
    descriptors: (): Promise<ReportDescriptor[]> => ipcRenderer.invoke('reports:descriptors'),
    history: (limit?: number): Promise<ReportExportHistoryItem[]> => ipcRenderer.invoke('reports:history', limit),
    generate: (input: GenerateReportInput): Promise<ReportGenerationResult> => ipcRenderer.invoke('reports:generate', input),
    openExportFolder: (filePath?: string): Promise<{ opened: boolean }> => ipcRenderer.invoke('reports:open-export-folder', filePath)
  },
  diagnostics: {
    bridgeReady: true,
    preloadLoadedAt: new Date().toISOString()
  }
};

try {
  contextBridge.exposeInMainWorld('gremiaSbv', api);
  contextBridge.exposeInMainWorld('gremiaSbvPreload', {
    ready: true,
    loadedAt: api.diagnostics.preloadLoadedAt
  });
} catch (error) {
  // This is intentionally logged only to the developer console / terminal.
  // The renderer shows a generic start failure without exposing internals.
  console.error('Gremia.SBV preload bridge could not be exposed', error);
}
