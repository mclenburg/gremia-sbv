import { dialog, type IpcMain } from 'electron';
import path from 'node:path';
import type { SecurityService } from '../../services/securityService.js';
import type { ApplicationServices } from '../applicationServices.js';
import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import { assertRecordInput, assertString, sanitizeDialogFileName } from './ipcValidation.js';
import { issueSelectedFileCapability, resolveSelectedFileCapability, SELECTED_FILE_PURPOSE } from './selectedFileCapability.js';
import type { ConfigureElectionSetupInput, CreateElectionInput, GenerateElectionPreparationDocumentInput, SaveElectionBoardMemberInput, SaveElectionBoardSessionInput, SaveElectionCandidateInput, SaveElectionObjectionInput, SaveElectionProposalInput, SaveElectionVoterInput, ElectionVoterFileImportInput } from '../../src/domain/models/election-workflow.model.js';
import type { ElectionCloseInput, ElectionDayChecklistInput, GenerateElectionExecutionDocumentInput, RecordElectionAcceptanceInput, RecordElectionLotInput, RecordElectionTotalsInput, SaveElectionMailBallotInput, SaveElectionPhysicalRecordInput } from '../../src/domain/models/election-execution.model.js';
import type { ElectionTransferEnvelope } from '../../services/electionTransferCryptoAdapter.js';
const eid=(value:unknown,channel:string)=>assertString(value,channel,'Wahl-ID',{minLength:1,maxLength:120});
export function registerSbvElectionIpc(ipcMain:IpcMain,_security:SecurityService,services:ApplicationServices):void{
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsList,async()=>services.elections().list());
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsGet,async(_e,id)=>services.elections().get(eid(id,'elections:get')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsCreate,async(_e,input)=>services.elections().create(assertRecordInput<CreateElectionInput>(input,'elections:create')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsConfigureSetup,async(_e,id,input)=>services.elections().configureSetup(eid(id,'elections:configureSetup'),assertRecordInput<ConfigureElectionSetupInput>(input,'elections:configureSetup')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsOverview,async(_e,id)=>services.elections().overview(eid(id,'elections:overview')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsVoterSave,async(_e,id,input)=>services.elections().saveVoter(eid(id,'elections:voter:save'),assertRecordInput<SaveElectionVoterInput>(input,'elections:voter:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsVotersSyncPersons,async(_e,id)=>services.elections().syncVotersFromPersons(eid(id,'elections:voters:sync-persons')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsVotersSelectImportFile,async()=>{
  const result=await dialog.showOpenDialog({title:'Wahlberechtigte aus Excel/CSV übernehmen',properties:['openFile'],filters:[{name:'Personenliste',extensions:['xlsx','csv']}]});
  if(result.canceled||!result.filePaths[0])return{canceled:true};
  const filePath=result.filePaths[0];
  const capability=issueSelectedFileCapability(filePath,SELECTED_FILE_PURPOSE.electionVoterImport);
  const extension=path.extname(filePath).toLowerCase();
  return{canceled:false,fileToken:capability.fileToken,sourceFileName:capability.fileName,fileType:extension==='.xlsx'?'xlsx':'csv'} as const;
 });
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsVotersPreviewImport,async(_e,input)=>{
  const request=assertRecordInput<ElectionVoterFileImportInput>(input,'elections:voters:preview-import');
  const filePath=resolveSelectedFileCapability(assertString(request.fileToken,'elections:voters:preview-import','Dateiauswahl',{minLength:1,maxLength:200}),SELECTED_FILE_PURPOSE.electionVoterImport,'elections:voters:preview-import');
  return services.elections().previewVoterImport({...request,filePath});
 });
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsVotersImportFile,async(_e,id,input)=>{
  const request=assertRecordInput<ElectionVoterFileImportInput>(input,'elections:voters:import-file');
  const filePath=resolveSelectedFileCapability(assertString(request.fileToken,'elections:voters:import-file','Dateiauswahl',{minLength:1,maxLength:200}),SELECTED_FILE_PURPOSE.electionVoterImport,'elections:voters:import-file');
  return services.elections().importVotersFromPersonFile(eid(id,'elections:voters:import-file'),{...request,filePath});
 });
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsBoardMemberSave,async(_e,id,input)=>services.elections().saveBoardMember(eid(id,'elections:boardMember:save'),assertRecordInput<SaveElectionBoardMemberInput>(input,'elections:boardMember:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsBoardSessionSave,async(_e,id,input)=>services.elections().saveBoardSession(eid(id,'elections:boardSession:save'),assertRecordInput<SaveElectionBoardSessionInput>(input,'elections:boardSession:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsObjectionSave,async(_e,id,input)=>services.elections().saveObjection(eid(id,'elections:objection:save'),assertRecordInput<SaveElectionObjectionInput>(input,'elections:objection:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsCandidateSave,async(_e,id,input)=>services.elections().saveCandidate(eid(id,'elections:candidate:save'),assertRecordInput<SaveElectionCandidateInput>(input,'elections:candidate:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsProposalSave,async(_e,id,input)=>services.elections().saveProposal(eid(id,'elections:proposal:save'),assertRecordInput<SaveElectionProposalInput>(input,'elections:proposal:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsGracePeriodStart,async(_e,id,date)=>services.elections().startGracePeriod(eid(id,'elections:gracePeriod:start'),assertString(date,'elections:gracePeriod:start','Datum',{minLength:10,maxLength:40})));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsNoticeIssued,async(_e,id,date)=>{services.elections().recordElectionNoticeIssued(eid(id,'elections:notice:issued'),assertString(date,'elections:notice:issued','Erlassdatum',{minLength:10,maxLength:40}));return{recorded:true};});
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsMarkPreparation,async(_e,id)=>services.elections().markPreparation(eid(id,'elections:markPreparation')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsJournalPrefill,async(_e,id,activity)=>services.elections().journalPrefill(eid(id,'elections:journalPrefill'),assertString(activity,'elections:journalPrefill','Tätigkeit',{minLength:1,maxLength:40}) as 'preparation'|'board_work'|'voter_list'|'nominations'|'voting'|'counting'|'result'|'archive'));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsGenerateDocument,async(_e,id,input)=>services.electionDocuments().generate(eid(id,'elections:document:generate'),assertRecordInput<GenerateElectionPreparationDocumentInput>(input,'elections:document:generate')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsExecutionOverview,async(_e,id)=>services.electionExecution().overview(eid(id,'elections:execution:overview')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsDayChecklistRecord,async(_e,id,input)=>services.electionExecution().recordElectionDayChecklist(eid(id,'elections:dayChecklist:record'),assertRecordInput<ElectionDayChecklistInput>(input,'elections:dayChecklist:record')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsMailBallotSave,async(_e,id,input)=>services.electionExecution().saveMailBallot(eid(id,'elections:mailBallot:save'),assertRecordInput<SaveElectionMailBallotInput>(input,'elections:mailBallot:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsTotalsRecord,async(_e,id,input)=>services.electionExecution().recordTotals(eid(id,'elections:totals:record'),assertRecordInput<RecordElectionTotalsInput>(input,'elections:totals:record')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsLotRecord,async(_e,id,input)=>services.electionExecution().recordLotDecision(eid(id,'elections:lot:record'),assertRecordInput<RecordElectionLotInput>(input,'elections:lot:record')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsAcceptanceRecord,async(_e,id,input)=>services.electionExecution().recordAcceptance(eid(id,'elections:acceptance:record'),assertRecordInput<RecordElectionAcceptanceInput>(input,'elections:acceptance:record')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsPhysicalRecordSave,async(_e,id,input)=>services.electionExecution().savePhysicalRecord(eid(id,'elections:physicalRecord:save'),assertRecordInput<SaveElectionPhysicalRecordInput>(input,'elections:physicalRecord:save')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsClose,async(_e,id,input)=>{services.electionExecution().close(eid(id,'elections:close'),assertRecordInput<ElectionCloseInput>(input,'elections:close'));return{closed:true};});
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsExecutionDocumentGenerate,async(_e,id,input)=>services.electionArchive().generate(eid(id,'elections:executionDocument:generate'),assertRecordInput<GenerateElectionExecutionDocumentInput>(input,'elections:executionDocument:generate')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsArchivePdf,async(_e,id)=>services.electionArchive().exportPdfArchive(eid(id,'elections:archive:pdf')));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsDocumentExport,async(_e,documentId,suggestedFileName)=>{
  const validatedDocumentId=assertString(documentId,'elections:document:export','Dokument-ID',{minLength:1,maxLength:120});
  const safeName=sanitizeDialogFileName(suggestedFileName,'elections:document:export','Dateiname')??'wahlunterlage.pdf';
  const result=await dialog.showSaveDialog({title:'Wahlunterlage als PDF speichern',defaultPath:safeName.toLowerCase().endsWith('.pdf')?safeName:`${safeName}.pdf`,buttonLabel:'PDF speichern',filters:[{name:'PDF-Dokument',extensions:['pdf']}]});
  if(result.canceled||!result.filePath)return{exported:false,fileName:'',sizeBytes:0};
  const saved=await services.electionArchive().exportDocumentToFile(validatedDocumentId,result.filePath);
  return{...saved,fileName:path.basename(result.filePath)};
 });
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsTransferExport,async(_e,id,passphrase)=>services.electionTransfer().export(eid(id,'elections:transfer:export'),_security.getVaultTransferSourceId(),assertString(passphrase,'elections:transfer:export','Passphrase',{minLength:10,maxLength:500})));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsTransferInspect,async(_e,envelope,passphrase)=>services.electionTransfer().inspect(assertRecordInput<ElectionTransferEnvelope>(envelope,'elections:transfer:inspect'),assertString(passphrase,'elections:transfer:inspect','Passphrase',{minLength:10,maxLength:500})));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsTransferImport,async(_e,envelope,passphrase)=>services.electionTransfer().import(assertRecordInput<ElectionTransferEnvelope>(envelope,'elections:transfer:import'),assertString(passphrase,'elections:transfer:import','Passphrase',{minLength:10,maxLength:500})));
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsTransferExportFile,async(_e,id,passphrase,suggestedFileName)=>{
  const electionId=eid(id,'elections:transfer:exportFile');
  const validatedPassphrase=assertString(passphrase,'elections:transfer:exportFile','Passphrase',{minLength:10,maxLength:500});
  const safeName=sanitizeDialogFileName(suggestedFileName,'elections:transfer:exportFile','Dateiname')??`wahlakte-${electionId.slice(0,8)}.gsbvelection`;
  const result=await dialog.showSaveDialog({title:'Geschützte Gremia.SBV-Wahlakte speichern',defaultPath:safeName.toLowerCase().endsWith('.gsbvelection')?safeName:`${safeName}.gsbvelection`,buttonLabel:'Wahlakte speichern',filters:[{name:'Gremia.SBV Wahlakte',extensions:['gsbvelection']}]});
  if(result.canceled||!result.filePath)return{exported:false,fileName:'',packageId:'',electionId,createdAt:'',formatVersion:0,legalRuleVersion:'',itemCount:0,manifestHash:''};
  const inspection=await services.electionTransfer().exportToFile(electionId,_security.getVaultTransferSourceId(),validatedPassphrase,result.filePath);
  return{...inspection,exported:true,fileName:path.basename(result.filePath)};
 });
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsTransferSelectInspect,async(_e,passphrase)=>{
  const validatedPassphrase=assertString(passphrase,'elections:transfer:selectInspect','Passphrase',{minLength:10,maxLength:500});
  const result=await dialog.showOpenDialog({title:'Geschützte Gremia.SBV-Wahlakte öffnen',properties:['openFile'],filters:[{name:'Gremia.SBV Wahlakte',extensions:['gsbvelection']}]});
  if(result.canceled||!result.filePaths[0])return{canceled:true};
  const filePath=result.filePaths[0];
  const capability=issueSelectedFileCapability(filePath,SELECTED_FILE_PURPOSE.electionTransfer);
  return{canceled:false,fileToken:capability.fileToken,fileName:capability.fileName,inspection:await services.electionTransfer().inspectFile(filePath,validatedPassphrase)};
 });
 registerIpcHandler(ipcMain,IPC_CHANNELS.electionsTransferImportFile,async(_e,fileToken,passphrase)=>{
  const validatedToken=assertString(fileToken,'elections:transfer:importFile','Dateiauswahl',{minLength:1,maxLength:200});
  const filePath=resolveSelectedFileCapability(validatedToken,SELECTED_FILE_PURPOSE.electionTransfer,'elections:transfer:importFile');
  return services.electionTransfer().importFromFile(filePath,assertString(passphrase,'elections:transfer:importFile','Passphrase',{minLength:10,maxLength:500}));
 });
}
