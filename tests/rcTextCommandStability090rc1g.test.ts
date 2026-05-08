import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.9.0-rc.1-g/k text command and prevention editor stability', () => {
  it('keeps the inline command scan on the original findFirstTextCommand implementation', () => {
    const textarea = readFileSync('src/app/shared/textCommands/TextCommandTextarea.tsx', 'utf8');

    expect(textarea).toContain('findFirstTextCommand(event.target.value)');
    expect(textarea).not.toContain('findTextCommandNearCursor');
    expect(textarea).not.toContain('wasCommandTokenJustEdited');
    expect(textarea).toContain('data-text-command-enabled="true"');
  });

  it('keeps case-aware textareas from also opening the global command dialog', () => {
    const textarea = readFileSync('src/app/shared/textCommands/TextCommandTextarea.tsx', 'utf8');

    expect(textarea).toContain('onTextCommand?.(payload)');
    expect(textarea).toContain('globalCommandsEnabled && !onTextCommand');
    expect(textarea).not.toContain('globalCommandsEnabled={false}');
  });

  it('persists prevention measure text fields on blur instead of on every key stroke', () => {
    const preventionDetail = readFileSync('src/app/features/prevention/PreventionProcessDetail.tsx', 'utf8');

    expect(preventionDetail).toContain('defaultValue={process.measures ?? \'\'}');
    expect(preventionDetail).toContain('onBlur={(event) => void onUpdate(process.id, { measures: event.currentTarget.value })}');
    expect(preventionDetail).not.toContain('useState');
    expect(preventionDetail).not.toContain('Textfelder speichern');
  });

  it('uses a capture-phase help shortcut handler and waits for the app shell in the viewport e2e test', () => {
    const modal = readFileSync('src/app/shared/textCommands/TextCommandHelpModal.tsx', 'utf8');
    const responsiveSpec = readFileSync('e2e/responsive-layout.spec.ts', 'utf8');

    expect(modal).toContain('useLayoutEffect');
    expect(modal).toContain("document.addEventListener('keydown', handleKeyDown, { capture: true })");
    expect(responsiveSpec).toContain("await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();");
  });
});
