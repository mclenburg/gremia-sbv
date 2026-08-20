import { dialog, shell, type IpcMain } from 'electron';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertAllowedEnum, assertRecordInput, assertString } from './ipcValidation.js';
import type { CreateSbvMeetingInput, SaveComplaintWorkflowInput, SaveEmployerObligationReviewInput, SaveInclusionAgreementInput, SaveInclusionAgreementTopicInput, SaveInclusionOfficerSnapshotInput, SaveSbvAssemblyInput, UpdateSbvMeetingInput, UpsertSbvMeetingAgendaInput } from '../../src/domain/models/sbv-office-workflow.model.js';
import type { AssemblyDocumentKind, SbvOfficeDocumentGenerationResult } from '../../services/sbvOfficeDocumentService.js';
import { ApplicationError } from '../../src/domain/models/application-error.model.js';
import { requestExternalPreview, type ExternalPreviewOpener } from './externalPreviewRequest.js';

const externalPreviewOpener: ExternalPreviewOpener = process.env.GREMIA_SBV_E2E === '1'
  ? async () => ''
  : (previewPath) => shell.openPath(previewPath);

async function documentStage<T>(
  operation: string,
  stage: string,
  code: 'EXPORT_FAILED' | 'DATABASE_INTEGRITY_FAILED' | 'FILE_OPERATION_FAILED',
  safeMessage: string,
  action: () => T | Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    const systemCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined;
    console.error('Gremia.SBV document error', JSON.stringify({
      operation,
      stage,
      code,
      errorName: error instanceof Error ? error.name : typeof error,
      ...(systemCode ? { systemCode } : {}),
    }));
    throw new ApplicationError(code, safeMessage, operation, { cause: error });
  }
}

async function generateAndOpenAssemblyDocument(
  security: SecurityService,
  services: ApplicationServices,
  rawAssemblyId: unknown,
  rawKind: unknown,
): Promise<SbvOfficeDocumentGenerationResult> {
  const assemblyId = assertString(rawAssemblyId, 'sbvOffice:assemblies:generateDocument', 'Versammlungs-ID', { minLength: 1, maxLength: 120 });
  const kind = assertAllowedEnum(rawKind, 'sbvOffice:assemblies:generateDocument', 'Dokumenttyp', [
    'invitation', 'agenda', 'activity_report_draft', 'result_minutes',
  ] as const) as AssemblyDocumentKind;
  const documents = services.sbvOfficeDocuments();
  const operation = 'sbvOffice:assemblies:generateDocument';
  const record = await documentStage(
    operation,
    'generate-and-store',
    'EXPORT_FAILED',
    'Das PDF-Dokument konnte nicht erzeugt oder verschlüsselt gespeichert werden.',
    () => documents.generateAssemblyDocument(assemblyId, kind),
  );
  let plain: Buffer | undefined;
  try {
    plain = await documentStage(
      operation,
      'decrypt-and-verify',
      'DATABASE_INTEGRITY_FAILED',
      'Das PDF wurde gespeichert, konnte für die Vorschau aber nicht entschlüsselt und geprüft werden.',
      () => documents.readDocument(record.id),
    );
    await documentStage(
      operation,
      'cleanup-temporary-files',
      'FILE_OPERATION_FAILED',
      'Das PDF wurde gespeichert, vorhandene temporäre Vorschauen konnten aber nicht sicher bereinigt werden.',
      () => security.cleanupTemporaryFiles(),
    );
    const previewPath = await documentStage(
      operation,
      'write-preview',
      'FILE_OPERATION_FAILED',
      'Das PDF wurde gespeichert, die temporäre Vorschau konnte aber nicht geschrieben werden.',
      () => security.writeTemporaryFile('document-preview', record.filename, plain!, 'preview'),
    );
    if (requestExternalPreview(previewPath, externalPreviewOpener)) {
      return { document: record, previewStatus: 'requested' };
    }
    return {
      document: record,
      previewStatus: 'unavailable',
      previewMessage: 'Das PDF wurde verschlüsselt gespeichert, die externe Vorschau-Anwendung konnte aber nicht aufgerufen werden.',
    };
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    return {
      document: record,
      previewStatus: 'unavailable',
      previewMessage: error.message,
    };
  } finally {
    plain?.fill(0);
  }
}

