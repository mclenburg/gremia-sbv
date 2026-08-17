import { describe, expect, it } from 'vitest';
import { createAccessibleTextPdf } from '../../../services/documents/pdfDocumentRenderer';
import { validateElectionNoticeDetails } from '../../../services/sbvElectionDocumentService';
import type { ElectionNoticeDetails } from '../../../src/domain/models/election-workflow.model';
import { inspectPdf } from '../../helpers/pdf';
const complete:ElectionNoticeDetails={issueDate:'2026-08-18',votingStartsAt:'2026-09-20 08:00',votingEndsAt:'2026-09-20 16:00',votingPlace:'Raum A',countingPlaceAndTime:'Raum A, 16:05',voterListInspectionPlace:'SBV-Büro',voterListInspectionTimes:'Mo-Fr 9-12',objectionDeadline:'2026-09-01',proposalDeadline:'2026-09-01',proposalSubmissionPlace:'Wahlvorstand',representativeElectionStatement:'Vertrauensperson wird gewählt',deputyElectionStatement:'Eine Stellvertretung wird gewählt',requiredSupportSignatures:'3',mailBallotStatement:'Schriftliche Stimmabgabe auf Verlangen',boardChairName:'A. Vorsitz',secondBoardMemberName:'B. Mitglied'};
describe('0.9.7-C preparation PDFs',()=>{
 it('preserves German characters in selectable PDF text',async()=>{const pdf=await createAccessibleTextPdf('Wählerliste',['Müller, Groß']);const inspected=await inspectPdf(pdf);expect(inspected.textByPage.join(' ')).toContain('Müller, Groß');});
 it('preserves every international name character in legally relevant election records',async()=>{
  const names='Zoë İpek Łukasz Жуков أمينة';
  const pdf=await createAccessibleTextPdf('Wählerliste',[names]);
 const inspected=await inspectPdf(pdf);
 expect(inspected.textByPage.join(' ')).toContain(names);
 });
 it('rejects unsupported characters instead of silently falsifying an election record',async()=>{
  await expect(createAccessibleTextPdf('Wählerliste',['Nicht darstellbar: 𠀀']))
    .rejects.toThrow(/U\+20000/);
 });
 it('accepts the complete sixteen-field election notice and rejects any missing mandatory item',()=>{expect(Object.keys(validateElectionNoticeDetails(complete))).toHaveLength(16);expect(()=>validateElectionNoticeDetails({...complete,votingPlace:''})).toThrow(/Wahlort/);});
});
