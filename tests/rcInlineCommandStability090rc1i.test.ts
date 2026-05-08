import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.9.0-rc.1-i/k inline command stability', () => {
  it('routes case note commands through the case-aware inline controller without a global duplicate dialog', () => {
    const modal = readFileSync('src/app/features/cases/CaseNoteModal.tsx', 'utf8');
    const render = readFileSync('src/app/features/cases/CasesViewRender.tsx', 'utf8');
    const hook = readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8');
    const textarea = readFileSync('src/app/shared/textCommands/TextCommandTextarea.tsx', 'utf8');

    expect(modal).toContain("onTextCommand={(command) => onProtocolTextCommand('content', command)}");
    expect(modal).toContain("onTextCommand={(command) => onProtocolTextCommand('nextSteps', command)}");
    expect(render).toContain('onProtocolTextCommand={inlineCommands.handleProtocolTextCommand}');
    expect(hook).toContain('function handleProtocolTextCommand');
    expect(textarea).toContain('if (globalCommandsEnabled && !onTextCommand)');
  });

  it('uses the current textarea value when building a case inline command prefill', () => {
    const hook = readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8');

    expect(hook).toContain('commandValue?: string');
    expect(hook).toContain('const value = commandValue ?? (target === "content" ? content : nextSteps);');
    expect(hook).toContain('openInlineCommand(target, command.token, command.index, command.value);');
  });

  it('keeps the global command controller trimmed for generic large text fields', () => {
    const controller = readFileSync('src/app/shared/textCommands/GlobalTextCommandController.tsx', 'utf8');

    expect(controller).toContain('query: commandText.trim()');
    expect(controller).toContain('title: commandText.trim()');
  });

  it('uses a real existing case command in the smoke e2e test and guards against duplicate task dialogs', () => {
    const policy = readFileSync('services/textCommandPolicy.ts', 'utf8');
    const spec = readFileSync('e2e/inline-commands.spec.ts', 'utf8');

    expect(policy).toContain("tokens: ['/praev', '/prävention', '/praevention']");
    expect(spec).toContain("fill('Gesprächsnotiz:\\n/praev Arbeitsplatzgefährdung klären')");
    expect(spec).toContain("getByRole('dialog', { name: 'Prävention anlegen' })");
    expect(spec).toContain("getByRole('dialog', { name: 'Aufgabe einfügen' })).toHaveCount(0)");
    expect(spec).not.toContain('/todo');
    expect(spec).not.toContain('pressSequentially');
  });
});