export function registerSbvOfficeWorkflowIpc(ipcMain:IpcMain,security:SecurityService,services:ApplicationServices):void{
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeMeetingsList,async()=>services.sbvMeetings().list());
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeMeetingsCreate,async(_e,i)=>services.sbvMeetings().create(assertRecordInput<CreateSbvMeetingInput>(i,'sbvOffice:meetings:create')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeMeetingsJournalPrefill,async(_e,id,activity)=>services.sbvMeetings().journalPrefill(assertString(id,'sbvOffice:meetings:journalPrefill','Sitzungs-ID',{minLength:1,maxLength:120}),assertString(activity,'sbvOffice:meetings:journalPrefill','Tätigkeit',{minLength:1,maxLength:40}) as 'attendance'|'preparation'|'top_request'|'suspension'));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeMeetingsUpdate,async(_e,id,i)=>services.sbvMeetings().update(assertString(id,'sbvOffice:meetings:update','Sitzungs-ID',{minLength:1,maxLength:120}),assertRecordInput<UpdateSbvMeetingInput>(i,'sbvOffice:meetings:update')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeMeetingsAgendaSave,async(_e,id,i)=>services.sbvMeetings().upsertAgenda(assertString(id,'sbvOffice:meetings:agenda:save','Sitzungs-ID',{minLength:1,maxLength:120}),assertRecordInput<UpsertSbvMeetingAgendaInput>(i,'sbvOffice:meetings:agenda:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeMeetingsAgendaFollowUp,async(_e,id,dueAt,title)=>services.sbvMeetings().createAgendaFollowUp(assertString(id,'sbvOffice:meetings:agenda:followUp','TOP-ID',{minLength:1,maxLength:120}),assertString(dueAt,'sbvOffice:meetings:agenda:followUp','Wiedervorlage',{minLength:10,maxLength:60}),typeof title==='string'?title:undefined));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAssembliesList,async()=>services.sbvAssemblies().list()); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAssembliesAnnualWarning,async(_e,year)=>services.sbvAssemblies().annualWarning(Number(year))); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAssembliesCreateFollowUp,async(_e,id,dueAt,title)=>services.sbvAssemblies().createFollowUp(assertString(id,'sbvOffice:assemblies:createFollowUp','Versammlungs-ID',{minLength:1,maxLength:120}),assertString(dueAt,'sbvOffice:assemblies:createFollowUp','Wiedervorlage',{minLength:10,maxLength:60}),typeof title==='string'?title:undefined)); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAssembliesGenerateDocument,async(_e,id,kind)=>generateAndOpenAssemblyDocument(security,services,id,kind)); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAssembliesSave,async(_e,i)=>services.sbvAssemblies().save(assertRecordInput<SaveSbvAssemblyInput>(i,'sbvOffice:assemblies:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeObligationsList,async()=>services.employerObligations().list()); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeObligationsEnsureAnnual,async(_e,y)=>services.employerObligations().ensureAnnual(Number(y))); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeObligationsSave,async(_e,i)=>services.employerObligations().save(assertRecordInput<SaveEmployerObligationReviewInput>(i,'sbvOffice:obligations:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeOfficersList,async()=>services.employerObligations().listInclusionOfficers()); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeOfficersSave,async(_e,i)=>services.employerObligations().saveInclusionOfficer(assertRecordInput<SaveInclusionOfficerSnapshotInput>(i,'sbvOffice:officers:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAgreementsList,async()=>services.inclusionAgreements().list()); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAgreementsRequestDraft,async(_e,dueAt)=>services.inclusionAgreements().negotiationRequestDraft(typeof dueAt==='string'?dueAt:undefined)); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAgreementsResponseDeadline,async(_e,id,dueAt)=>services.inclusionAgreements().createNegotiationResponseDeadline(assertString(id,'sbvOffice:agreements:responseDeadline','Vereinbarungs-ID',{minLength:1,maxLength:120}),assertString(dueAt,'sbvOffice:agreements:responseDeadline','Antwortfrist',{minLength:10,maxLength:60})));  registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAgreementsSave,async(_e,i)=>services.inclusionAgreements().save(assertRecordInput<SaveInclusionAgreementInput>(i,'sbvOffice:agreements:save'))); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeAgreementsTopicSave,async(_e,id,i)=>services.inclusionAgreements().saveTopic(assertString(id,'sbvOffice:agreements:topic:save','Vereinbarungs-ID',{minLength:1,maxLength:120}),assertRecordInput<SaveInclusionAgreementTopicInput>(i,'sbvOffice:agreements:topic:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeDocumentsSelectAndAttach,async(_e,raw)=>{const input=assertRecordInput<{ownerType:string;ownerId:string;purpose:string}>(raw,'sbvOffice:documents:selectAndAttach');const ownerType=assertString(input.ownerType,'sbvOffice:documents:selectAndAttach','Owner-Typ',{minLength:1,maxLength:80}) as 'meeting'|'assembly'|'inclusion_agreement'|'employer_obligation_review';const ownerId=assertString(input.ownerId,'sbvOffice:documents:selectAndAttach','Owner-ID',{minLength:1,maxLength:120});const purpose=assertString(input.purpose,'sbvOffice:documents:selectAndAttach','Zweck',{minLength:1,maxLength:200});const selected=await dialog.showOpenDialog({properties:['openFile','multiSelections']});if(selected.canceled)return [];return services.sbvOfficeDocuments().attachExternalDocuments({type:ownerType,id:ownerId},selected.filePaths,purpose);});
 registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeComplaintsList,async()=>services.complaints().list()); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeComplaintsSave,async(_e,i)=>services.complaints().save(assertRecordInput<SaveComplaintWorkflowInput>(i,'sbvOffice:complaints:save'))); registerIpcHandler(ipcMain,IPC_CHANNELS.sbvOfficeComplaintsTemplates,async()=>services.complaints().quickCaseTemplates());
}
