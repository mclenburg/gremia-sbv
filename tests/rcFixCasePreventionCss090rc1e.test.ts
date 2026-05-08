import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';
import { defaultEmployerResponseDueAt, preventionReviewDueAtAfterEmployerDeadline } from '../services/preventionWorkflowPolicy';

const globals = readNormalizedSourceText('src/styles/globals.css');
const responsive = readNormalizedSourceText('src/app/ui/responsiveDesign.css');
const preventionDetail = readNormalizedSourceText('src/app/features/prevention/PreventionProcessDetail.tsx');
const textCommandTextarea = readNormalizedSourceText('src/app/shared/textCommands/TextCommandTextarea.tsx');

describe('0.9.0-rc.1-e case, prevention, css and text-command fixes', () => {
  it('creates the automatic prevention review one day after the employer response deadline', () => {
    const employerDueAt = defaultEmployerResponseDueAt('2026-05-02T09:00:00.000Z');
    expect(employerDueAt).toBe('2026-05-09T09:00:00.000Z');
    expect(preventionReviewDueAtAfterEmployerDeadline(employerDueAt)).toBe('2026-05-10T09:00:00.000Z');
  });

  it('keeps only one base case-workbench definition in globals css', () => {
    const baseDefinitions = globals.match(/\.case-workbench \{ display: grid;/g) ?? [];
    expect(baseDefinitions).toHaveLength(1);
    expect(globals).not.toContain('minmax(280px, 360px) minmax(0, 1fr)');
  });

  it('makes the case create form and register toolbar responsive before tablet width', () => {
    expect(globals).toContain('repeat(auto-fit, minmax(min(16rem, 100%), 1fr))');
    expect(globals).toContain('@media (max-width: 1050px) and (min-width: 761px)');
    expect(globals).toContain('.case-register-toolbar { display: flex; flex-wrap: wrap;');
  });

  it('removes contradictory sidebar positioning and adds mobile overflow affordance', () => {
    expect(globals).toContain(`.industrial-sidebar {
  position: sticky;`);
    expect(responsive).toContain('mask-image: linear-gradient(90deg');
  });

  it('persists long prevention text fields on blur while keeping global text commands active', () => {
    expect(preventionDetail).toContain("defaultValue={process.measures ?? ''}");
    expect(preventionDetail).toContain('onBlur={(event) => void onUpdate(process.id, { measures: event.currentTarget.value })}');
    expect(preventionDetail).not.toContain('Textfelder speichern');
    expect(preventionDetail).not.toContain('globalCommandsEnabled={false}');
    expect(textCommandTextarea).toContain('findFirstTextCommand(event.target.value)');
    expect(textCommandTextarea).not.toContain('findTextCommandNearCursor');
    expect(textCommandTextarea).not.toContain('COMMAND_SCAN_BEFORE_CURSOR');
  });

  it('keeps global text commands enabled in the large case-note text fields', () => {
    const caseNoteModal = readNormalizedSourceText('src/app/features/cases/CaseNoteModal.tsx');
    expect(caseNoteModal).not.toContain('globalCommandsEnabled={false}');
    expect(caseNoteModal).toContain('fieldId="case-note-content"');
    expect(caseNoteModal).toContain('fieldId="case-note-next-steps"');
  });

});
