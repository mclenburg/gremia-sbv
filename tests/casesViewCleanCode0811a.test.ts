import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const trackedFiles = [
  'src/app/features/cases/CasesView.tsx',
  'src/app/features/cases/CasesViewRender.tsx',
  'src/app/features/cases/casesViewProcessUtils.ts',
  'src/app/features/cases/useCaseProcessUpdates.ts',
  'src/app/features/cases/useProcessTemplateActions.ts',
  'src/app/features/cases/useCaseProcessCreation.ts',
  'src/app/features/cases/useCaseCrudActions.ts',
  'src/app/features/cases/SettingsView.tsx',
  'src/app/features/cases/ThemeSettingsForm.tsx',
  'src/app/features/cases/TemplateDefaultSettingsForm.tsx',
  'src/app/features/cases/TemporaryFilesSettingsPanel.tsx',
  'src/app/features/cases/ChangePasswordForm.tsx',
  'src/app/features/cases/BackupRestoreForm.tsx',
  'src/app/features/cases/RetentionSettingsPanel.tsx',
  'src/app/features/cases/ContextualTemplateButton.tsx',
];

describe('CasesView clean-code repair', () => {
  it('keeps the extracted case modules below the 500 line review limit', () => {
    const oversized = trackedFiles
      .map((file) => ({ file, lines: readFileSync(file, 'utf8').split('\n').length }))
      .filter((entry) => entry.lines > 500);

    expect(oversized).toEqual([]);
  });

  it('keeps workflowViews as a pure index while moving case implementation into feature modules', () => {
    const workflow = readFileSync('src/app/workflowViews.tsx', 'utf8');
    const casesView = readFileSync('src/app/features/cases/CasesView.tsx', 'utf8');

    expect(workflow).not.toContain('useState(');
    expect(workflow).not.toContain('return <');
    expect(casesView).toContain('useCaseProcessUpdates');
    expect(casesView).toContain('CasesViewRender');
  });
});
