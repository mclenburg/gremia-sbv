import { describe, expect, it } from 'vitest';
import { createSimpleTextPdf } from '../../../services/documents/simpleTextPdf';
import { validateElectionNoticeDetails } from '../../../services/sbvElectionDocumentService';
import type { ElectionNoticeDetails } from '../../../src/app/core/models/election-workflow.model';
const complete:ElectionNoticeDetails={issueDate:'2026-08-18',votingStartsAt:'2026-09-20 08:00',votingEndsAt:'2026-09-20 16:00',votingPlace:'Raum A',countingPlaceAndTime:'Raum A, 16:05',voterListInspectionPlace:'SBV-Büro',voterListInspectionTimes:'Mo-Fr 9-12',objectionDeadline:'2026-09-01',proposalDeadline:'2026-09-01',proposalSubmissionPlace:'Wahlvorstand',representativeElectionStatement:'Vertrauensperson wird gewählt',deputyElectionStatement:'Eine Stellvertretung wird gewählt',requiredSupportSignatures:'3',mailBallotStatement:'Schriftliche Stimmabgabe auf Verlangen',boardChairName:'A. Vorsitz',secondBoardMemberName:'B. Mitglied'};
describe('0.9.7-C preparation PDFs',()=>{
 it('creates a standalone PDF payload with readable text and German-character fallback',()=>{const pdf=createSimpleTextPdf('Wählerliste',['Müller, Groß']);expect(pdf.subarray(0,8).toString()).toBe('%PDF-1.4');expect(pdf.toString('ascii')).toContain('Mueller, Gross');expect(pdf.toString('ascii')).toContain('%%EOF');});
 it('accepts the complete sixteen-field election notice and rejects any missing mandatory item',()=>{expect(Object.keys(validateElectionNoticeDetails(complete))).toHaveLength(16);expect(()=>validateElectionNoticeDetails({...complete,votingPlace:''})).toThrow(/Wahlort/);});
});
