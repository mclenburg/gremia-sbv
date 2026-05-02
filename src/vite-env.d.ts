/// <reference types="vite/client" />

import type { CaseDocumentRecord } from './app/core/models/case-document.model';
import type { CaseRecord, CreateCaseInput } from './app/core/models/case.model';
import type { ContactListFilters, ContactRecord, CreateContactInput, DeleteContactResult, UpdateContactInput } from './app/core/models/contact.model';
import type { CaseContentSearchInput, CaseNoteRecord, CaseSearchResult, CreateCaseNoteInput, UpdateCaseNoteInput } from './app/core/models/case-note.model';
import type { CreateDeadlineInput, DeadlineDashboardItem, DeadlineListFilters, DeadlineRecord, UpdateDeadlineInput } from './app/core/models/deadline.model';
import type { SecurityResult, SecurityStatus } from './app/core/models/security.model';
import type { GenerateReportInput, ReportDescriptor, ReportExportHistoryItem, ReportGenerationResult } from './app/core/models/report.model';

declare global {
  interface Window {
    gremiaSbv: {
      security: {
        status(): Promise<SecurityStatus>;
        setupInitialPassword(password: string): Promise<SecurityResult>;
        unlock(password: string): Promise<SecurityResult>;
        changePassword(currentPassword: string, newPassword: string): Promise<SecurityResult>;
        resetPasswordWithRecoveryKey(recoveryKey: string, newPassword: string): Promise<SecurityResult>;
        destroyLocalVault(confirmation: string): Promise<SecurityResult>;
        lock(): Promise<{ locked: boolean }>;
      };
      diagnostics?: {
        bridgeReady: boolean;
        preloadLoadedAt: string;
      };
      cases: {
        list(): Promise<CaseRecord[]>;
        create(input: CreateCaseInput): Promise<CaseRecord>;
        listNotes(caseId: string): Promise<CaseNoteRecord[]>;
        createNote(input: CreateCaseNoteInput): Promise<CaseNoteRecord>;
        updateNote(id: string, input: UpdateCaseNoteInput): Promise<CaseNoteRecord>;
        deleteNote(id: string): Promise<{ deleted: boolean }>;
        listDocuments(caseId: string): Promise<CaseDocumentRecord[]>;
        selectAndImportDocuments(caseId: string, containsHealthData?: boolean): Promise<CaseDocumentRecord[]>;
        deleteDocument(id: string): Promise<{ deleted: boolean }>;
        openDocument(id: string): Promise<{ opened: boolean; filePath: string }>;
        exportDocument(id: string, suggestedFileName?: string): Promise<{ exported: boolean; filePath: string }>;
        search(input: CaseContentSearchInput): Promise<CaseSearchResult[]>;
      };
      contacts: {
        list(filters?: ContactListFilters): Promise<ContactRecord[]>;
        create(input: CreateContactInput): Promise<ContactRecord>;
        update(id: string, input: UpdateContactInput): Promise<ContactRecord>;
        delete(id: string): Promise<DeleteContactResult>;
      };
      deadlines: {
        list(filters?: DeadlineListFilters): Promise<DeadlineRecord[]>;
        dashboard(): Promise<DeadlineDashboardItem[]>;
        create(input: CreateDeadlineInput): Promise<DeadlineRecord>;
        update(id: string, input: UpdateDeadlineInput): Promise<DeadlineRecord>;
        complete(id: string, note?: string): Promise<DeadlineRecord>;
        suspend(id: string, reason: string): Promise<DeadlineRecord>;
        cancel(id: string, reason: string): Promise<DeadlineRecord>;
      };
      reports: {
        descriptors(): Promise<ReportDescriptor[]>;
        history(limit?: number): Promise<ReportExportHistoryItem[]>;
        generate(input: GenerateReportInput): Promise<ReportGenerationResult>;
        openExportFolder(filePath?: string): Promise<{ opened: boolean }>;
      };
    };
    gremiaSbvPreload?: {
      ready: boolean;
      loadedAt: string;
    };
  }
}
